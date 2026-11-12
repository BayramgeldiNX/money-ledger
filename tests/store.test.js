import { describe, it, expect, beforeEach } from "vitest";
import { openStore } from "../src/store.js";
import { createStorage } from "../src/lib/storage.js";
import { normalizeConfig } from "../src/lib/config.js";
import { OUTBOX_KEY } from "../src/lib/outbox.js";

// A fake Firestore: records writes, lets a test push snapshots, and can hold a write open.
function fakeDb() {
  const writes = [], snaps = {}, gates = [];
  let hold = false, fail = null;
  const snapFor = (name) => (snaps[name] = snaps[name] || {});
  const send = async (op, path, data) => {
    if (hold) await new Promise((res) => gates.push(res));
    if (fail) throw fail;
    writes.push({ op, path, data });
  };
  return {
    writes,
    hold(v) { hold = v; if (!v) gates.splice(0).forEach((g) => g()); },
    failWith(e) { fail = e; },
    emitRows(coll, rows) { snapFor(coll).cb({ docs: rows.map(({ id, ...d }) => ({ id, data: () => d })), fromCache: false }); },
    emitConfig(data, fromCache = false) { snapFor("config/main").cb({ exists: !!data, data: () => data, fromCache }); },
    collection: (name) => ({ onSnapshot(cb, err) { snapFor(name).cb = cb; snapFor(name).err = err; } }),
    doc: (path) => ({
      onSnapshot(cb, err) { snapFor(path).cb = cb; snapFor(path).err = err; },
      set: (d) => send("set", path, d),
      delete: () => send("delete", path),
      get: async () => ({ exists: false })
    })
  };
}

function fakeEnv() {
  const e = { isOnline: true, handlers: {} };
  e.online = () => e.isOnline;
  e.onOnline = (fn) => (e.handlers.online = fn);
  e.onOffline = (fn) => (e.handlers.offline = fn);
  e.onVisible = (fn) => (e.handlers.visible = fn);
  return e;
}

function setup({ db, initial = {} } = {}) {
  const backing = new Map(Object.entries(initial));
  const storage = createStorage({ getItem: (k) => (backing.has(k) ? backing.get(k) : null), setItem: (k, v) => backing.set(k, v) });
  const state = { expenses: [], transfers: [], debts: [], config: normalizeConfig(null), loaded: false, configLoaded: false, debtsLoaded: false };
  const calls = [];
  const hooks = {
    render: (c) => calls.push(["render", c]), renderBanners: () => {}, renderBackground: (c) => calls.push(["bg", c]),
    showError: (m) => calls.push(["error", m]), fixRates: () => calls.push(["fix"]), runBills: () => calls.push(["bills"])
  };
  const env = fakeEnv();
  const opened = openStore({ db, state, hooks, storage, env, now: () => 1000 });
  return { ...opened, state, storage, backing, calls, env };
}
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

