// The data store: one interface, two adapters.
//   db adapter    (signed in)  every change goes to the offline outbox first, shows at once, then is sent to Firestore.
//   local adapter (signed out) every change is written to this device's localStorage.
// The store keeps the shared `state` (expenses, debts, transfers, config, loaded flags) up to date and tells the
// screen through `hooks`; it never draws anything itself. Tests give it a fake db, a fake storage and a fake env.
//
// Interface:  openStore({ db, state, hooks, storage, env, now }) -> { store, sync }
//   store: add, addWithId, update, remove, saveConfig, billRunDone, markBillRun, getReview, saveReview,
//          debtSet, debtDelete, transferSet, transferDelete          (every adapter implements all of them)
//   sync:  { count(), visibleCount(), state(), retryNow() }          (what the sync banner shows)
// hooks:   render(configChanged), renderBanners(), renderBackground(configChanged), showError(msg), fixRates(), runBills()
// Contract: saveConfig normalizes the config and puts it in state.config before it returns, in both adapters.
//           In the db adapter it refuses (code "not_loaded") until the real settings have arrived, because the
//           screen only has defaults until then and saving those would wipe wallets, limits and bills.
import { cleanExpenses, cleanDebts, cleanTransfers } from "./lib/ledger.js";
import { normalizeConfig } from "./lib/config.js";
import { createOutbox, OUTBOX_KEY } from "./lib/outbox.js";
import { createStorage } from "./lib/storage.js";
import { uid } from "./lib/ids.js";

const SEND_TIMEOUT_MS = 15000;
const RETRY_MS = 20000;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), ms))]);

export function browserEnv() {
  return {
    online: () => typeof navigator === "undefined" || navigator.onLine !== false,
    onOnline: (fn) => window.addEventListener("online", fn),
    onOffline: (fn) => window.addEventListener("offline", fn),
    onVisible: (fn) => document.addEventListener("visibilitychange", () => { if (!document.hidden) fn(); })
  };
}

export function browserStorage(onWriteError) {
  let backing = null;
  try { backing = window.localStorage; } catch (e) { backing = null; }
  return createStorage(backing || { getItem() { throw new Error("no storage"); }, setItem() { throw new Error("no storage"); } }, onWriteError);
}

export function openStore({ db, state, hooks, storage, env = browserEnv(), now = () => Date.now() }) {
  const outbox = createOutbox(storage.read(OUTBOX_KEY, []), (items) => storage.write(OUTBOX_KEY, items));
  return db ? openDbStore({ db, state, hooks, env, now, outbox }) : openLocalStore({ state, hooks, storage, outbox });
}

