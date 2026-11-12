import { describe, it, expect } from "vitest";
import { buildBackup, stripRow, newEntryCount, planRestore, applyRestorePlan } from "../src/lib/backup.js";
import { backupProblem } from "../src/lib/ledger.js";

const cfg = (wallets) => ({ rate: 6.7, wallets });
const here = { config: cfg(null), expenses: [{ id: "a", date: "2026-01-01", amount: 1 }, { id: "b", date: "2026-01-02", amount: 2 }], debts: [{ id: "d1" }], transfers: [{ id: "t1" }] };
const file = { config: cfg([{ id: "w", balance: 50 }]), expenses: [{ id: "b", amount: 2 }, { id: "c", amount: 3 }], debts: [{ id: "d2" }], transfers: [] };

// a store that records every call in order, and can fail on the Nth call
function fakeStore(failAt = 0) {
  const calls = []; let n = 0;
  const rec = (name) => async (...args) => { if (failAt && ++n === failAt) throw { code: "net" }; calls.push([name, ...args.map((a) => (typeof a === "object" ? "…" : a))]); };
  return { calls, addWithId: rec("addWithId"), debtSet: rec("debtSet"), transferSet: rec("transferSet"), remove: rec("remove"), debtDelete: rec("debtDelete"), transferDelete: rec("transferDelete"), saveConfig: rec("saveConfig") };
}

describe("backup file", () => {
  it("has everything and passes its own check", () => {
    const data = buildBackup({ ...here }, new Date("2026-11-12T10:00:00Z"));
    expect(data).toMatchObject({ app: "money-ledger", version: 1, exportedAt: "2026-11-12T10:00:00.000Z" });
    expect(data.expenses).toEqual(here.expenses);
    expect(data.expenses[0]).not.toBe(here.expenses[0]); // a copy, not the live rows
    expect(backupProblem(data)).toBeFalsy();
  });
  it("strips the fields the store owns", () => {
    expect(stripRow({ id: "x", _pending: true, amount: 5 })).toEqual({ amount: 5 });
  });
  it("counts what is not here yet", () => {
    expect(newEntryCount(here.expenses, file.expenses)).toBe(1);
    expect(newEntryCount([], [{ id: "x" }, null, { amount: 1 }])).toBe(1);
  });
});

describe("planRestore: Add missing", () => {
  const plan = planRestore(here, file, { replace: false });
  it("adds only what is not here, and removes nothing", () => {
    expect(plan.adds.expenses.map((x) => x.id)).toEqual(["c"]);
    expect(plan.adds.debts.map((x) => x.id)).toEqual(["d2"]);
    expect(plan.removes).toEqual({ expenses: [], debts: [], transfers: [] });
  });
  it("only fills in wallets when this account never set any up", () => {
    expect(plan.config).toEqual({ rate: 6.7, wallets: [{ id: "w", balance: 50 }] });
    const setUp = planRestore({ ...here, config: cfg([{ id: "mine" }]) }, file, { replace: false });
    expect(setUp.config).toBeNull(); // the owner's own wallets are never overwritten
  });
  it("keeps this account's other settings when filling in wallets", () => {
    const p = planRestore({ ...here, config: { rate: 7.2, wallets: null, foodLimit: 55 } }, file, { replace: false });
    expect(p.config).toMatchObject({ rate: 7.2, foodLimit: 55, wallets: [{ id: "w", balance: 50 }] });
  });
});

describe("planRestore: Replace", () => {
  const plan = planRestore(here, file, { replace: true });
  it("writes the whole backup and removes what the backup does not have", () => {
    expect(plan.adds.expenses.map((x) => x.id)).toEqual(["b", "c"]);
    expect(plan.removes).toEqual({ expenses: ["a"], debts: ["d1"], transfers: ["t1"] });
  });
  it("takes the backup's settings", () => {
    expect(plan.config).toBe(file.config);
  });
  it("matches ids as text, so a numeric id in the file is not removed and re-added", () => {
    const p = planRestore({ ...here, expenses: [{ id: "7" }] }, { ...file, expenses: [{ id: 7 }] }, { replace: true });
    expect(p.removes.expenses).toEqual([]);
  });
});

describe("applyRestorePlan", () => {
  it("adds everything before it removes anything, settings last", async () => {
    const store = fakeStore();
    await applyRestorePlan(planRestore(here, file, { replace: true }), store);
    const names = store.calls.map((c) => c[0]);
    const lastAdd = Math.max(...names.map((n, i) => (/^(addWithId|debtSet|transferSet)$/.test(n) ? i : -1)));
    const firstRemove = names.findIndex((n) => /^(remove|debtDelete|transferDelete)$/.test(n));
    expect(lastAdd).toBeLessThan(firstRemove);
    expect(names.at(-1)).toBe("saveConfig");
  });
  it("a failure while adding removes nothing, and says how far it got", async () => {
    const store = fakeStore(3); // the third write fails
    const progress = { done: 0 };
    await expect(applyRestorePlan(planRestore(here, file, { replace: true }), store, progress)).rejects.toMatchObject({ code: "net" });
    expect(store.calls.some((c) => /^(remove|debtDelete|transferDelete)$/.test(c[0]))).toBe(false);
    expect(progress.done).toBe(2);
  });
  it("reports progress every 10 entries", async () => {
    const many = { ...file, expenses: Array.from({ length: 25 }, (_, i) => ({ id: "e" + i })), debts: [], transfers: [] };
    const seen = [];
    await applyRestorePlan(planRestore({ ...here, expenses: [], debts: [], transfers: [] }, many, { replace: false }), fakeStore(), { done: 0 }, (n, t) => seen.push([n, t]));
    expect(seen).toEqual([[10, 25], [20, 25]]);
  });
  it("Add missing makes no removals and no settings write when nothing needs filling", async () => {
    const store = fakeStore();
    await applyRestorePlan(planRestore({ ...here, config: cfg([{ id: "x" }]) }, file, { replace: false }), store);
    expect(store.calls.map((c) => c[0])).toEqual(["addWithId", "debtSet"]);
  });
});