describe("store: db adapter + outbox", () => {
  let db;
  beforeEach(() => { db = fakeDb(); });

  it("shows a new entry at once as pending, then sends it and clears the outbox", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    db.hold(true);
    const id = await s.store.add({ date: "2026-01-02", amount: 5, currency: "RMB", rmb: 5, usd: 0.75, cat: "dining", kind: "need" });
    expect(s.state.expenses).toHaveLength(1);
    expect(s.state.expenses[0]._pending).toBe(true);
    expect(s.sync.count()).toBe(1);
    expect(JSON.parse(s.backing.get(OUTBOX_KEY))).toHaveLength(1); // survives closing the app
    db.hold(false); await flushPromises();
    expect(db.writes).toEqual([{ op: "set", path: "expenses/" + id, data: expect.objectContaining({ amount: 5 }) }]);
    expect(s.sync.count()).toBe(0);
    expect(s.sync.state()).toBe("");
  });

  it("waits offline, keeps the change on the device, and sends it when back online", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    s.env.isOnline = false;
    await s.store.add({ amount: 1 });
    await flushPromises();
    expect(db.writes).toHaveLength(0);
    expect(s.sync.state()).toBe("offline");
    expect(s.sync.count()).toBe(1);
    s.env.isOnline = true; s.env.handlers.online(); await flushPromises();
    expect(db.writes).toHaveLength(1);
    expect(s.sync.count()).toBe(0);
  });

  it("keeps the last write per path (an edit replaces the waiting entry)", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    s.env.isOnline = false;
    await s.store.addWithId("a", { amount: 1 });
    await s.store.update("a", { amount: 2 });
    expect(s.sync.count()).toBe(1);
    expect(s.state.expenses[0].amount).toBe(2);
  });

  it("does not drop a change that was edited again while it was being sent", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    db.hold(true);
    await s.store.addWithId("a", { amount: 1 });
    await s.store.update("a", { amount: 2 }); // arrives while the first send is open
    db.hold(false); await flushPromises(); await flushPromises();
    expect(db.writes.map((w) => w.data.amount)).toEqual([1, 2]);
    expect(s.sync.count()).toBe(0);
  });

  it("goes offline on a timeout or network error and keeps the entry for a retry", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    db.failWith({ code: "unavailable" });
    await s.store.addWithId("a", { amount: 1 });
    await flushPromises();
    expect(s.sync.state()).toBe("error");
    expect(s.sync.count()).toBe(1);
    expect(s.state.expenses).toHaveLength(1);
  });

  it("refuses to save settings before the real settings arrived (would wipe wallets and limits)", async () => {
    const s = setup({ db });
    await expect(s.store.saveConfig({ rate: 7 })).rejects.toMatchObject({ code: "not_loaded" });
    expect(s.sync.count()).toBe(0);
  });

  it("saveConfig normalizes into state.config, and a waiting config beats the server copy", async () => {
    const s = setup({ db });
    db.emitConfig({ rate: 6.8, foodLimit: 50 });
    expect(s.state.configLoaded).toBe(true);
    expect(s.state.config.rate).toBe(6.8);
    s.env.isOnline = false;
    await s.store.saveConfig({ ...s.state.config, rate: 7.1 });
    expect(s.state.config.rate).toBe(7.1);
    db.emitConfig({ rate: 6.9 }); // a late server snapshot must not undo the waiting change
    expect(s.state.config.rate).toBe(7.1);
  });

  it("starts from a config left waiting in the outbox", () => {
    const s = setup({ db, initial: { [OUTBOX_KEY]: JSON.stringify([{ path: "config/main", data: { rate: 7.5 }, at: 1, n: 1 }]) } });
    expect(s.state.configLoaded).toBe(true);
    expect(s.state.config.rate).toBe(7.5);
  });

  it("merges server rows with waiting writes; a waiting write hides the server row for that id", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    s.env.isOnline = false;
    db.emitRows("expenses", [{ id: "a", amount: 1 }, { id: "b", amount: 2 }]);
    await s.store.update("a", { amount: 10 });
    await s.store.remove("b");
    const byId = Object.fromEntries(s.state.expenses.map((e) => [e.id, e.amount]));
    expect(byId).toEqual({ a: 10 });
    expect(s.state.loaded).toBe(true);
  });

  it("asks the app to fix guessed rates and run bills after the snapshots", () => {
    const s = setup({ db });
    db.emitRows("expenses", []);
    db.emitConfig({ rate: 6.7 });
    expect(s.calls.filter((c) => c[0] === "fix")).toHaveLength(2);
    expect(s.calls.filter((c) => c[0] === "bills")).toHaveLength(2);
  });

  it("a bill run waiting in the outbox counts as done without asking the server", async () => {
    const s = setup({ db });
    s.state.configLoaded = true;
    s.env.isOnline = false;
    await s.store.markBillRun("bill-1-2026-01");
    expect(await s.store.billRunDone("bill-1-2026-01")).toBe(true);
    expect(s.sync.visibleCount()).toBe(1); // only bookkeeping waiting: still reports it
  });
});

describe("store: local adapter", () => {
  it("loads from storage and saves entries, debts, transfers", async () => {
    const s = setup({ initial: { "ml.expenses": JSON.stringify([{ id: "x", date: "2026-01-01", amount: 3, currency: "RMB", rmb: 3, usd: 0.45, cat: "dining", kind: "need" }]) } });
    expect(s.state.mode).toBe("local");
    expect(s.state.loaded && s.state.configLoaded && s.state.debtsLoaded).toBe(true);
    expect(s.state.expenses).toHaveLength(1);
    const id = await s.store.add({ amount: 4, date: "2026-01-02", currency: "RMB", rmb: 4, usd: 0.6, cat: "dining", kind: "need" });
    expect(JSON.parse(s.backing.get("ml.expenses")).map((e) => e.id)).toContain(id);
    await s.store.debtSet("d1", { person: "A", amount: 5 });
    expect(JSON.parse(s.backing.get("ml.debts"))).toHaveLength(1);
    await s.store.debtDelete("d1");
    expect(JSON.parse(s.backing.get("ml.debts"))).toHaveLength(0);
  });

  it("saveConfig normalizes into state.config (same contract as the db adapter)", async () => {
    const s = setup();
    await s.store.saveConfig({ rate: "7,5abc", foodLimit: -3, mode: "intl" });
    expect(s.state.config.rate).toBe(6.7); // invalid rate falls back
    expect(s.state.config.foodLimit).toBe(0);
    expect(s.state.config.mode).toBe("intl");
    expect(JSON.parse(s.backing.get("ml.config")).mode).toBe("intl");
  });

  it("remembers bill runs and keeps reviews", async () => {
    const s = setup();
    expect(await s.store.billRunDone("b-1")).toBe(false);
    await s.store.markBillRun("b-1");
    expect(await s.store.billRunDone("b-1")).toBe(true);
    await s.store.saveReview("2026-01", { text: "ok" });
    expect(await s.store.getReview("2026-01")).toEqual({ text: "ok" });
  });

  it("asks for a draw and for bills after it opens", () => {
    const s = setup();
    expect(s.calls).toContainEqual(["render", true]);
    expect(s.calls).toContainEqual(["bills"]);
  });
});