function openDbStore({ db, state, hooks, env, now, outbox }) {
  state.mode = "db";
  // Offline queue: every change is saved on this device first, shown at once, then sent to your account.
  // With no internet it waits here (it survives closing the app) and is sent when you are back online.
  const raw = { expenses: [], transfers: [], debts: [], config: null };
  let flushing = false, syncState = "", retryTimer = 0;

  const refresh = () => {
    state.expenses = cleanExpenses(outbox.overlay(raw.expenses, "expenses"));
    state.transfers = cleanTransfers(outbox.overlay(raw.transfers, "transfers"));
    state.debts = cleanDebts(outbox.overlay(raw.debts, "debts"));
    const pc = outbox.pendingConfig();
    if (pc) state.config = normalizeConfig(pc); else if (raw.config) state.config = normalizeConfig(raw.config);
  };
  const queue = (path, data) => {
    outbox.queue(path, data, now());
    refresh();
    hooks.render(path === "config/main"); flush();
  };
  async function flush() {
    if (flushing) return;
    if (!outbox.length) { syncState = ""; hooks.renderBanners(); return; }
    if (!env.online()) { syncState = "offline"; hooks.renderBanners(); return; }
    flushing = true; syncState = "syncing"; hooks.renderBanners();
    try {
      while (outbox.length) {
        const o = outbox.next();
        await withTimeout(o.data ? db.doc(o.path).set(o.data) : db.doc(o.path).delete(), SEND_TIMEOUT_MS);
        outbox.sent(o);
      }
      syncState = "";
    } catch (err) {
      syncState = !env.online() || (err && err.code === "timeout") ? "offline" : "error";
      clearTimeout(retryTimer); retryTimer = setTimeout(flush, RETRY_MS);
    }
    flushing = false; refresh(); hooks.renderBackground();
  }
  env.onOnline(() => flush());
  env.onOffline(() => { if (outbox.length) { syncState = "offline"; hooks.renderBanners(); } });
  env.onVisible(() => flush());

  const store = {
    add: async (e) => { const id = uid(); queue("expenses/" + id, e); return id; },
    addWithId: async (id, e) => queue("expenses/" + id, e),
    update: async (id, e) => queue("expenses/" + id, e),
    remove: async (id) => queue("expenses/" + id, null),
    // Until the real settings have arrived, what is on screen is only the defaults. Saving that would wipe wallets, limits and bills.
    saveConfig: async (c) => { if (!state.configLoaded) throw { code: "not_loaded" }; queue("config/main", c); },
    billRunDone: async (id) => { if (outbox.has("billruns/" + id)) return true; return (await withTimeout(db.doc("billruns/" + id).get(), SEND_TIMEOUT_MS)).exists; },
    markBillRun: async (id) => queue("billruns/" + id, { at: now() }),
    getReview: async (key) => { const d = await db.doc("reviews/" + key).get(); return d.exists ? d.data() : null; },
    saveReview: (key, r) => db.doc("reviews/" + key).set(r),
    debtSet: async (id, d) => queue("debts/" + id, d),
    debtDelete: async (id) => queue("debts/" + id, null),
    transferSet: async (id, t) => queue("transfers/" + id, t),
    transferDelete: async (id) => queue("transfers/" + id, null)
  };

  refresh();
  if (outbox.pendingConfig()) state.configLoaded = true;
  db.collection("transfers").onSnapshot((snap) => {
    raw.transfers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    refresh(); hooks.renderBackground();
  }, () => {});
  db.collection("debts").onSnapshot((snap) => {
    raw.debts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.debtsLoaded = true;
    refresh(); hooks.renderBackground();
    hooks.fixRates();
  }, () => { state.debtsLoaded = true; });
  db.collection("expenses").onSnapshot((snap) => {
    raw.expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    state.loaded = true;
    refresh(); hooks.renderBackground();
    hooks.fixRates();
    hooks.runBills();
  }, (err) => { hooks.showError("Your expenses could not load (" + (err && err.code) + "). Reload the page to try again."); });
  db.doc("config/main").onSnapshot((snap) => {
    // no copy on this device yet is not the same as no settings: wait for the server to say so
    if (!snap.fromCache) state.configServer = true;
    if (!snap.exists && snap.fromCache) return;
    if (snap.exists) raw.config = snap.data();
    // Settings was drawn from the defaults, so anything typed there gives way to the real values
    if (!state.configLoaded) state.settingsDirty = false;
    state.configLoaded = true;
    refresh(); hooks.renderBackground(true);
    hooks.fixRates();
    hooks.runBills();
  }, () => { hooks.showError("Your settings could not load. Reload the page to try again."); });
  flush();

  return {
    store,
    sync: {
      count: () => outbox.length,
      visibleCount: () => outbox.visibleCount(),
      state: () => syncState,
      retryNow: () => { clearTimeout(retryTimer); flush(); }
    }
  };
}

function openLocalStore({ state, hooks, storage, outbox }) {
  state.mode = "local";
  state.expenses = cleanExpenses(storage.read("ml.expenses", []));
  state.config = normalizeConfig(storage.read("ml.config", null));
  state.loaded = true; state.configLoaded = true; state.configServer = true;
  const persist = () => storage.write("ml.expenses", state.expenses);
  const runs = storage.read("ml.billruns", {});
  const store = {
    add: async (e) => { const id = uid(); state.expenses.push({ id, ...e }); persist(); hooks.render(); return id; },
    addWithId: async (id, e) => { state.expenses = state.expenses.filter((x) => x.id !== id).concat([{ id, ...e }]); persist(); hooks.render(); },
    update: async (id, e) => { state.expenses = state.expenses.map((x) => (x.id === id ? { id, ...e } : x)); persist(); hooks.render(); },
    remove: async (id) => { state.expenses = state.expenses.filter((x) => x.id !== id); persist(); hooks.render(); },
    saveConfig: async (c) => { state.config = normalizeConfig(c); storage.write("ml.config", state.config); hooks.render(true); },
    billRunDone: async (id) => !!runs[id],
    markBillRun: async (id) => { runs[id] = Date.now(); storage.write("ml.billruns", runs); },
    getReview: async (key) => storage.read("ml.review." + key, null),
    saveReview: async (key, r) => storage.write("ml.review." + key, r),
    debtSet: async (id, d) => { state.debts = state.debts.filter((x) => x.id !== id).concat([{ id, ...d }]); storage.write("ml.debts", state.debts); hooks.render(); },
    debtDelete: async (id) => { state.debts = state.debts.filter((x) => x.id !== id); storage.write("ml.debts", state.debts); hooks.render(); },
    transferSet: async (id, t) => { state.transfers = state.transfers.filter((x) => x.id !== id).concat([{ id, ...t }]); storage.write("ml.transfers", state.transfers); hooks.render(); },
    transferDelete: async (id) => { state.transfers = state.transfers.filter((x) => x.id !== id); storage.write("ml.transfers", state.transfers); hooks.render(); }
  };
  state.transfers = cleanTransfers(storage.read("ml.transfers", []));
  state.debts = cleanDebts(storage.read("ml.debts", [])); state.debtsLoaded = true;
  hooks.render(true);
  hooks.runBills();
  return { store, sync: { count: () => outbox.length, visibleCount: () => outbox.visibleCount(), state: () => "", retryNow() {} } };
}
