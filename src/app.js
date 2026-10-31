import { round2, fmt, fmt0, smart, sign, usd, usd0, usdS, rmb, rmb0, rmbS, compactRmb, parseAmt, amountInText, normNum, NUM_RE, pct, ordinal, listJoin, csvCell, parseRate, nOf } from "./lib/format.js";
import { rollNumber, spendTick, glide, skeletonRows, emptyArt, watchStuck, initSwipe, staggerRows, snapshotBars, morphBars, scrubBars, flyMoney, initThemeFade, sleep as wait } from "./motion.js";
import { pad, isoOf, shiftMonth, daysIn, mondayOf, addDays, saneDate } from "./lib/dates.js";
import { R, U, isInc, isSave, isSpend, statsOf, monthList as monthListOf, wCur, afterSet, moneyOn, walletBalanceOn, walletMoves as walletMovesOf, inWalletCur as inWalletCurOf, wToRmb as wToRmbOf, cleanExpenses, cleanDebts, cleanTransfers, backupProblem } from "./lib/ledger.js";

(function () {
  "use strict";

  const DEFAULT_CATS = [
    
    { id: "utilities", name: "Utilities & Phone", color: "#2BA6C8", kind: "need", budget: 0 },
    { id: "groceries", name: "Groceries", color: "#2FA968", kind: "need", budget: 0 },
    { id: "dining", name: "Food", color: "#F07A2E", kind: "need", budget: 0 },
    { id: "coffee", name: "Coffee", color: "#8B5A3C", kind: "want", budget: 0 },
    { id: "snacks", name: "Snacks & Drinks", color: "#06B6D4", kind: "want", budget: 0 },
    { id: "transport", name: "Transport", color: "#8B5CF6", kind: "need", budget: 0 },
    { id: "shopping", name: "Shopping", color: "#E5487F", kind: "want", budget: 0 },
    { id: "clothing", name: "Clothing", color: "#7C5CE0", kind: "want", budget: 0 },
    { id: "health", name: "Health & Medical", color: "#E5484D", kind: "need", budget: 0 },
    { id: "education", name: "Education & Growth", color: "#12A594", kind: "need", budget: 0 },
    { id: "fun", name: "Entertainment & Subscriptions", color: "#D9A11A", kind: "want", budget: 0 },
    { id: "travel", name: "Travel", color: "#3E9BF0", kind: "want", budget: 0 },
    { id: "family", name: "Family & Gifts", color: "#B45FD6", kind: "want", budget: 0 },
    { id: "personal", name: "Personal Care", color: "#E58A7E", kind: "want", budget: 0 },
    { id: "debt", name: "Debt & Loan Payments", color: "#6B7280", kind: "need", budget: 0 },
    { id: "savings", name: "Savings & Investing", color: "#15803D", kind: "save", budget: 0 },
    { id: "other", name: "Other", color: "#A38B6D", kind: "want", budget: 0 }
  ];
  const DEFAULT_INCOME_CATS = [
    { id: "salary", name: "Salary", color: "#15803D" },
    { id: "sidejob", name: "Side job & Freelance", color: "#12A594" },
    { id: "bonus", name: "Bonus", color: "#D9A11A" },
    { id: "gifts_in", name: "Gifts received", color: "#B45FD6" },
    { id: "returns", name: "Investment returns", color: "#2BA6C8" },
    { id: "refund", name: "Refunds", color: "#4F6BED" },
    { id: "income_other", name: "Other income", color: "#6B7280" }
  ];
  const DEFAULT_RATE = 6.70;
  const DEFAULT_FOOD_LIMIT = 100;
  const DEFAULT_FOOD_CATS = ["groceries", "dining", "coffee", "snacks"];
  const METHODS = ["Alipay", "WeChat Pay", "Cash", "Bank card", "Credit card", "Bank transfer", "Other"];
  const DEFAULT_METHOD = "Alipay";
  // payment methods = the standard list plus any wallet you added yourself
  const allMethods = () => { const extra = (state && state.config && state.config.wallets ? state.config.wallets : []).flatMap((w) => w.methods).filter((m) => !METHODS.includes(m)); return METHODS.slice(0, -1).concat(extra, ["Other"]); };
  const KIND_LABEL = { need: "Need", want: "Want", save: "Savings" };
  const NO_REASON = "(no reason written)";

  const ICONS = {
    housing: '<path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
    utilities: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    groceries: '<path d="M3 4h2.2l2.3 10.6a1.2 1.2 0 0 0 1.2.9h8.6a1.2 1.2 0 0 0 1.2-.9L20.5 7.5H6"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    dining: '<circle cx="12" cy="13" r="5.5"/><circle cx="12" cy="13" r="2.5"/><path d="M3.5 4v5.5a1.5 1.5 0 0 0 1.5 1.5v9M5 4v4M6.5 4v5.5A1.5 1.5 0 0 1 5 11M20.5 20.5V4c-1.4 1-2 3-2 5.5V13h2"/>',
    snacks: '<path d="M10 2.5h4M10.5 2.5v3l-2 3v11a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-11l-2-3v-3"/><path d="M8.5 12h7M8.5 16h7"/>',
    coffee: '<path d="M4 9h12.5v4.5A5.5 5.5 0 0 1 11 19H9.5A5.5 5.5 0 0 1 4 13.5z"/><path d="M16.5 10.5h1.2a2.5 2.5 0 0 1 0 5h-1.6"/><path d="M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
    transport: '<path d="M5 11l1.6-4.3A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.2L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6.5 17v2.5M17.5 17v2.5"/><circle cx="7.5" cy="14" r=".6"/><circle cx="16.5" cy="14" r=".6"/>',
    shopping: '<path d="M5 8h14l-1.1 11.1a1.5 1.5 0 0 1-1.5 1.4H7.6a1.5 1.5 0 0 1-1.5-1.4z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
    clothing: '<path d="M9 3.5 4 6 2.5 10.5l3 1.2V20.5h13v-8.8l3-1.2L20 6l-5-2.5c-.3 1.4-1.5 2.5-3 2.5s-2.7-1.1-3-2.5z"/>',
    health: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/><path d="M8 12h2l1-2 2 4 1-2h2"/>',
    education: '<path d="M4 5.5A2 2 0 0 1 6 3.5h14v14H6a2 2 0 0 0-2 2z"/><path d="M4 19.5a2 2 0 0 0 2 2h14v-4"/><path d="M9 8h7"/>',
    fun: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10.2 9.3v5.4l4.6-2.7z"/>',
    travel: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    family: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5.5 12v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-7M12 8v12.5"/><path d="M12 8C9.5 8 7.5 7 7.8 5.3 8.2 3.5 11 4.5 12 8zM12 8c2.5 0 4.5-1 4.2-2.7C15.8 3.5 13 4.5 12 8z"/>',
    personal: '<path d="M11 3.5l1.7 4.8 4.8 1.7-4.8 1.7L11 16.5l-1.7-4.8L4.5 10l4.8-1.7z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    debt: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
    savings: '<path d="M3.5 17l5.5-5.5 4 4 7.5-7.5"/><path d="M15 8h5.5v5.5"/>',
    other: '<circle cx="6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18" cy="12" r="1.3" fill="currentColor"/>',
    tag: '<path d="M3.5 12.2V4.8a1.3 1.3 0 0 1 1.3-1.3h7.4l8.3 8.3a1.3 1.3 0 0 1 0 1.8l-7.4 7.4a1.3 1.3 0 0 1-1.8 0z"/><circle cx="8" cy="8" r="1.4"/>',
    salary: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    sidejob: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2.5 19.5h19"/>',
    bonus: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    returns: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    refund: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    income_other: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'
  };
  ICONS.gifts_in = ICONS.family;
  ICONS.w_cash = '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>';
  ICONS.w_wechat = '<path d="M9.5 4.5c-3.9 0-7 2.6-7 5.8 0 1.8 1 3.4 2.6 4.5l-.6 2.2 2.5-1.3c.8.2 1.6.3 2.5.3"/><path d="M15 9.5c3.6 0 6.5 2.3 6.5 5.2 0 1.6-.9 3-2.3 4l.5 1.9-2.2-1.1c-.8.2-1.6.3-2.5.3-3.6 0-6.5-2.3-6.5-5.1s2.9-5.2 6.5-5.2z"/>';
  ICONS.w_alipay = '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3M9 9.5l2.2 2.2L15.5 7.5"/>';
  ICONS.w_bank = '<path d="M3 9.5 12 4l9 5.5M4.5 9.5v8M9 9.5v8M15 9.5v8M19.5 9.5v8M3 20h18"/>';
  ICONS.w_other = '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H20V8H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1.2" fill="currentColor"/>';

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const todayISO = () => isoOf(new Date());
  const curMonth = () => todayISO().slice(0, 7);
  const monthName = (key, opts) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", opts || { month: "long", year: "numeric" }); };
  const dayLabel = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const icon = (id) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[id] || ICONS.tag) + "</svg>";
  const tile = (c, cls) => '<span class="' + (cls || "tile") + '" style="--c:' + esc(c.color) + '">' + icon(c.id) + "</span>";
  const pref = {
    get(k, d) { try { const v = localStorage.getItem("ml." + k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("ml." + k, v); } catch (e) {} }
  };
  const FIXED_CATS = ["housing", "utilities", "debt"];
  const isFixed = (e) => !!e.bill || FIXED_CATS.includes(e.cat);

  // ---------- State ----------
  function normalizeConfig(d) {
    const c = d || {};
    const listOf = (v, fallback) => { const l = Array.isArray(v) ? v.filter((x) => x && x.id) : []; return l.length ? l : fallback; };
    const cats = listOf(c.categories, DEFAULT_CATS);
    return {
      rate: Number(c.rate) > 0 ? Number(c.rate) : DEFAULT_RATE,
      rateSetAt: Number(c.rateSetAt) > 0 ? Number(c.rateSetAt) : 0,
      income: Number(c.income) > 0 ? Number(c.income) : 0,
      foodLimit: c.foodLimit == null ? DEFAULT_FOOD_LIMIT : Math.max(0, Number(c.foodLimit) || 0),
      foodCats: Array.isArray(c.foodCats) ? c.foodCats.map(String) : DEFAULT_FOOD_CATS.slice(),
      bills: Array.isArray(c.bills) ? c.bills.filter((b) => b && b.id && Number(b.amount) > 0).map((b) => ({ id: String(b.id), type: b.type === "income" ? "income" : "expense", name: String(b.name || "Monthly bill"), cat: String(b.cat || "other"), amount: Number(b.amount), currency: b.currency === "USD" ? "USD" : "RMB", day: Math.min(31, Math.max(1, Math.round(Number(b.day) || 1))), method: String(b.method || "Bank transfer") })) : [],
      incomeCats: listOf(c.incomeCats, DEFAULT_INCOME_CATS).map((x) => ({ id: String(x.id), name: String(x.name || "Income"), color: String(x.color || "#15803D"), kind: "income", budget: 0 })),
      wallets: Array.isArray(c.wallets) ? c.wallets.filter((w) => w && w.id).map((w) => ({ id: String(w.id), name: String(w.name || "Wallet"), icon: String(w.icon || "w_other"), color: String(w.color || "#6B7280"), methods: Array.isArray(w.methods) ? w.methods.map(String) : [], currency: w.currency === "USD" ? "USD" : "RMB", balance: Number(w.balance) || 0, setAt: Number(w.setAt) || 0 })) : null,
      lastBackupAt: Number(c.lastBackupAt) || 0,
      // monthly shopping limit (Shopping + Clothing) and the "wait for next month" list
      shopLimit: Number(c.shopLimit) > 0 ? Number(c.shopLimit) : 0,
      shopCats: Array.isArray(c.shopCats) ? c.shopCats.map(String) : ["shopping", "clothing"],
      // your own limits: any sections, per week or per month
      limits: (Array.isArray(c.limits) ? c.limits : Number(c.shopLimit) > 0 ? [{ id: "lim-shop", name: "Shopping", cats: Array.isArray(c.shopCats) ? c.shopCats : ["shopping", "clothing"], amount: Number(c.shopLimit), period: "month" }] : [])
        .filter((l) => l && l.id && Number(l.amount) > 0 && Array.isArray(l.cats) && l.cats.length)
        .map((l) => ({ id: String(l.id), name: String(l.name || ""), cats: l.cats.map(String), amount: Number(l.amount), period: l.period === "week" ? "week" : "month" })),
      later: Array.isArray(c.later) ? c.later.filter((x) => x && x.id && Number(x.amount) > 0).map((x) => ({ id: String(x.id), reason: String(x.reason || ""), amount: Number(x.amount), currency: x.currency === "USD" ? "USD" : "RMB", cat: String(x.cat || "shopping"), method: String(x.method || DEFAULT_METHOD), addedAt: Number(x.addedAt) || 0, forMonth: String(x.forMonth || "") })) : [],
      categories: cats.map((x) => ({ id: String(x.id), name: String(x.name || "Section"), color: String(x.color || "#888888"), kind: KIND_LABEL[x.kind] ? x.kind : "want", budget: Number(x.budget) > 0 ? Number(x.budget) : 0 }))
    };
  }
  const state = {
    expenses: [],
    transfers: [], openWallets: {},
    debts: [], debtsLoaded: false, openPeople: {}, debtEditId: null,
    config: normalizeConfig(null),
    loaded: false, configLoaded: false,
    mode: "connecting",
    view: "home",
    homeView: pref.get("homeView", "list") === "cal" ? "cal" : "list",
    reportMode: ["day", "week", "month", "year"].includes(pref.get("reportMode", "month")) ? pref.get("reportMode", "month") : "month",
    month: curMonth(),
    selDay: null,
    repDay: null,
    catFilter: null,
    searchAll: false,
    reviews: {},
    editId: null,
    form: { currency: "RMB", cat: null, kind: "need", kindTouched: false, method: "Alipay" },
    settingsDirty: false
  };
  const catById = (id) => state.config.categories.find((c) => c.id === id) || state.config.incomeCats.find((c) => c.id === id) || { id: id, name: "Other", color: "#A38B6D", kind: "want", budget: 0 };
  const isFood = (catId) => state.config.foodCats.includes(catId);
  // a limit covers one week (Mon–Sun) or one month around a date
  const limRange = (l, date) => { if (l.period === "week") { const m = mondayOf(date); return { start: m, end: addDays(m, 6) }; } const k = date.slice(0, 7); return { start: k + "-01", end: k + "-" + pad(daysIn(k)) }; };
  const limEntries = (l, date, exceptId) => { const r = limRange(l, date); return state.expenses.filter((e) => isSpend(e) && l.cats.includes(e.cat) && e.date >= r.start && e.date <= r.end && e.id !== exceptId); };
  const limSpent = (l, date, exceptId) => limEntries(l, date, exceptId).reduce((a, e) => a + R(e), 0);
  const limName = (l) => l.name || listJoin(l.cats.map((id) => catById(id).name));
  const limWord = (l) => (l.period === "week" ? "week" : "month");
  const laterRmb = (x) => (x.currency === "USD" ? x.amount * state.config.rate : x.amount);

  // ---------- Storage ----------
  let store = null;
  const local = {
    read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { showError("This device's storage is full, so your last change may not be kept. Download a backup and delete old entries."); } }
  };
  let outbox = [].concat(local.read("ml.outbox", [])).filter((o) => o && typeof o.path === "string" && o.path.includes("/")), queueSeq = outbox.reduce((a, o) => Math.max(a, o.n || 0), 0);
  let flushing = false, syncState = "", retryTimer = 0;
  let refreshFromQueue = () => {}, flushOutbox = async () => {};
  const saveOutbox = () => local.write("ml.outbox", outbox);
  async function initStore() {
    let db = null;
    try { if (window.claude && typeof window.claude.use === "function") db = await window.claude.use("db"); } catch (e) { db = null; }
    if (db) {
      state.mode = "db";
      // Offline queue: every change is saved on this device first, shown at once, then sent to your account.
      // With no internet it waits here (it survives closing the app) and is sent when you are back online.
      const raw = { expenses: [], transfers: [], debts: [], config: null };
      const queued = (path) => outbox.some((o) => o.path === path);
      const overlay = (coll) => {
        const list = raw[coll].filter((x) => !queued(coll + "/" + x.id));
        outbox.forEach((o) => { const [c, id] = o.path.split("/"); if (c === coll && o.data) list.push({ id, ...o.data, _pending: true }); });
        return list;
      };
      refreshFromQueue = () => {
        state.expenses = cleanExpenses(overlay("expenses")); state.transfers = cleanTransfers(overlay("transfers")); state.debts = cleanDebts(overlay("debts"));
        const pc = outbox.filter((o) => o.path === "config/main" && o.data).pop();
        if (pc) state.config = normalizeConfig(pc.data); else if (raw.config) state.config = normalizeConfig(raw.config);
      };
      const clean = (d) => { const o = { ...d }; delete o._pending; delete o.id; return o; };
      const queue = (path, data) => {
        outbox = outbox.filter((o) => o.path !== path).concat([{ path, data: data ? clean(data) : null, at: Date.now(), n: ++queueSeq }]);
        saveOutbox(); refreshFromQueue();
        safeRender(path === "config/main"); flushOutbox();
      };
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: "timeout" }), ms))]);
      flushOutbox = async () => {
        if (flushing) return;
        if (!outbox.length) { syncState = ""; renderBanners(); return; }
        if (navigator.onLine === false) { syncState = "offline"; renderBanners(); return; }
        flushing = true; syncState = "syncing"; renderBanners();
        try {
          while (outbox.length) {
            const o = outbox[0];
            await withTimeout(o.data ? db.doc(o.path).set(o.data) : db.doc(o.path).delete(), 15000);
            // drop it only if it was not changed again while it was being sent
            const cur = outbox.find((x) => x.path === o.path);
            outbox = outbox.filter((x) => x !== (cur && cur.n !== o.n ? o : cur));
            saveOutbox();
          }
          syncState = "";
        } catch (err) {
          syncState = navigator.onLine === false || (err && err.code === "timeout") ? "offline" : "error";
          clearTimeout(retryTimer); retryTimer = setTimeout(flushOutbox, 20000);
        }
        flushing = false; refreshFromQueue(); renderBackground();
      };
      window.addEventListener("online", () => flushOutbox());
      window.addEventListener("offline", () => { if (outbox.length) { syncState = "offline"; renderBanners(); } });
      document.addEventListener("visibilitychange", () => { if (!document.hidden) flushOutbox(); });
      store = {
        add: async (e) => { const id = uid(); queue("expenses/" + id, e); return id; },
        addWithId: async (id, e) => queue("expenses/" + id, e),
        update: async (id, e) => queue("expenses/" + id, e),
        remove: async (id) => queue("expenses/" + id, null),
        // Until the real settings have arrived, what is on screen is only the defaults. Saving that would wipe wallets, limits and bills.
        saveConfig: async (c) => { if (!state.configLoaded) throw { code: "not_loaded" }; queue("config/main", c); },
        billRunDone: async (id) => { if (queued("billruns/" + id)) return true; return (await withTimeout(db.doc("billruns/" + id).get(), 15000)).exists; },
        markBillRun: async (id) => queue("billruns/" + id, { at: Date.now() }),
        getReview: async (key) => { const d = await db.doc("reviews/" + key).get(); return d.exists ? d.data() : null; },
        saveReview: (key, r) => db.doc("reviews/" + key).set(r),
        debtSet: async (id, d) => queue("debts/" + id, d),
        debtDelete: async (id) => queue("debts/" + id, null),
        transferSet: async (id, t) => queue("transfers/" + id, t),
        transferDelete: async (id) => queue("transfers/" + id, null)
      };
      refreshFromQueue();
      if (outbox.some((o) => o.path === "config/main" && o.data)) state.configLoaded = true;
      db.collection("transfers").onSnapshot((snap) => {
        raw.transfers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        refreshFromQueue(); renderBackground();
      }, () => {});
      db.collection("debts").onSnapshot((snap) => {
        raw.debts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        state.debtsLoaded = true;
        refreshFromQueue(); renderBackground();
      }, () => { state.debtsLoaded = true; });
      db.collection("expenses").onSnapshot((snap) => {
        raw.expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        state.loaded = true;
        refreshFromQueue(); renderBackground();
        runBills();
      }, (err) => { showError("Your expenses could not load (" + (err && err.code) + "). Reload the page to try again."); });
      db.doc("config/main").onSnapshot((snap) => {
        // no copy on this device yet is not the same as no settings: wait for the server to say so
        if (!snap.exists && snap.fromCache) return;
        if (snap.exists) raw.config = snap.data();
        // Settings was drawn from the defaults, so anything typed there gives way to the real values
        if (!state.configLoaded) state.settingsDirty = false;
        state.configLoaded = true;
        refreshFromQueue(); renderBackground(true);
        runBills();
      }, () => { showError("Your settings could not load. Reload the page to try again."); });
      flushOutbox();
    } else {
      state.mode = "local";
      state.expenses = cleanExpenses(local.read("ml.expenses", []));
      state.config = normalizeConfig(local.read("ml.config", null));
      state.loaded = true; state.configLoaded = true;
      const persist = () => local.write("ml.expenses", state.expenses);
      const runs = local.read("ml.billruns", {});
      store = {
        add: async (e) => { const id = uid(); state.expenses.push({ id, ...e }); persist(); safeRender(); return id; },
        addWithId: async (id, e) => { state.expenses = state.expenses.filter((x) => x.id !== id).concat([{ id, ...e }]); persist(); safeRender(); },
        update: async (id, e) => { state.expenses = state.expenses.map((x) => (x.id === id ? { id, ...e } : x)); persist(); safeRender(); },
        remove: async (id) => { state.expenses = state.expenses.filter((x) => x.id !== id); persist(); safeRender(); },
        saveConfig: async (c) => { state.config = normalizeConfig(c); local.write("ml.config", state.config); safeRender(true); },
        billRunDone: async (id) => !!runs[id],
        markBillRun: async (id) => { runs[id] = Date.now(); local.write("ml.billruns", runs); },
        getReview: async (key) => local.read("ml.review." + key, null),
        saveReview: async (key, r) => local.write("ml.review." + key, r),
        debtSet: async (id, d) => { state.debts = state.debts.filter((x) => x.id !== id).concat([{ id, ...d }]); local.write("ml.debts", state.debts); safeRender(); },
        debtDelete: async (id) => { state.debts = state.debts.filter((x) => x.id !== id); local.write("ml.debts", state.debts); safeRender(); },
        transferSet: async (id, t) => { state.transfers = state.transfers.filter((x) => x.id !== id).concat([{ id, ...t }]); local.write("ml.transfers", state.transfers); safeRender(); },
        transferDelete: async (id) => { state.transfers = state.transfers.filter((x) => x.id !== id); local.write("ml.transfers", state.transfers); safeRender(); }
      };
      state.transfers = cleanTransfers(local.read("ml.transfers", []));
      state.debts = cleanDebts(local.read("ml.debts", [])); state.debtsLoaded = true;
      safeRender(true);
      runBills();
    }
  }

  // ---------- Stats (yuan is the main unit) ----------
  const foodOn = (iso) => state.expenses.filter((e) => e.date === iso && isFood(e.cat) && isSpend(e)).reduce((a, e) => a + R(e), 0);
  const totalBudget = () => state.config.categories.reduce((a, c) => a + (c.budget || 0), 0);
  function reasonsFor(items) {
    const map = Object.create(null);
    items.forEach((e) => {
      const label = (e.reason || "").trim() || NO_REASON;
      const r = (map[label.toLowerCase()] = map[label.toLowerCase()] || { label, rmb: 0, usd: 0, n: 0 });
      r.rmb += R(e); r.usd += U(e); r.n++;
    });
    return Object.values(map).sort((a, b) => b.rmb - a.rmb);
  }
  const quote = (rs, n) => rs.filter((r) => r.label !== NO_REASON).slice(0, n).map((r) => "“" + esc(r.label) + "”");

  // ---------- Shell ----------
  // A change arriving by itself (sync finishing, another device) must not wipe a form you are filling in.
  // It waits until the form is closed; anything you do yourself still redraws straight away.
  function formOpen() {
    if (!["wallets", "debts", "limits"].includes(state.view)) return false;
    const v = $("v-" + state.view), a = document.activeElement;
    if (state.limEdit || v.querySelector("[data-wform]:not([hidden]), .pay-row:not([hidden]), .debt-item textarea")) return true;
    if (a && v.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return true;
    return Array.from(v.querySelectorAll("#wa-name, #wa-bal, .wsetup input")).some((i) => i.value);
  }
  let bgTimer = 0, bgConfig = false;
  function renderBackground(configChanged) {
    bgConfig = bgConfig || !!configChanged;
    clearTimeout(bgTimer);
    if (formOpen()) { renderBanners(); bgTimer = setTimeout(renderBackground, 1500); return; }
    const c = bgConfig; bgConfig = false;
    safeRender(c);
  }
  // A saved change is saved even if a screen then fails to draw, so that must never look like "could not save".
  function safeRender(configChanged) {
    try { renderAll(configChanged); } catch (err) { console.error(err); showError("A screen could not be drawn, but your data is safe. Close the app fully and open it again."); }
  }
  // The month arrows only change what Home, Settings' downloads and the Month and Year reports show
  function syncMonthSwitch() {
    const on = state.view === "home" || state.view === "settings" || (state.view === "report" && (state.reportMode === "month" || state.reportMode === "year"));
    document.querySelector(".month-switch").hidden = !on;
  }
  function renderAll(configChanged) {
    $("m-label").textContent = monthName(state.month, { month: "short", year: "numeric" });
    syncMonthSwitch();
    renderBanners();
    if (configChanged) renderCatChips();
    renderConvert();
    if (state.view === "home") renderHome();
    if (state.view === "report") renderReport();
    if (state.view === "settings" && (!state.settingsDirty || configChanged === "force")) renderSettings();
    if (state.view === "debts") renderDebts();
    if (state.view === "limits") renderLimits();
    renderLimitsDot();
    if (state.view === "wallets") renderWallets();
    if (state.slide) {
      const v = $("v-" + state.view);
      v.classList.remove("slide-next", "slide-prev"); void v.offsetWidth; v.classList.add("slide-" + state.slide);
      state.slide = null;
    }
  }
  let errMsg = "";
  function showError(msg) { errMsg = msg; renderBanners(); }
  // when the last waiting change has been sent, a quick "saved" note shows for a moment
  let hadPending = false, syncedAt = 0;
  function renderBanners() {
    let html = "";
    const pending = state.mode === "db" && outbox.length > 0;
    if (hadPending && !pending && state.mode === "db" && !errMsg) { syncedAt = Date.now(); setTimeout(renderBanners, 1850); }
    hadPending = pending;
    if (errMsg) html += '<div class="banner warn"><span class="grow">' + esc(errMsg) + "</span></div>";
    if (syncedAt && !pending && Date.now() - syncedAt < 1800) html += '<div class="banner synced" style="--sd:-' + (Date.now() - syncedAt) + 'ms"><svg class="synced-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9.5a4.25 4.25 0 0 1 0 8.5z"/><path d="M9.5 13.5l2 2 3.5-3.5"/></svg><span class="grow">All saved to your account</span></div>';
    if (state.mode === "db" && outbox.length) {
      const n = outbox.filter((o) => !o.path.startsWith("billruns/")).length || outbox.length;
      const what = n + (n === 1 ? " change" : " changes");
      html += '<div class="banner sync"><span class="sync-dot' + (syncState === "syncing" ? " spin" : syncState === "error" ? "" : " off") + '"></span><span class="grow">' +
        (syncState === "syncing" ? "Sending " + what + " to your account…" :
          syncState === "error" ? "<strong>" + what + "</strong> saved on this device. Could not reach your account, trying again shortly." :
          "<strong>Offline.</strong> " + what + " saved on this device. " + (n === 1 ? "It" : "They") + " will be sent when you are back online.") +
        "</span>" + (syncState !== "syncing" ? '<button class="btn small" type="button" id="sync-now">Try now</button>' : "") + "</div>";
    }
    if (state.mode === "local") html += '<div class="banner warn"><span class="grow">' + (window.__sync && window.__sync.error ? "<strong>Could not open your account.</strong> What you see is not your saved data, and anything added now stays on this device. Close the app fully and open it again." : "Saving on this device only." + (window.__sync && window.__sync.available ? " Sign in under Settings to keep a safe copy and sync your devices." : "")) + "</span></div>";
    const ex = state.expenses.filter((e) => e.example).length + state.debts.filter((d) => d.example).length;
    if (ex) html += '<div class="banner"><span class="grow">These are <strong>' + ex + " example entries</strong>. Remove them when you are ready to start.</span>" + '<button class="btn small primary" type="button" id="rm-examples">Remove examples</button></div>';
    const rs = state.config.rateSetAt, days = rs ? Math.floor((Date.now() - rs) / 86400000) : 0;
    if (state.configLoaded && rs && days >= 30) html += '<div class="banner"><span class="grow">Your exchange rate <strong>¥' + state.config.rate.toFixed(2) + " = $1</strong> was set " + days + " days ago. Is it still right?</span>" +
      '<button class="btn small" type="button" id="rate-ok">Still right</button><button class="btn small primary" type="button" id="rate-upd">Update</button></div>';
    $("banners").innerHTML = html;
    const sn = $("sync-now"); if (sn) sn.onclick = () => { clearTimeout(retryTimer); flushOutbox(); };
    if ($("rate-ok")) {
      $("rate-ok").onclick = async () => { try { await store.saveConfig({ ...state.config, rateSetAt: Date.now() }); state.config.rateSetAt = Date.now(); renderBanners(); } catch (e) { toast("Could not save. Try again.", true); } };
      $("rate-upd").onclick = () => { setView("settings"); setTimeout(() => { $("s-rate").focus(); $("s-rate").select(); }, 80); };
    }
    const rm = $("rm-examples");
    if (rm) rm.onclick = async () => {
      rm.disabled = true; rm.textContent = "Removing…";
      const ids = state.expenses.filter((e) => e.example).map((e) => e.id);
      try { for (const id of ids) await store.remove(id); for (const d of state.debts.filter((x) => x.example)) await store.debtDelete(d.id); toast("All clear. Tap + to add your first expense"); } catch (e) { toast("Could not remove all examples. Try again.", true); rm.disabled = false; }
    };
  }
  let toastTimer = null;
  // motion state for the Home list: a fresh arrival staggers its rows, and swipe rows are wrapped after each draw
  let staggerPending = true, lastListKey = null, swipe = { prepare() {} };
  function toast(msg, plain, action) {
    const t = $("toast");
    t.innerHTML = (plain ? "" : '<span class="check">✓</span>') + "<span>" + esc(msg) + "</span>" + (action ? '<button type="button" class="toast-act" id="toast-act">' + esc(action.label) + '</button><i class="toast-bar"></i>' : "");
    t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    if (action) $("toast-act").onclick = () => { t.hidden = true; action.fn(); };
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), action ? 5000 : 2800);
  }
  function setView(v) {
    // Leaving Settings keeps what you changed: Save is far down the page and easy to miss. A typing mistake keeps you here.
    if (state.view === "settings" && v !== "settings" && state.settingsDirty) {
      if (state.configLoaded) {
        const problem = settingsProblem();
        if (problem) { toast(problem, true); return; }
        saveSettings();
      } else state.settingsDirty = false;
    }
    const changed = state.view !== v;
    if (changed && v === "home") staggerPending = true;
    state.view = v;
    ["home", "report", "wallets", "debts", "limits", "settings"].forEach((k) => { $("v-" + k).hidden = k !== v; $("t-" + k).setAttribute("aria-selected", String(k === v)); });
    const wide = v !== "home";
    ["main", "top-wrap", "tabs-wrap"].forEach((id) => $(id).classList.toggle("wide", wide));
    // the round + belongs to Home only; other screens have their own add buttons or are for reading
    $("fab").hidden = v !== "home";
    document.body.classList.toggle("no-fab", v !== "home");
    $("fab").setAttribute("aria-label", v === "debts" ? "Add a debt" : "Add expense");
    // tapping the Settings tab while already on it must not throw away what you typed
    if (v === "settings" && changed) { state.settingsDirty = false; renderSettings(); }
    if (v !== "limits") state.limEdit = null;
    if (v === "report") { lastReportAnim = null; playedCards.clear(); }
    pref.set("view", v);
    renderAll();
    window.scrollTo({ top: 0 });
    // the new screen fades in; a leftover month slide must not replay on it
    if (changed) { const el = $("v-" + v); el.classList.remove("slide-next", "slide-prev", "view-in"); void el.offsetWidth; el.classList.add("view-in"); }
  }

  // ---------- Sheet (add / edit) ----------
  let lastFocus = null, lockY = 0;
  // Holds the page still behind an open sheet and puts it back where it was on close
  function syncSheetLock() {
    const open = !$("sheet").hidden || !$("dsheet").hidden, body = document.body;
    if (open === body.classList.contains("sheet-open")) return;
    if (open) { lockY = window.scrollY; body.style.top = -lockY + "px"; body.classList.add("sheet-open"); }
    else { body.classList.remove("sheet-open"); body.style.top = ""; window.scrollTo(0, lockY); }
  }
  // Home Screen app on iPhone: iOS can size the app shorter than the screen, which lifts everything fixed to the bottom.
  // --screen-h keeps short pages (Debts) as tall as the screen; --bar-gap moves the bottom bar down by whatever gap is left.
  function fitBottomBar() {
    const root = document.documentElement, bar = document.querySelector(".tabs-bar");
    const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    const phone = window.innerWidth <= 640 && window.innerHeight > window.innerWidth;
    // this runs on every frame while the page height changes, so it only writes when something really changed: a write restyles the whole page
    const screenH = standalone && phone ? screen.height + "px" : "";
    if (root.style.getPropertyValue("--screen-h") !== screenH) { if (screenH) root.style.setProperty("--screen-h", screenH); else root.style.removeProperty("--screen-h"); }
    const current = parseFloat(root.style.getPropertyValue("--bar-gap")) || 0;
    const gap = standalone && phone && !root.classList.contains("kb-open") ? Math.round(screen.height - bar.getBoundingClientRect().bottom + current) : 0;
    const applied = gap > 0 && gap <= 90 ? gap : 0;
    if (applied !== current) root.style.setProperty("--bar-gap", applied + "px");
  }
  // A Home Screen app can stay open for days: when the date changes, "today" and the current month must move with it
  let lastDay = todayISO();
  function checkNewDay() {
    const t = todayISO(); if (t === lastDay) return;
    const wasCurrent = state.month === lastDay.slice(0, 7);
    lastDay = t;
    if (wasCurrent) state.month = t.slice(0, 7);
    if ($("sheet").hidden) { $("f-date").value = t; updateMoreSummary(); }
    renderAll(); runBills();
  }
  // Wallets and debts unfold and fold smoothly. The <details> still holds the open state, so everything that listens for its toggle keeps working.
  function smoothDetails(root) {
    root.addEventListener("click", (ev) => {
      const sum = ev.target.closest("summary");
      if (!sum || sum.parentElement.tagName !== "DETAILS" || reduceMotion()) return;
      ev.preventDefault();
      const d = sum.parentElement, opening = !d.open || !!d._closing, from = d.offsetHeight;
      // a tap mid-way carries on from where things are now, so the content never blinks
      const inner = Array.from(d.children).filter((c) => c !== sum), fadeFrom = inner.map((c) => (d.open ? Number(getComputedStyle(c).opacity) : 0));
      if (d._stop) d._stop();
      d.style.overflow = "hidden";
      d.open = true;
      const to = opening ? d.offsetHeight : sum.offsetHeight + (d.offsetHeight - d.clientHeight);
      // "forwards" holds the end state until the timer below tidies up; without it the row snaps back open for a moment
      const moves = [d.animate({ height: [from + "px", to + "px"] }, { duration: 280, easing: "cubic-bezier(.32, .72, 0, 1)", fill: "forwards" })]
        .concat(inner.map((c, i) => c.animate({ opacity: [fadeFrom[i], opening ? 1 : 0] }, { duration: 280, easing: "ease-out", fill: "forwards" })));
      d._closing = !opening;
      const timer = setTimeout(() => { d._stop(); if (!opening) d.open = false; d.style.overflow = ""; }, 300);
      d._stop = () => { clearTimeout(timer); moves.forEach((m) => m.cancel()); d._stop = null; d._closing = false; };
    });
  }
  // iPhone keyboard: --kb is its height, so an open sheet can sit on top of it instead of behind it
  function watchKeyboard() {
    const vv = window.visualViewport; if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const h = window.innerHeight - vv.height - vv.offsetTop, kb = h > 80 ? Math.round(h) : 0;
      const was = root.classList.contains("kb-open");
      root.style.setProperty("--kb", kb + "px");
      root.classList.toggle("kb-open", kb > 0);
      fitBottomBar();
      const a = document.activeElement;
      if (kb && !was && a && a.closest && a.closest(".sheet")) setTimeout(() => a.scrollIntoView({ block: "nearest" }), 60);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
  }
  function openSheet() {
    lastFocus = document.activeElement;
    const sh = $("sheet");
    sh.style.transform = ""; sh.style.transition = "";
    clearGhosts();
    $("scrim").hidden = false; sh.hidden = false; sh.scrollTop = 0;
    syncSheetLock();
    renderMethodChips();
    renderFavs();
    // On a computer, put the cursor in the amount. On iPhone the keypad would cover the one-tap buttons, so wait for a tap.
    if (!state.editId && window.innerWidth > 640) $("f-amount").focus({ preventScroll: true });
  }
  // Closing: a copy of the sheet slides away while the real one is already closed and reset,
  // so saving, clearing the form and reopening never have to wait for the animation.
  let ghosts = [], ghostTimer = 0;
  function clearGhosts() { clearTimeout(ghostTimer); ghosts.forEach((g) => g.remove()); ghosts = []; }
  function slideAway(sh, withScrim) {
    if (sh.hidden || reduceMotion()) return;
    clearGhosts();
    // a swipe has already carried the sheet off screen, so only the backdrop is left to fade
    if (!sh.style.transform) {
      const cs = getComputedStyle(sh), g = sh.cloneNode(true);
      g.classList.add("sheet-ghost"); g.inert = true;
      g.style.bottom = cs.bottom; g.style.maxHeight = cs.maxHeight;
      document.body.appendChild(g); g.scrollTop = sh.scrollTop;
      ghosts.push(g);
    }
    if (withScrim) { const s = $("scrim").cloneNode(false); s.classList.add("scrim-ghost"); s.removeAttribute("id"); document.body.appendChild(s); ghosts.push(s); }
    ghostTimer = setTimeout(clearGhosts, 300);
  }
  // iPhone: drag the form down to close it, like a native sheet
  function enableSheetSwipe(sheetId, close) {
    const sh = $(sheetId || "sheet"), closeFn = close || closeSheet;
    let sy = null, dy = 0, vy = 0, ly = 0, lt = 0;
    const SPRING = "transform .42s cubic-bezier(.32, .72, 0, 1)";
    sh.addEventListener("touchstart", (e) => {
      if (window.innerWidth > 640 || sh.scrollTop > 0 || e.target.closest("input, select, textarea")) { sy = null; return; }
      sy = ly = e.touches[0].clientY; lt = e.timeStamp; dy = 0; vy = 0; sh.style.transition = "none";
    }, { passive: true });
    sh.addEventListener("touchmove", (e) => {
      if (sy == null) return;
      const y = e.touches[0].clientY;
      if (e.timeStamp > lt) vy = (y - ly) / (e.timeStamp - lt);
      ly = y; lt = e.timeStamp;
      dy = Math.max(0, y - sy);
      sh.style.transform = dy ? "translateY(" + dy + "px)" : "";
      $("scrim").style.opacity = String(Math.max(0.2, 1 - dy / 400));
    }, { passive: true });
    sh.addEventListener("touchend", () => {
      if (sy == null) return;
      sy = null; $("scrim").style.opacity = "";
      // a quick flick down closes it even over a short distance; otherwise it springs back
      if (dy > 110 || (dy > 30 && vy > 0.6)) { sh.style.transition = "transform .22s ease-out"; sh.style.transform = "translateY(100%)"; setTimeout(closeFn, 190); }
      else { sh.style.transition = SPRING; sh.style.transform = ""; }
    });
    // iOS can cancel a touch (a system gesture, a call): spring back instead of staying half-dragged
    sh.addEventListener("touchcancel", () => {
      if (sy == null) return;
      sy = null; sh.style.transition = SPRING; $("scrim").style.opacity = ""; sh.style.transform = "";
    });
  }
  function closeSheet() {
    slideAway($("sheet"), $("dsheet").hidden);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $("sheet").hidden = true; $("sheet").style.transform = ""; $("scrim").style.opacity = "";
    if ($("dsheet").hidden) $("scrim").hidden = true;
    syncSheetLock();
    resetForm();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // ---------- Monthly bills ----------
  let billsBusy = false;
  const billsDone = new Set();
  const billExpense = (b, date) => {
    const rate = state.config.rate;
    const e = { date, amount: b.amount, currency: b.currency, rate, usd: round2(b.currency === "RMB" ? b.amount / rate : b.amount), rmb: round2(b.currency === "RMB" ? b.amount : b.amount * rate),
      cat: b.cat, kind: b.type === "income" ? "income" : catById(b.cat).kind, reason: b.name, method: b.method, note: "", bill: true, billId: b.id, createdAt: Date.now() };
    if (b.type === "income") e.type = "income";
    return e;
  };
  async function runBills() {
    if (!store || !state.loaded || !state.configLoaded || billsBusy || !state.config.bills.length) return;
    const key = curMonth(), today = Number(todayISO().slice(8, 10)), n = daysIn(key);
    const due = state.config.bills.filter((b) => Math.min(b.day, n) <= today && !billsDone.has("bill-" + b.id + "-" + key));
    if (!due.length) return;
    billsBusy = true;
    let added = 0;
    for (const b of due) {
      const id = "bill-" + b.id + "-" + key;
      billsDone.add(id);
      try {
        if (state.expenses.some((e) => e.id === id) || (await store.billRunDone(id))) continue;
        await store.addWithId(id, billExpense(b, key + "-" + pad(Math.min(b.day, n))));
        await store.markBillRun(id);
        added++;
      } catch (e) { billsDone.delete(id); }
    }
    billsBusy = false;
    if (added) toast("Added " + added + " monthly bill" + (added > 1 ? "s" : "") + " for " + monthName(key, { month: "long" }));
  }
  async function saveBills(bills, msg) {
    try { await store.saveConfig({ ...state.config, bills }); state.config = normalizeConfig({ ...state.config, bills }); if (msg) toast(msg); drawBills(); runBills(); return true; }
    catch (e) { toast("Could not save the bill. Try again.", true); return false; }
  }
  function drawBills() {
    const box = $("bills-list"), sel = $("b-cat"), keep = sel.value;
    sel.innerHTML = state.config.categories.map((c) => '<option value="' + esc(c.id) + '">' + esc(c.name) + "</option>").join("");
    sel.value = keep || "utilities";
    if (!sel.value) sel.selectedIndex = 0;
    const ms = $("b-method"), keepM = ms.value;
    ms.innerHTML = allMethods().map((m) => '<option value="' + esc(m) + '">Paid with ' + esc(m) + "</option>").join("");
    ms.value = keepM || DEFAULT_METHOD;
    if (!ms.value) ms.selectedIndex = 0;
    const bills = state.config.bills.slice().sort((a, b) => a.day - b.day);
    box.innerHTML = bills.length ? bills.map((b) => {
      const c = catById(b.cat);
      return '<div class="entry bill-row">' + tile(c) + '<span style="min-width:0"><div class="reason">' + esc(b.name) + '</div><div class="meta"><span>' + esc(c.name) + "</span><span>·</span><span>on the " + ordinal(b.day) + "</span><span>·</span><span>" + esc(b.method) + "</span></div></span>" +
        '<span class="amt bill-amt-col"><span class="main' + (b.type === "income" ? ' inc-amt">+' : '">') + (b.currency === "RMB" ? rmbS(b.amount) : usdS(b.amount)) + '</span><button type="button" class="del-sm" data-bdel="' + esc(b.id) + '" aria-label="Remove ' + esc(b.name) + '">×</button></span></div>';
    }).join("") : '<p class="hint" style="margin:0">No bills yet. Add rent, phone or subscriptions below, or open any entry and tap "Repeat this every month".</p>';
    box.querySelectorAll("[data-bdel]").forEach((b) => (b.onclick = () => {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Remove?"; b.classList.add("armed"); return; }
      saveBills(state.config.bills.filter((x) => x.id !== b.dataset.bdel), "Bill removed. Past entries stay.");
    }));
  }

  // ---------- Favorites ----------
  function favorites() {
    const map = Object.create(null);
    state.expenses.forEach((e) => {
      if (e.bill || isInc(e)) return;
      const r = (e.reason || "").trim(); if (!r) return;
      // "E-bike", "e-bike ride" and "Water" in two sections count as one favorite; the newest one gives the amount and section
      const k = r.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      if (!k) return;
      const f = map[k] || (map[k] = { e, n: 0, last: -1 });
      f.n++;
      if ((e.createdAt || 0) > f.last) { f.last = e.createdAt || 0; f.e = e; }
    });
    const keys = Object.keys(map).sort((a, b) => a.length - b.length);
    keys.forEach((k) => { const base = keys.find((b) => b !== k && b.length >= 4 && k.startsWith(b) && map[b]); if (!base || !map[k]) return; const a = map[base], f = map[k]; a.n += f.n; if (f.last > a.last) { a.last = f.last; a.e = f.e; } delete map[k]; });
    return Object.values(map).filter((f) => f.n >= 2).sort((a, b) => b.n - a.n || b.last - a.last).slice(0, 6).map((f) => f.e);
  }
  function renderFavs() {
    const box = $("favs"), favs = favorites();
    if (!favs.length || state.editId || state.form.type === "income") { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<span class="cap">One tap to add again today</span><div class="chips">' +
      favs.map((e, i) => '<button type="button" class="chip fav" data-i="' + i + '">' + tile(catById(e.cat), "ci") + '<span class="fr">' + esc(e.reason) + "</span><b>" + (e.currency === "RMB" ? rmbS(e.amount) : usdS(e.amount)) + "</b></button>").join("") + "</div>";
    box.querySelectorAll(".fav").forEach((b) => (b.onclick = () => quickAdd(favs[Number(b.dataset.i)], b)));
  }
  async function quickAdd(src, btn) {
    const rate = state.config.rate, cur = src.currency === "USD" ? "USD" : "RMB", amount = Number(src.amount);
    const e = { date: todayISO(), amount, currency: cur, rate, usd: round2(cur === "RMB" ? amount / rate : amount), rmb: round2(cur === "RMB" ? amount : amount * rate),
      cat: src.cat, kind: src.kind || catById(src.cat).kind, reason: src.reason, method: src.method || state.form.method, note: "", createdAt: Date.now() };
    if (btn) btn.disabled = true;
    try {
      const id = await store.add(e);
      state.justAdded = id;
      closeSheet();
      state.month = curMonth();
      toast(savedText(e, id), false, id ? { label: "Undo", fn: async () => { try { await store.remove(id); toast("Removed", true); } catch (err) {} } } : null);
      renderAll(); popSummary();
    } catch (err) { toast("Could not add. Try again.", true); }
    finally { if (btn) btn.disabled = false; }
  }
  function savedText(e, id) {
    if (isInc(e)) return "Income added +" + (e.currency === "RMB" ? rmbS(e.amount) : usdS(e.amount) + " (" + rmb0(e.rmb) + ")");
    let text = "Saved " + (e.currency === "RMB" ? rmbS(e.amount) : usdS(e.amount) + " (" + rmb0(e.rmb) + ")");
    if (isFood(e.cat) && e.date === todayISO() && state.config.foodLimit > 0) {
      const left = state.config.foodLimit - foodOn(e.date) - (state.expenses.some((x) => x.id === id || x.createdAt === e.createdAt) ? 0 : e.rmb);
      text += left >= 0 ? " · " + rmb0(left) + " food left today" : " · " + rmb0(-left) + " over food limit";
    }
    return text;
  }
  function popSummary() { const c = $("summary"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }

  // ---------- Claude in the page (smart entry, receipts, monthly review) ----------
  let sampleFn = null, sampleBlocked = false;
  async function initSample() {
    try { if (window.claude && typeof window.claude.use === "function") sampleFn = await window.claude.use("sample"); } catch (e) { sampleFn = null; }
    if (!sampleFn) return;
    try { const lim = await sampleFn.limits(); if (lim && lim.images) { $("smart-photo").hidden = false; $("smart-file").accept = lim.images.mediaTypes.join(","); } } catch (e) {}
    if (state.view === "report") renderReport();
  }
  const canAsk = () => !!sampleFn && !sampleBlocked;
  function blockIfPermanent(e) { if (e && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) sampleBlocked = true; }

  const KEYWORDS = {
    coffee: ["coffee", "latte", "americano", "cappuccino", "espresso", "milk tea", "boba", "starbucks", "luckin", "咖啡", "奶茶"],
    groceries: ["grocer", "supermarket", "market", "fruit", "vegetable", "veggies", "milk", "eggs", "超市", "菜", "水果"],
    dining: ["lunch", "dinner", "breakfast", "brunch", "restaurant", "meal", "food", "rice", "delivery", "meituan", "eleme", "noodle", "hotpot", "kfc", "mcdonald", "外卖", "饭"],
    transport: ["taxi", "didi", "metro", "subway", "bus", "train", "uber", "gas", "fuel", "parking", "bike", "地铁", "打车", "公交", "高铁"],
    clothing: ["clothes", "shoes", "shirt", "t-shirt", "jacket", "dress", "pants", "jeans", "coat", "socks", "衣服", "鞋"],
    shopping: ["taobao", "jd", "pinduoduo", "amazon", "mall", "bought", "淘宝"],
    health: ["medicine", "doctor", "hospital", "pharmacy", "clinic", "dentist", "vitamin", "药", "医院"],
    utilities: ["phone", "internet", "electric", "electricity", "water bill", "gas bill", "wifi", "mobile", "话费", "电费", "水费"],
    snacks: ["water", "drink", "snack", "chips", "chocolate", "candy", "cola", "coke", "koke", "juice", "soda", "sprite", "suw", "napitik", "kola", "零食", "饮料", "可乐", "水"],
    housing: ["rent", "landlord", "apartment", "property", "房租"],
    fun: ["movie", "cinema", "netflix", "spotify", "game", "ktv", "concert", "subscription", "电影"],
    travel: ["hotel", "flight", "trip", "airbnb", "ticket", "travel", "机票", "酒店"],
    family: ["gift", "present", "parents", "mom", "dad", "red envelope for", "礼物"],
    personal: ["haircut", "salon", "cosmetics", "skincare", "barber", "理发"],
    education: ["book", "course", "class", "tuition", "lesson", "exam", "书", "课"],
    debt: ["loan", "credit card bill", "repay", "huabei", "花呗", "还款"],
    savings: ["deposit", "invest", "fund", "stock", "savings", "基金", "存"]
  };
  const INC_KEYWORDS = {
    salary: ["salary", "wage", "paycheck", "payday", "工资"],
    sidejob: ["freelance", "project payment", "from client", "client paid", "side job", "gig ", "design job", "兼职"],
    bonus: ["bonus", "奖金"],
    gifts_in: ["red envelope", "hongbao", "红包", "gift from", "got a gift"],
    returns: ["dividend", "interest", "investment return", "利息"],
    refund: ["refund", "cashback", "退款"]
  };
  const METHOD_WORDS = [["WeChat Pay", ["wechat", "weixin", "微信"]], ["Alipay", ["alipay", "zhifubao", "支付宝"]], ["Cash", ["cash", "现金"]], ["Credit card", ["credit card", "credit"]], ["Bank transfer", ["transfer", "bank transfer", "转账"]], ["Bank card", ["card", "debit", "银行卡"]]];
  // English words match whole ("cash" is not in "cashew", "bus" is not in "business"); longer ones may be a stem ("grocer" in "groceries")
  const reSafe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordRe = (w, whole) => (/^[\x00-\x7f]+$/.test(w) ? new RegExp("(^|[^a-z])" + reSafe(w.trim()) + (whole || w.trim().length <= 4 ? "(?:s|es)?($|[^a-z])" : ""), "i") : new RegExp(reSafe(w)));
  const hasWord = (s, w, whole) => wordRe(w, whole).test(s);
  function localParse(rawText) {
    const text = normNum(rawText);
    const s = " " + text.toLowerCase() + " ";
    const out = { amount: amountInText(text) };
    out.currency = /\$|usd|dollar|美元|美金/.test(s) ? "USD" : "RMB";
    out.method = null;
    for (const [name, words] of METHOD_WORDS) if (words.some((w) => hasWord(s, w, true))) { out.method = name; break; }
    const d = new Date();
    if (/day before yesterday|前天/.test(s)) d.setDate(d.getDate() - 2);
    else if (/yesterday|昨天/.test(s)) d.setDate(d.getDate() - 1);
    out.date = isoOf(d);
    const incHit = Object.entries(INC_KEYWORDS).find(([, ws]) => ws.some((w) => hasWord(s, w)));
    out.type = incHit || /\b(got paid|received|income|earned)\b|收入|收到/.test(s) ? "income" : "expense";
    let reason = text.replace(NUM_RE(), " ").replace(/[¥$]|\b(rmb|cny|yuan|usd|dollars?|kuai)\b/gi, " ")
      .replace(/\b(day before yesterday|yesterday|today|got paid|got|received|via|with|by|paid|on|for)\b|前天|昨天|今天/gi, " ");
    METHOD_WORDS.forEach(([, ws]) => ws.forEach((w) => { const re = wordRe(w, true); reason = reason.replace(new RegExp(re.source, "gi"), (m, a, b) => (a || "") + " " + (b || "")); }));
    reason = reason.replace(/\s+/g, " ").trim();
    out.reason = reason ? reason.charAt(0).toUpperCase() + reason.slice(1) : "";
    if (out.type === "income") { out.cat = incHit ? incHit[0] : "income_other"; return out; }
    // known words first (water goes to Snacks & Drinks), then your own past entries: the section you used most for those words
    const kw = Object.entries(KEYWORDS).find(([, ws]) => ws.some((w) => hasWord(s, w)));
    if (kw && state.config.categories.some((c) => c.id === kw[0])) { out.cat = kw[0]; return out; }
    const words = out.reason.toLowerCase().split(/[\s,.\-]+/).filter((w) => w.length > 2);
    const score = {};
    state.expenses.forEach((e) => {
      if (isInc(e) || !e.reason) return;
      const r = e.reason.toLowerCase(), hit = words.filter((w) => r.includes(w)).length;
      if (!hit) return;
      const k = e.cat, sc = (score[k] = score[k] || { pts: 0, kind: e.kind, at: 0 });
      sc.pts += hit + (r.trim() === out.reason.toLowerCase() ? 3 : 0);
      if ((e.createdAt || 0) > sc.at) { sc.at = e.createdAt || 0; sc.kind = e.kind; }
    });
    const best = Object.entries(score).sort((a, b) => b[1].pts - a[1].pts || b[1].at - a[1].at)[0];
    if (best) { out.cat = best[0]; out.kind = best[1].kind; return out; }
    out.cat = "other";
    return out;
  }
  function smartPrompt(text, receipt) {
    const wd = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return "You turn a short note about money into one record for a personal finance app.\n" +
      "Today is " + todayISO() + " (" + wd + "). Exchange rate: 1 USD = " + state.config.rate + " CNY.\n\n" +
      "Expense sections (id = name):\n" + state.config.categories.map((c) => c.id + " = " + c.name).join("\n") + "\n\n" +
      "Income sources (id = name):\n" + state.config.incomeCats.map((c) => c.id + " = " + c.name).join("\n") + "\n\n" +
      "Payment methods (use exactly one of these or null): " + allMethods().join(", ") + "\n\n" +
      "Rules: amounts without a currency are CNY (yuan, ¥, 元, 块, kuai). Use USD only for $, dollar, usd, 美元. Relative dates (yesterday, Monday, 3 days ago) become YYYY-MM-DD before or on today; default today. " +
      'type is "income" only for money received (salary, paid for a job, gift or red envelope received, refund, interest); otherwise "expense". ' +
      'For expenses, kind is "need", "want" or "save" (save only for savings or investing). reason is a short natural description of what it was or why, 2 to 6 words, in the same language as the note, without the amount or payment method. ' +
      "If unsure of the section, use other (or income_other for income).\n\n" +
      (receipt ? "The image is a receipt or a payment screenshot (for example WeChat Pay or Alipay). Read the total actually paid, the shop or item as the reason, the date if shown, and the payment app if visible.\n\n" : "") +
      'Reply with only JSON like {"type":"expense","amount":38,"currency":"RMB","cat":"dining","kind":"want","reason":"Lunch noodles","method":"WeChat Pay","date":"' + todayISO() + '"}.\n\n' +
      "Note: " + (text || "(no note, use the image)");
  }
  function applySmart(o) {
    if (!o || typeof o !== "object") return false;
    const type = o.type === "income" ? "income" : "expense";
    if (state.form.type !== type) setType(type);
    const amount = Number(o.amount);
    if (amount > 0) $("f-amount").value = round2(amount);
    setCurrency(String(o.currency || "").toUpperCase() === "USD" ? "USD" : "RMB");
    const list = type === "income" ? state.config.incomeCats : state.config.categories;
    const cat = list.find((c) => c.id === String(o.cat)) || list.find((c) => c.id === (type === "income" ? "income_other" : "other"));
    if (cat) pickCat(cat.id);
    if (type === "expense" && KIND_LABEL[o.kind]) setKind(o.kind, false);
    if (o.reason) $("f-reason").value = String(o.reason).slice(0, 120);
    const method = allMethods().find((mm) => mm.toLowerCase() === String(o.method || "").toLowerCase());
    state.form.method = method || state.form.method || DEFAULT_METHOD; renderMethodChips();
    const date = String(o.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date <= todayISO()) { $("f-date").value = date; if (date !== todayISO()) $("more").open = true; }
    updateMoreSummary(); renderConvert();
    return amount > 0;
  }
  async function smartFill(file) {
    const text = $("smart-in").value.trim(), msg = $("smart-msg");
    if (!text && !file) { msg.className = "smart-msg err"; msg.textContent = "Type something like: coffee 28 wechat"; return; }
    msg.className = "smart-msg"; msg.textContent = file ? "Reading the receipt…" : "Filling in…";
    $("smart-go").disabled = true;
    let ok = false, used = "local";
    if (canAsk()) {
      try {
        const o = await sampleFn.json(smartPrompt(text, !!file), file ? { images: file } : { modelTier: "quick" });
        ok = applySmart(o); used = "claude";
      } catch (e) {
        blockIfPermanent(e);
        if (file) { msg.className = "smart-msg err"; msg.textContent = e && e.code === "image_rejected" ? "That photo could not be read. Try a clearer picture." : "Could not read the receipt right now. Type it instead."; $("smart-go").disabled = false; return; }
      }
    } else if (file) { msg.className = "smart-msg err"; msg.textContent = "Reading photos needs Claude, which is not available here."; $("smart-go").disabled = false; return; }
    if (!ok && used === "local") ok = applySmart(localParse(text));
    $("smart-go").disabled = false;
    msg.className = "smart-msg " + (ok ? "ok" : "err");
    msg.textContent = ok ? "Filled in. Check it and tap Save." : "I could not find an amount. Add a number, like: taxi 45";
  }

  // ---------- Add form ----------
  function setType(t) {
    const inc = t === "income";
    state.form.type = inc ? "income" : "expense";
    $("f-type").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.type === state.form.type)));
    $("form-title").textContent = (state.editId ? "Edit " : "Add ") + (inc ? "income" : "expense");
    $("l-cats").textContent = inc ? "Source" : "What for";
    $("l-reason").textContent = inc ? "Details" : "Why";
    $("f-reason").placeholder = inc ? "e.g. freelance logo design" : "e.g. lunch with colleagues";
    $("l-method").textContent = inc ? "Received in" : "Paid with";
    $("kind-field").hidden = inc;
    state.form.cat = null;
    renderCatChips(); renderMethodChips(); renderFavs(); updateMoreSummary();
    $("f-msg").textContent = "";
    updateShopWarn();
  }
  function renderCatChips() {
    const box = $("f-cats");
    const cats = state.form.type === "income" ? state.config.incomeCats : state.config.categories;
    box.innerHTML = cats.map((c) =>
      '<button type="button" class="chip" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.form.cat === c.id) + '">' + tile(c, "ci") + esc(c.name) + "</button>").join("");
    box.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { pickCat(b.dataset.cat); softly(b, "chip-picked"); }));
  }
  // plays a one-time effect on a tap; it is removed afterwards so it does not replay when the form opens again
  const softly = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); el.addEventListener("animationend", () => el.classList.remove(cls), { once: true }); };
  function renderMethodChips() {
    const box = $("f-method");
    box.innerHTML = allMethods().map((m) => '<button type="button" class="chip plain" data-m="' + esc(m) + '" aria-pressed="' + (state.form.method === m) + '">' + esc(m) + "</button>").join("");
    box.querySelectorAll(".chip").forEach((b) => (b.onclick = () => {
      state.form.method = b.dataset.m;
      // same buttons, so the colours can ease across instead of jumping
      box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      renderMethodHint();
      softly(b, "chip-picked"); softly($("f-method-hint"), "hint-in");
    }));
    renderMethodHint();
  }
  function renderMethodHint() {
    const box = $("f-method");
    // say which wallet this changes, or warn that it changes none
    let hint = $("f-method-hint");
    if (!hint) { hint = document.createElement("span"); hint.id = "f-method-hint"; hint.className = "hint"; box.after(hint); }
    const ws = state.config.wallets || [];
    if (!ws.length) { hint.textContent = ""; hint.hidden = true; return; }
    const w = walletOf(state.form.method), inc = state.form.type === "income";
    hint.hidden = false;
    hint.innerHTML = w ? (inc ? "Adds to your <b>" : "Comes out of your <b>") + esc(w.name) + "</b> wallet."
      : '<span class="up">Not linked to a wallet</span>, so no wallet changes. Pick ' + esc(ws.map((x) => x.methods[0]).filter(Boolean).slice(0, 3).join(" / ")) + " if the money " + (inc ? "came into" : "left") + " one.";
  }
  function pickCat(id) {
    state.form.cat = id;
    $("f-cats").querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === id)));
    if (state.form.type !== "income" && !state.form.kindTouched) setKind(catById(id).kind, false);
    const seen = Object.create(null);
    state.expenses.filter((e) => e.cat === id && e.reason).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .forEach((e) => { const k = e.reason.trim(); if (k && !seen[k.toLowerCase()]) seen[k.toLowerCase()] = k; });
    $("reason-suggest").innerHTML = Object.values(seen).slice(0, 12).map((r) => '<option value="' + esc(r) + '"></option>').join("");
    $("f-msg").textContent = "";
    updateShopWarn();
  }
  function setKind(k, touched) {
    state.form.kind = k;
    if (touched) state.form.kindTouched = true;
    $("f-kind").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === k)));
    updateMoreSummary();
  }
  function updateMoreSummary() {
    const d = $("f-date").value;
    $("more-sum").textContent = (d && d !== todayISO() ? dayLabel(d) : "Today") + (state.form.type === "income" ? "" : " · " + KIND_LABEL[state.form.kind]) + ($("f-note").value.trim() ? " · note" : "");
  }
  // Yuan is the default for every new entry; $ applies only to the entry you are typing.
  function setCurrency(cur) {
    state.form.currency = cur;
    document.querySelectorAll(".cur-toggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === cur)));
    renderConvert();
  }
  function currentRate() {
    if (state.editId) { const e = state.expenses.find((x) => x.id === state.editId); if (e && e.rate) return e.rate; }
    return state.config.rate;
  }
  function renderConvert() {
    const n = parseAmt($("f-amount").value), rate = currentRate(), el = $("f-convert");
    const r = "¥" + rate.toFixed(2) + " = $1";
    if (!(n > 0)) { el.textContent = (state.form.currency === "RMB" ? "Amount in yuan." : "Amount in dollars.") + " " + r; updateShopWarn(); return; }
    el.innerHTML = "= <strong>" + (state.form.currency === "RMB" ? usd(n / rate) : rmb(n * rate)) + "</strong> · " + r;
    updateShopWarn();
  }
  function resetForm() {
    state.editId = null; state.form.cat = null; state.form.kindTouched = false; state.form.fromLater = null;
    $("f-amount").value = ""; $("f-reason").value = ""; $("f-note").value = "";
    $("f-date").value = todayISO();
    setKind("need", false);
    setType("expense");
    setCurrency("RMB");
    state.form.method = DEFAULT_METHOD;
    $("smart").hidden = false; $("smart-in").value = ""; $("smart-msg").textContent = ""; $("smart-file").value = "";
    $("f-delete").hidden = true; $("f-repeat").hidden = true;
    $("f-submit").classList.remove("saved"); $("f-submit").textContent = "Save";
    $("more").open = false;
    $("f-msg").textContent = "";
    disarmDelete();
    renderConvert();
  }
  // red dot on the Limits tab: a limit is over, or something on the waiting list is due
  function renderLimitsDot() {
    const dot = $("limits-dot"); if (!dot) return;
    const over = (state.config.limits || []).some((l) => limSpent(l, todayISO()) > l.amount);
    const due = (state.config.later || []).some((x) => x.forMonth && x.forMonth <= curMonth());
    dot.hidden = !(over || due);
  }
  const dayShort = (iso) => new Date(iso + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  function limitFormHTML() {
    const ed = state.limEdit, l = ed.id ? (state.config.limits || []).find((x) => x.id === ed.id) : null;
    const cats = state.config.categories.filter((c) => c.kind !== "save");
    return '<div class="card stack lim-form" id="lim-form"><div class="head"><h2>' + (l ? "Edit limit" : "New limit") + "</h2></div>" +
      '<div class="field"><label>Which sections?</label><div class="chips" id="lf-cats">' + cats.map((c) => '<button type="button" class="chip" data-lcat="' + esc(c.id) + '" aria-pressed="' + ed.cats.includes(c.id) + '">' + tile(c, "ci") + esc(c.name) + "</button>").join("") + "</div></div>" +
      '<div class="lf-row"><div class="field"><label for="lf-amount">Limit, ¥</label><input class="input" id="lf-amount" inputmode="decimal" placeholder="e.g. 300" value="' + esc(ed.amount || "") + '"></div>' +
      '<div class="field"><label>Every</label><div class="seg" id="lf-period" role="group"><button type="button" data-lp="week" aria-pressed="' + (ed.period === "week") + '">Week</button><button type="button" data-lp="month" aria-pressed="' + (ed.period !== "week") + '">Month</button></div></div></div>' +
      '<div class="field"><label for="lf-name">Name <span class="muted">(optional)</span></label><input class="input" id="lf-name" maxlength="40" placeholder="' + esc(ed.cats.length ? listJoin(ed.cats.map((id) => catById(id).name)) : "e.g. Shopping") + '" value="' + esc(ed.name || "") + '"></div>' +
      '<div class="form-msg" id="lf-msg"></div>' +
      '<div class="lf-btns"><button type="button" class="btn primary" id="lf-save">' + (l ? "Save changes" : "Add limit") + '</button><button type="button" class="btn" id="lf-cancel">Cancel</button>' + (l ? '<button type="button" class="btn danger" id="lf-del">Delete</button>' : "") + "</div></div>";
  }
  // Past 90% a limit's bar turns red; it pulses once per limit period, the first time you see it, then just stays red
  const limPulsed = new Set();
  let limRingOff = null;
  function limitCardHTML(l) {
    const today = todayISO(), r = limRange(l, today), sp = limSpent(l, today), over = sp > l.amount, near = !over && sp >= l.amount * 0.8;
    const hot = !over && sp >= l.amount * 0.9, hotKey = l.id + "|" + r.start, pulse = hot && !limPulsed.has(hotKey);
    if (pulse) limPulsed.add(hotKey);
    const left = Math.round((new Date(r.end + "T12:00") - new Date(today + "T12:00")) / 864e5);
    const items = limEntries(l, today).sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : (b.createdAt || 0) - (a.createdAt || 0)));
    const c0 = catById(l.cats[0]), next = l.period === "week" ? dayShort(addDays(r.end, 1)) : monthName(shiftMonth(today.slice(0, 7), 1), { month: "long" }) + " 1";
    return '<div class="card stack lim-card"><div class="lim-head">' + tile(c0, "tile sm") + '<span class="lh-t"><b>' + esc(limName(l)) + "</b><small>Every " + limWord(l) + " · " + esc(listJoin(l.cats.map((id) => catById(id).name))) + '</small></span><button type="button" class="btn small" data-lim-edit="' + esc(l.id) + '">Edit</button></div>' +
      '<div><div class="lim-big' + (over ? " up" : "") + '">' + rmb0(sp) + " <small>of " + rmb0(l.amount) + "</small></div>" +
      '<div class="lim-usd">' + usd(sp / state.config.rate) + " of " + usd(l.amount / state.config.rate) + "</div>" +
      '<div class="track" style="margin-top:10px"><div class="fill' + (over ? " over" : hot ? " hot" + (pulse ? " pulse" : "") : near ? " warn" : "") + '" style="width:' + Math.min((sp / l.amount) * 100, 100) + '%"></div></div>' +
      '<div class="lim-row"><span class="' + (over ? "up" : near ? "warn-t" : "down") + '" style="font-weight:800">' + (over ? rmb0(sp - l.amount) + " over" : rmb0(l.amount - sp) + " left") + ' <span class="lim-usd-s">' + usd(Math.abs(l.amount - sp) / state.config.rate) + '</span></span><span class="muted">' + esc(dayShort(r.start) + " – " + dayShort(r.end)) + " · " + (left === 0 ? "last day" : left + (left === 1 ? " day" : " days") + " to go") + "</span></div></div>" +
      (over ? '<div class="lim-note">You have used this ' + limWord(l) + "'s money for " + esc(limName(l).toLowerCase()) + ". If something is not urgent, wait until <b>" + esc(next) + "</b>" + (l.period === "month" ? " or put it on the waiting list" : "") + ".</div>" : near ? '<div class="lim-note">Almost at the limit. Only ' + rmb0(l.amount - sp) + " left this " + limWord(l) + ".</div>" : "") +
      (items.length ? '<div class="lim-items"><div class="hint" style="margin-bottom:2px">' + items.length + (items.length === 1 ? " entry" : " entries") + " this " + limWord(l) + '</div><div class="entries where-entries wk lim-ent">' + items.slice(0, 4).map((e) => entryHTML(e, "week")).join("") + "</div>" +
        (items.length > 4 ? '<details class="lim-more"><summary>Show ' + (items.length - 4) + " more</summary>" + '<div class="entries where-entries wk lim-ent">' + items.slice(4).map((e) => entryHTML(e, "week")).join("") + "</div></details>" : "") + "</div>" : '<p class="hint" style="margin:0">Nothing spent on this yet this ' + limWord(l) + ".</p>") + "</div>";
  }
  function renderLimits() {
    const el = $("v-limits"), key = curMonth(), today = todayISO();
    let html = "";
    // 1. Food today, with the last 7 days by date
    const fl = state.config.foodLimit;
    if (fl > 0) {
      const f = foodOn(today), over = f > fl, ratio = Math.min(f / fl, 1), Rr = 38, C = 2 * Math.PI * Rr, cls = over ? "over" : ratio >= 0.8 ? "warn" : "";
      const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ d, v: foodOn(d) }));
      const logged = days.filter((x) => state.expenses.some((e) => e.date === x.d)), okDays = logged.filter((x) => x.v <= fl).length;
      html += '<div class="card stack"><div class="head"><h2>Food today</h2><span class="hint">' + esc(listJoin(state.config.foodCats.map((id) => catById(id).name))) + "</span></div>" +
        '<div class="lim-top"><div class="ring ' + cls + '"><svg viewBox="0 0 92 92" aria-hidden="true"><circle class="bg" cx="46" cy="46" r="' + Rr + '" fill="none" stroke-width="9"/><circle class="fg" cx="46" cy="46" r="' + Rr + '" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - ratio)).toFixed(2) + '"/></svg><div class="center"><div class="v" data-v="' + Math.abs(fl - f) + '">' + rmb0(Math.abs(fl - f)) + '</div><div class="s">' + (over ? "over" : "left") + "</div></div></div>" +
        '<div><div class="lim-big' + (over ? " up" : "") + '">' + rmb0(f) + ' <small>of ' + rmb0(fl) + '</small></div><div class="lim-usd">' + usd(f / state.config.rate) + " of " + usd(fl / state.config.rate) + '</div><div class="hint">' + esc(dayShort(today)) + " · " + (over ? "over by " + rmb0(f - fl) + ". It starts fresh tomorrow." : "starts fresh every day.") + "</div></div></div>" +
        '<div class="lim-days">' + days.map((x) => { const p = Math.min(x.v / fl, 1.25) / 1.25 * 100, dt = new Date(x.d + "T12:00"); return '<div class="ld' + (x.v > fl ? " over" : "") + (x.d === today ? " now" : "") + '" title="' + esc(dayShort(x.d) + ": " + rmb0(x.v)) + '"><span class="ld-v">' + (x.v > 0 ? compactRmb(x.v) : "") + '</span><span class="ld-b"><i style="height:' + p + '%"></i><em style="bottom:' + (100 / 1.25) + '%"></em></span><span class="ld-l">' + esc(dt.toLocaleDateString("en-US", { weekday: "short" })) + "<b>" + dt.getDate() + "</b></span></div>"; }).join("") + "</div>" +
        (logged.length ? '<p class="hint" style="margin:0">' + esc(dayShort(days[0].d)) + " – " + esc(dayShort(today)) + ": under the limit on <b>" + okDays + " of " + logged.length + "</b> days you logged.</p>" : "") + "</div>";
    }
    // 2. Your limits
    const lims = state.config.limits || [];
    if (state.limEdit && state.limEdit.id && !lims.some((x) => x.id === state.limEdit.id)) state.limEdit = null;
    html += '<div class="lim-sec"><h2>Your limits</h2>' + (state.limEdit ? "" : '<button type="button" class="btn small primary" id="lim-add">+ Add a limit</button>') + "</div>";
    if (state.limEdit && !state.limEdit.id) html += limitFormHTML();
    lims.forEach((l) => { html += state.limEdit && state.limEdit.id === l.id ? limitFormHTML() : limitCardHTML(l); });
    if (!lims.length && !state.limEdit) html += '<div class="card empty-state">' + emptyArt("gauge") + '<h3>No limits yet</h3>Add one for any section, for example Shopping ¥300 a month or Health ¥100 a week. The app warns you before you go over.</div>';
    // 3. Waiting list
    const lat = state.config.later || [];
    const due = lat.filter((x) => x.forMonth && x.forMonth <= key), wait = lat.filter((x) => !(x.forMonth && x.forMonth <= key));
    const rowL = (x) => { const c = catById(x.cat); return '<div class="later-row">' + tile(c, "ci") + '<span class="lr-t"><b>' + esc(x.reason || c.name) + "</b><small>" + esc(c.name) + " · added " + esc(dayShort(isoOf(new Date(x.addedAt || Date.now())))) + '</small></span><span class="lr-a">' + (x.currency === "USD" ? usdS(x.amount) : rmbS(x.amount)) + '</span><span class="lr-b"><button type="button" class="btn small primary" data-later-buy="' + esc(x.id) + '">Buy</button><button type="button" class="btn small" data-later-del="' + esc(x.id) + '">Remove</button></span></div>'; };
    html += '<div class="card stack"><div class="head"><h2>Waiting list</h2><span class="hint">' + (lat.length ? rmb0(lat.reduce((a, x) => a + laterRmb(x), 0)) + " · not counted as spent" : "things you decided to buy later") + "</span></div>" +
      (due.length ? '<div class="later-h"><b>From last month</b><span class="muted">Do you still need them?</span></div>' + due.map(rowL).join("") : "") +
      (wait.length ? '<div class="later-h"><b>For ' + esc(monthName(wait[0].forMonth || shiftMonth(key, 1), { month: "long" })) + " 1 and after</b></div>" + wait.map(rowL).join("") : "") +
      (!lat.length ? '<p class="hint" style="margin:0">When a buy would go over a monthly limit, the add form offers <b>Wait for next month</b>. It lands here, and on the 1st you decide if you still need it.</p>' : "") + "</div>";
    html += '<button type="button" class="link-btn" id="lim-settings" style="align-self:center">Change the daily food limit in Settings →</button>';
    el.innerHTML = html;
    // the food ring sweeps to today's level and its number counts up with it
    const rfg = el.querySelector(".lim-top .ring .fg");
    if (rfg) {
      const to = Number(rfg.getAttribute("stroke-dashoffset")), from = limRingOff == null ? Number(rfg.getAttribute("stroke-dasharray")) : limRingOff;
      limRingOff = to;
      if (!reduceMotion() && Math.abs(from - to) > 0.5) requestAnimationFrame(() => {
        rfg.style.transition = "none"; rfg.style.strokeDashoffset = from; void rfg.getBoundingClientRect();
        requestAnimationFrame(() => { rfg.style.transition = ""; rfg.style.strokeDashoffset = to; });
      });
      const rv = el.querySelector(".lim-top .ring .v"); if (rv) countUp(rv, "lim-ring", Number(rv.dataset.v), rmb0);
    }
    el.querySelectorAll("[data-later-buy]").forEach((b) => (b.onclick = () => buyLater(b.dataset.laterBuy)));
    el.querySelectorAll("[data-later-del]").forEach((b) => (b.onclick = () => removeLater(b.dataset.laterDel)));
    bindEntries(el);
    $("lim-settings").onclick = () => setView("settings");
    const add = $("lim-add"); if (add) add.onclick = () => { state.limEdit = { id: null, cats: [], amount: "", period: "month", name: "" }; renderLimits(); $("lim-form").scrollIntoView({ block: "start", behavior: "smooth" }); };
    el.querySelectorAll("[data-lim-edit]").forEach((b) => (b.onclick = () => { const l = lims.find((x) => x.id === b.dataset.limEdit); state.limEdit = { id: l.id, cats: l.cats.slice(), amount: l.amount, period: l.period, name: l.name }; renderLimits(); $("lim-form").scrollIntoView({ block: "center", behavior: "smooth" }); }));
    if (state.limEdit) bindLimitForm();
  }
  function bindLimitForm() {
    const ed = state.limEdit, keep = () => { ed.amount = $("lf-amount").value; ed.name = $("lf-name").value; };
    $("lf-cats").querySelectorAll("[data-lcat]").forEach((b) => (b.onclick = () => { keep(); const id = b.dataset.lcat; ed.cats = ed.cats.includes(id) ? ed.cats.filter((x) => x !== id) : ed.cats.concat([id]); b.setAttribute("aria-pressed", String(ed.cats.includes(id))); $("lf-name").placeholder = ed.cats.length ? listJoin(ed.cats.map((x) => catById(x).name)) : "e.g. Shopping"; }));
    $("lf-period").querySelectorAll("[data-lp]").forEach((b) => (b.onclick = () => { ed.period = b.dataset.lp; $("lf-period").querySelectorAll("[data-lp]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
    $("lf-cancel").onclick = () => { state.limEdit = null; renderLimits(); };
    const save = async () => {
      keep();
      const amount = parseAmt(ed.amount);
      if (!ed.cats.length) { $("lf-msg").textContent = "Pick at least one section."; return; }
      if (!(round2(amount) > 0)) { $("lf-msg").textContent = "Enter the limit amount."; $("lf-amount").focus(); return; }
      const before = (state.config.limits || []).map((x) => ({ ...x, cats: x.cats.slice() }));
      const item = { id: ed.id || "lim" + uid(), name: String(ed.name || "").trim(), cats: ed.cats.slice(), amount: round2(amount), period: ed.period === "week" ? "week" : "month" };
      const list = ed.id ? before.map((x) => (x.id === ed.id ? item : x)) : before.concat([item]);
      state.limEdit = null;
      try { await store.saveConfig({ ...state.config, limits: list }); state.config = normalizeConfig({ ...state.config, limits: list }); renderAll(); toast(ed.id ? "Limit updated" : limName(item) + " limit added: " + rmb0(item.amount) + " a " + limWord(item)); }
      catch (e) { state.limEdit = ed; renderLimits(); const m = $("lf-msg"); if (m) m.textContent = "Could not save. Try again."; }
    };
    $("lf-save").onclick = save;
    ["lf-amount", "lf-name"].forEach((id) => $(id).addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); save(); } }));
    const del = $("lf-del");
    if (del) del.onclick = async () => {
      if (!del.classList.contains("armed")) { del.classList.add("armed"); del.textContent = "Tap again to delete"; return; }
      const before = (state.config.limits || []).slice(), list = before.filter((x) => x.id !== ed.id);
      state.limEdit = null;
      try { await store.saveConfig({ ...state.config, limits: list }); state.config = normalizeConfig({ ...state.config, limits: list }); renderAll(); toast("Limit deleted", false, { label: "Undo", fn: async () => { try { await store.saveConfig({ ...state.config, limits: before }); state.config = normalizeConfig({ ...state.config, limits: before }); renderAll(); } catch (err) {} } }); }
      catch (e) { toast("Could not delete. Try again.", true); }
    };
  }
  async function saveLater(list, msg, undoList) {
    try { await store.saveConfig({ ...state.config, later: list }); state.config = normalizeConfig({ ...state.config, later: list }); renderAll(); toast(msg, false, undoList ? { label: "Undo", fn: () => saveLater(undoList, "Undone") } : null); return true; }
    catch (e) { toast("Could not save. Try again.", true); return false; }
  }
  // Buy: open the add form already filled in; the item leaves the list once the expense is saved
  function buyLater(id) {
    const x = (state.config.later || []).find((l) => l.id === id); if (!x) return;
    resetForm();
    state.form.fromLater = id;
    setCurrency(x.currency);
    $("f-amount").value = x.amount; $("f-reason").value = x.reason;
    if (state.config.categories.some((c) => c.id === x.cat)) pickCat(x.cat);
    state.form.method = allMethods().includes(x.method) ? x.method : DEFAULT_METHOD;
    $("smart").hidden = true;
    renderConvert();
    openSheet();
  }
  function removeLater(id) {
    const before = (state.config.later || []).slice(), x = before.find((l) => l.id === id);
    saveLater(before.filter((l) => l.id !== id), "Removed " + (x && x.reason ? "“" + x.reason + "”" : "it") + " from the waiting list", before);
  }
  // live warning in the add form when an entry would pass one of your limits
  function updateShopWarn() {
    const box = $("f-shop"); if (!box) return;
    const n = parseAmt($("f-amount").value), btn = $("f-submit"), base = state.editId ? "Save changes" : "Save";
    const lims = (state.config.limits || []).filter((l) => state.form.cat && l.cats.includes(state.form.cat));
    if (!lims.length || state.form.type === "income" || !(n > 0)) { box.hidden = true; btn.textContent = base; return; }
    const date = $("f-date").value || todayISO(), amt = state.form.currency === "USD" ? n * currentRate() : n;
    const orig = state.editId ? state.expenses.find((x) => x.id === state.editId) : null;
    // the limit this entry pushes furthest
    const rows = lims.map((l) => { const before = limSpent(l, date, state.editId), r = limRange(l, date); const same = orig && l.cats.includes(orig.cat) && orig.date >= r.start && orig.date <= r.end && amt <= R(orig) + 0.005; return { l, before, after: before + amt, same, r }; })
      .filter((x) => !x.same).sort((a, b) => b.after / b.l.amount - a.after / a.l.amount);
    const w = rows[0];
    if (!w) { box.hidden = true; btn.textContent = base; return; }
    const { l, before, after } = w, word = limWord(l), nm = limName(l);
    const canWait = !state.editId && l.period === "month" && date.slice(0, 7) === curMonth();
    if (after > l.amount) {
      box.hidden = false; box.className = "shop-warn over";
      box.innerHTML = "<div><b>Over your " + esc(nm) + " limit.</b> " + (before > l.amount ? "You have already spent " + rmb0(before) + " of your " + rmb0(l.amount) + " this " + word + "." : "You have " + rmb0(Math.max(0, l.amount - before)) + " left of your " + rmb0(l.amount) + " this " + word + ".") +
        " This makes it " + rmb0(after) + ", <b>" + rmb0(after - l.amount) + " over</b>." + (canWait ? " If it is not urgent, wait until next month." : l.period === "week" ? " If it is not urgent, wait until " + esc(dayShort(addDays(w.r.end, 1))) + "." : "") + "</div>" +
        (canWait ? '<button type="button" class="btn" id="f-later">Wait for next month</button>' : "");
      btn.textContent = state.editId ? "Save changes anyway" : "Save anyway";
      const fl = $("f-later"); if (fl) fl.onclick = waitForNextMonth;
    } else if (after >= l.amount * 0.8) {
      box.hidden = false; box.className = "shop-warn near";
      box.innerHTML = "<div>After this, <b>" + rmb0(l.amount - after) + "</b> left of your " + rmb0(l.amount) + " " + esc(nm) + " limit this " + word + ".</div>";
      btn.textContent = base;
    } else { box.hidden = true; btn.textContent = base; }
  }
  async function waitForNextMonth() {
    const n = parseAmt($("f-amount").value);
    if (!(round2(n) > 0)) { $("f-msg").textContent = "Enter the amount first."; return; }
    const next = shiftMonth(curMonth(), 1), before = (state.config.later || []).slice();
    const item = { id: "l" + uid(), reason: $("f-reason").value.trim(), amount: round2(n), currency: state.form.currency, cat: state.form.cat, method: state.form.method, addedAt: Date.now(), forMonth: next };
    closeSheet();
    await saveLater(before.concat([item]), "Saved for " + monthName(next, { month: "long" }) + ". Not counted as spent", before);
  }
  function startEdit(id) {
    const e = state.expenses.find((x) => x.id === id);
    if (!e) return;
    resetForm();
    state.editId = id;
    $("smart").hidden = true;
    setType(isInc(e) ? "income" : "expense");
    setCurrency(e.currency === "USD" ? "USD" : "RMB");
    $("f-amount").value = e.amount;
    $("f-date").value = e.date;
    $("f-reason").value = e.reason || "";
    $("f-note").value = e.note || "";
    state.form.method = allMethods().includes(e.method) ? e.method : "Other"; renderMethodChips();
    pickCat(e.cat);
    if (!isInc(e)) setKind(e.kind || "want", true);
    $("f-delete").hidden = false;
    $("f-repeat").hidden = !!e.bill || state.config.bills.some((b) => b.cat === e.cat && b.name.toLowerCase() === (e.reason || "").trim().toLowerCase());
    $("f-submit").textContent = "Save changes";
    renderConvert();
    openSheet();
  }
  // Deleting an entry (from the sheet, or by swiping its row) always offers Undo, and the restored row slides back in.
  // With `rethrow` a failure goes back to the caller (the sheet shows its own message); otherwise it shows a toast.
  async function deleteEntry(id, rethrow) {
    const old = state.expenses.find((x) => x.id === id);
    const data = old ? Object.fromEntries(Object.entries(old).filter(([k]) => k !== "id")) : null;
    try {
      await store.remove(id);
      toast("Deleted", false, data ? { label: "Undo", fn: async () => { try { state.justAdded = id; await store.addWithId(id, data); toast("Restored"); } catch (err) { toast("Could not restore.", true); } } } : null);
    } catch (e) {
      if (rethrow) throw e;
      toast("Could not delete. Try again.", true);
      renderAll();
    }
  }
  let delTimer = null;
  function disarmDelete() { const d = $("f-delete"); d.classList.remove("armed"); d.textContent = "Delete"; clearTimeout(delTimer); }

  // A wrong amount shakes; a saved entry turns the Save button into a check for a moment before the sheet leaves
  function shakeAmount() {
    const l = $("f-amount").closest(".amount-line"); if (!l) return;
    l.classList.remove("bad"); void l.offsetWidth; l.classList.add("bad");
    setTimeout(() => l.classList.remove("bad"), 700);
  }
  async function savedCheck(btn) {
    if (reduceMotion()) return;
    btn.classList.add("saved");
    btn.innerHTML = '<svg class="save-check" viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    await wait(300);
  }
  async function submitForm(ev) {
    ev.preventDefault();
    const msg = $("f-msg");
    const amount = parseAmt($("f-amount").value);
    const income = state.form.type === "income";
    if (!(round2(amount) > 0)) { msg.textContent = income ? "Enter how much you received." : "Enter how much you spent."; shakeAmount(); $("f-amount").focus(); return; }
    if (!state.form.cat) { msg.textContent = income ? "Pick where the money came from." : "Pick what it was for."; return; }
    const date = $("f-date").value || todayISO();
    if (!saneDate(date)) { $("more").open = true; msg.textContent = "Check the date. The year looks wrong."; return; }
    const existing = state.editId ? state.expenses.find((x) => x.id === state.editId) : null;
    const fromLater = state.form.fromLater || null;
    const laterItem = fromLater ? (state.config.later || []).find((l) => l.id === fromLater) : null;
    const rate = existing && existing.rate ? existing.rate : state.config.rate;
    const cur = state.form.currency;
    const e = {
      date, amount: round2(amount), currency: cur, rate,
      usd: round2(cur === "RMB" ? amount / rate : amount),
      rmb: round2(cur === "RMB" ? amount : amount * rate),
      cat: state.form.cat, kind: income ? "income" : state.form.kind,
      reason: $("f-reason").value.trim(), method: state.form.method, note: $("f-note").value.trim(),
      createdAt: existing && existing.createdAt ? existing.createdAt : Date.now()
    };
    if (income) e.type = "income";
    if (existing && existing.bill) { e.bill = true; e.billId = existing.billId; }
    const btn = $("f-submit"); btn.disabled = true;
    try {
      if (existing) { await store.update(existing.id, e); await savedCheck(btn); state.justAdded = existing.id; closeSheet(); toast("Changes saved"); }
      else {
        const id = await store.add(e);
        await savedCheck(btn);
        state.justAdded = id;
        closeSheet();
        toast(savedText(e, id), false, id ? { label: "Undo", fn: async () => { try {
          await store.remove(id);
          // Undo of a buy puts it back on the waiting list
          if (laterItem) { const later = (state.config.later || []).concat([laterItem]); await store.saveConfig({ ...state.config, later }); state.config = normalizeConfig({ ...state.config, later }); renderAll(); }
          toast("Removed", true);
        } catch (err) {} } } : null);
        // bought from the waiting list: take it off the list
        if (fromLater) { const lid = fromLater; state.form.fromLater = null; const rest = (state.config.later || []).filter((l) => l.id !== lid); try { await store.saveConfig({ ...state.config, later: rest }); state.config = normalizeConfig({ ...state.config, later: rest }); } catch (err) {} }
        if (date.slice(0, 7) !== state.month) state.month = date.slice(0, 7);
      }
      renderAll(); popSummary();
      // the amount shows beside the total for a moment, so you see what it did
      if (!existing && state.view === "home") spendTick($("summary").firstElementChild, (income ? "+" : "−") + rmbS(cur === "RMB" ? e.amount : R(e)), income);
    } catch (err) {
      msg.textContent = err && err.code === "quota_exceeded" ? "Storage is full. Delete old entries to add more." : "Could not save. Check your connection and try again.";
    } finally { btn.disabled = false; }
  }

  // ---------- Home ----------
  // the hour you added it, shown in the Day report (only when it was added on the same day it is dated)
  const entryTime = (e) => { if (!e.createdAt) return ""; const t = new Date(e.createdAt); return isoOf(t) === e.date ? t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""; };
  function entryHTML(e, withTime) {
    const c = catById(e.cat), isR = e.currency !== "USD", reason = (e.reason || "").trim(), grouped = withTime === true || withTime === "week";
    // Week report: weekday and date, then the time; Day report: just the time
    const tm = withTime === "week" ? new Date(e.date + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + (entryTime(e) ? " · " + entryTime(e) : "") : withTime === true ? entryTime(e) : "";
    return '<button type="button" class="entry' + (e.id === state.justAdded ? " fresh" : "") + '" data-id="' + esc(e.id) + '" aria-label="Edit this expense">' + tile(c) +
      '<span style="min-width:0"><div class="reason' + (reason ? "" : " empty") + '">' + esc(reason || "No reason written") + "</div>" +
      '<div class="meta">' + (tm ? '<span class="tm">' + tm + "</span><span>·</span>" : grouped ? "" : "<span>" + esc(c.name) + "</span><span>·</span>") + "<span>" + esc(e.bill ? "Monthly bill" : e.method || "") + "</span>" + (e._pending ? '<span class="pend" title="Saved on this device, waiting to sync">⏳ waiting to sync</span>' : "") + "</div></span>" +
      '<span class="amt"><div class="main' + (isInc(e) ? ' inc-amt">+' : isSave(e) ? '">' : ' out-amt">−') + rmbS(isR ? e.amount : R(e)) + '</div><div class="alt">' + (isInc(e) ? "+" : "") + (isR ? usd(U(e)) : usdS(e.amount)) + "</div></span></button>";
  }
  const bindEntries = (root) => root.querySelectorAll(".entry[data-id]").forEach((b) => (b.onclick = () => startEdit(b.dataset.id)));

  // ---------- Motion helpers ----------
  const reduceMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  const shownCounts = {};
  let ringOff = null;
  function countUp(el, id, to, fmtFn, ms) {
    const from = shownCounts[id] == null ? 0 : shownCounts[id];
    shownCounts[id] = to;
    if (reduceMotion() || Math.abs(from - to) < 0.5) { el.textContent = fmtFn(to); return; }
    // The final number is written first, so a page that never draws a frame (hidden tab, preview) still shows it.
    el.textContent = fmtFn(to);
    const dur = ms || 650;
    let t0 = null;
    const step = (t) => {
      if (!el.isConnected) return;
      if (t0 == null) t0 = t;
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtFn(p < 1 ? Math.round(from + (to - from) * e) : to);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function renderSummary(s) {
    // Home is kept simple: the money you have right now, and the food limit for today
    const mName = esc(monthName(state.month, { month: "long" })), ws = state.config.wallets || [];
    const now = state.month === curMonth() && ws.length;
    let html, bigVal = 0, bigKey = "home-spent";
    if (now) {
      const tot = ws.reduce((a, w) => a + wToRmb(w, walletBalance(w)), 0);
      bigVal = tot; bigKey = "home-money";
      html = '<div style="min-width:0"><div class="cap">Money left</div><div class="big' + (tot < 0 ? " up" : "") + '">' + rmb0(tot) + '</div><div class="usd usd-line">' + usd(tot / state.config.rate) + "</div>" +
        '<button type="button" class="money-split" data-go-wallets="1">' + ws.filter((w) => Math.abs(walletBalance(w)) >= 0.005).slice(0, 4).map((w) => "<span>" + esc(w.name) + " <b>" + wMoney(w, walletBalance(w)) + "</b></span>").join("") + "</button></div>";
    } else {
      bigVal = s.rmb;
      html = '<div style="min-width:0"><div class="cap">Spent in ' + mName + '</div><div class="big out-amt">' + rmb0(s.rmb) + '</div><div class="usd usd-line">' + usd(s.usd) + "</div>" + (s.inc > 0 ? '<div class="cmp">Income ' + rmb0(s.inc) + "</div>" : "") + "</div>";
    }
    const lim = state.config.foodLimit;
    if (lim > 0) {
      const spent = foodOn(todayISO()), ratio = Math.min(spent / lim, 1), left = lim - spent;
      const cls = spent > lim ? "over" : ratio >= 0.8 ? "warn" : "", Rr = 38, C = 2 * Math.PI * Rr;
      html += '<div class="food-mini"><div class="ring ' + cls + '"><svg viewBox="0 0 92 92" aria-hidden="true"><circle class="bg" cx="46" cy="46" r="' + Rr + '" fill="none" stroke-width="9"/><circle class="fg" cx="46" cy="46" r="' + Rr + '" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - ratio)).toFixed(2) + '" data-from="' + (ringOff == null ? C : ringOff).toFixed(2) + '"/></svg>' +
        '<div class="center"><div class="v">' + rmb0(Math.abs(left)) + '</div><div class="s">' + (left >= 0 ? "left" : "over") + '</div></div></div><div class="t">Food today<br>of ' + rmb0(lim) + "</div></div>";
    }
    $("summary").innerHTML = html;
    // count the big number from what was shown before, and sweep the food ring to its new level
    const big = $("summary").querySelector(".big");
    if (big) rollNumber(big, rmb0(bigVal), { id: bigKey });
    // the dollar line follows the yuan one a beat later
    const sub = $("summary").querySelector(".usd-line");
    if (sub) rollNumber(sub, sub.textContent, { id: bigKey + "-usd", delay: 60 });
    const fg = $("summary").querySelector(".ring .fg");
    if (fg) {
      const to = Number(fg.getAttribute("stroke-dashoffset")), from = Number(fg.dataset.from);
      ringOff = to;
      if (!reduceMotion() && Math.abs(from - to) > 0.5) requestAnimationFrame(() => {
        fg.style.transition = "none"; fg.style.strokeDashoffset = from; void fg.getBoundingClientRect();
        requestAnimationFrame(() => { fg.style.transition = ""; fg.style.strokeDashoffset = to; });
      });
    }
    $("summary").querySelectorAll("[data-go-debts]").forEach((b) => (b.onclick = () => setView("debts")));
    $("summary").querySelectorAll("[data-go-wallets]").forEach((b) => (b.onclick = () => setView("wallets")));
    const fm = $("summary").querySelector(".food-mini"); if (fm) { fm.setAttribute("role", "button"); fm.tabIndex = 0; fm.title = "Open Limits"; fm.onclick = () => setView("limits"); }
    $("summary").querySelectorAll("[data-later-buy]").forEach((b) => (b.onclick = () => buyLater(b.dataset.laterBuy)));
    $("summary").querySelectorAll("[data-later-del]").forEach((b) => (b.onclick = () => removeLater(b.dataset.laterDel)));
    $("summary").querySelectorAll("[data-alert-cat]").forEach((b) => (b.onclick = () => { state.catFilter = b.dataset.alertCat; state.homeView = "list"; state.selDay = null; renderHome(); }));
  }
  const dayLabelY = (iso) => (iso.slice(0, 4) !== todayISO().slice(0, 4) ? dayLabel(iso) + ", " + iso.slice(0, 4) : dayLabel(iso));

  // How much money you had when that day ended, from your wallets. A day before a wallet's balance was set is not guessed.
  function moneyOnHTML(iso) {
    const ws = state.config.wallets || []; if (!ws.length) return "";
    const rate = state.config.rate, m = moneyOn(ws, { expenses: state.expenses, debts: state.debts, transfers: state.transfers, wallets: ws }, rate, iso);
    const started = (w) => shortDate(isoOf(new Date(w.setAt)));
    if (!m.known.length) {
      const first = ws.slice().sort((a, b) => a.setAt - b.setAt)[0];
      return '<div class="cal-money"><div class="cap">Money at the end of this day</div><p class="hint" style="margin:0">Not known. Your wallet balances start on ' + esc(started(first)) + ", so earlier days have no balance.</p></div>";
    }
    const parts = m.known.filter((x) => Math.abs(x.b) >= 0.005).map((x) => "<span>" + esc(x.w.name) + " <b>" + wMoney(x.w, x.b) + "</b></span>").join("");
    return '<div class="cal-money"><div class="cap">Money at the end of ' + (iso === todayISO() ? "today" : "this day") + '</div><div class="val' + (m.total < 0 ? " up" : "") + '">' + rmb0(m.total) + '</div><div class="usd">' + usd(m.total / rate) + "</div>" +
      (parts ? '<div class="split">' + parts + "</div>" : "") +
      (m.missing.length ? '<p class="hint" style="margin:0">Not counting ' + esc(listJoin(m.missing.map((w) => w.name + " (starts " + started(w) + ")"))) + ".</p>" : "") + "</div>";
  }
  // Month calendar for the Report: each day shaded by spending, tap a day for its details
  function calendarCardHTML(s, key) {
    const n = daysIn(key), [y, m] = key.split("-").map(Number);
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const byDay = {}, incDay = {};
    s.list.forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + R(e); });
    s.incList.forEach((e) => { incDay[e.date] = true; });
    const max = Math.max(1, ...Object.values(byDay));
    const today = todayISO(), lim = state.config.foodLimit;
    const anyInc = s.incList.length > 0;
    let cells = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => '<div class="wd">' + d + "</div>").join("");
    for (let i = 0; i < lead; i++) cells += "<span></span>";
    let anyOver = false;
    for (let d = 1; d <= n; d++) {
      const iso = key + "-" + pad(d), v = byDay[iso] || 0, future = iso > today;
      const h = v > 0 ? Math.round(10 + 72 * Math.sqrt(v / max)) : 0;
      const over = lim > 0 && foodOn(iso) > lim;
      if (over) anyOver = true;
      const cls = "day" + (h >= 50 ? " hot" : "") + (iso === today ? " today" : "") + (iso === state.repDay ? " sel" : "") + (future ? " future" : "");
      cells += '<button type="button" class="' + cls + '" data-d="' + iso + '" style="--h:' + h + '%"' + (future ? " disabled" : "") + ' aria-label="' + esc(dayLabel(iso)) + ": " + rmb0(v) + '"><span class="n">' + d + '</span><span class="a">' + (v > 0 ? compactRmb(v) : "&nbsp;") + "</span>" + (over ? '<span class="fx"></span>' : "") + (incDay[iso] ? '<span class="ix"></span>' : "") + "</button>";
    }
    const keys = (anyInc ? '<span class="ixk">income</span> ' : "") + (anyOver ? '<span class="fxk">over food limit</span>' : "");
    let detail = "";
    const sel = state.repDay && state.repDay.slice(0, 7) === key ? state.repDay : null;
    if (sel) {
      const dayAll = s.all.filter((e) => e.date === sel).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const out = dayAll.filter(isSpend), dr = out.reduce((a, e) => a + R(e), 0), du = out.reduce((a, e) => a + U(e), 0);
      const di = dayAll.filter(isInc).reduce((a, e) => a + R(e), 0), f = foodOn(sel);
      detail = '<div class="cal-detail"><div class="dh"><span class="cap">' + esc(sel === today ? "Today" : dayLabelY(sel)) + '</span><span class="hint">' + (lim > 0 ? "Food " + rmb0(f) + " of " + rmb0(lim) + (f > lim ? ' <span class="up">(over)</span>' : "") : "") + "</span></div>" +
        '<div class="dh"><b class="out-amt">' + rmb0(dr) + ' <span class="usd" style="font-size:14px">' + usd(du) + "</span></b>" + (di > 0 ? '<span class="inc-amt" style="font-weight:800">+' + rmb0(di) + " in</span>" : "") + "</div>" +
        moneyOnHTML(sel) +
        (dayAll.length ? '<div class="entries">' + dayAll.map(entryHTML).join("") + "</div>" : '<p class="hint" style="margin:0">Nothing spent on this day.</p>') + "</div>";
    }
    return '<div class="card stack" style="gap:10px"><div class="head"><h2>Calendar</h2><span class="hint">tap a day · darker = more spent</span></div><div class="cal">' + cells + "</div>" +
      (keys ? '<div class="cal-foot"><span style="display:flex;gap:12px;flex-wrap:wrap">' + keys + "</span></div>" : "") + detail + "</div>";
  }
  // A picked date and a search are one or the other: a search always looks through the whole month (or All months), never one hidden day
  function closeSearch() { $("search-row").hidden = true; $("search-btn").setAttribute("aria-pressed", "false"); $("flt-q").value = ""; }
  function clearDay() { state.selDay = null; $("jump").value = ""; }
  function goToDate(v) {
    // the picker's Reset button sends an empty date: back to the whole month
    if (!v) { state.selDay = null; renderHome(); return; }
    if (!saneDate(v)) return;
    closeSearch();
    state.month = v.slice(0, 7); state.selDay = v; state.catFilter = null;
    if (state.view !== "home") setView("home"); else renderAll();
    $("day-bar").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderHome() {
    const s = statsFor(state.month);
    renderSummary(s);
    const sel = state.selDay && state.selDay.slice(0, 7) === state.month ? state.selDay : null;
    $("date-btn").classList.toggle("on", !!sel);
    $("jump").max = todayISO();
    $("list-title").textContent = sel ? "That day" : "Entries";
    const bar = $("day-bar");
    if (sel) {
      const dl = s.all.filter((e) => e.date === sel && isSpend(e));
      const di = s.incList.filter((e) => e.date === sel).reduce((a, e) => a + R(e), 0);
      const dr = dl.reduce((a, e) => a + R(e), 0), du = dl.reduce((a, e) => a + U(e), 0);
      const lim = state.config.foodLimit, f = foodOn(sel);
      bar.innerHTML = '<div><div class="when">' + esc(sel === todayISO() ? "Today" : dayLabel(sel)) + (lim > 0 && dl.length ? " · food " + rmb0(f) + " of " + rmb0(lim) : "") + '</div><div class="tot"><span class="out-amt">' + rmb0(dr) + '</span><small class="usd">' + usd(du) + "</small>" + (di > 0 ? '<small class="inc-amt">+' + rmb0(di) + " in</small>" : "") + "</div></div>" +
        '<button type="button" class="btn small" id="day-clear">Whole month</button>';
      bar.hidden = false;
      $("day-clear").onclick = () => { clearDay(); renderHome(); };
    } else bar.hidden = true;

    const q = $("search-row").hidden ? "" : $("flt-q").value.trim().toLowerCase();
    const everywhere = state.searchAll && (!!q || !!state.catFilter);
    const fr = $("filter-row");
    if (state.catFilter) {
      const c = catById(state.catFilter);
      fr.innerHTML = '<button type="button" class="filter-chip" id="filter-clear" aria-label="Stop filtering by ' + esc(c.name) + '">' + tile(c, "ci") + esc(c.name) + '<span class="x" aria-hidden="true">✕</span></button>';
      fr.hidden = false;
      $("filter-clear").onclick = () => { state.catFilter = null; renderHome(); };
    } else fr.hidden = true;
    const src = everywhere ? state.expenses : s.all;
    const found = src.filter((e) => typeof e.date === "string" && (!sel || e.date === sel) && (!state.catFilter || e.cat === state.catFilter) && (!q || ((e.reason || "") + " " + (e.note || "") + " " + catById(e.cat).name + " " + (e.method || "")).toLowerCase().includes(q)));
    const list = found.slice().sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : (b.createdAt || 0) - (a.createdAt || 0))).slice(0, 400);
    const box = $("month-list");
    if (!state.loaded) { box.innerHTML = skeletonRows(); return; }
    if (!list.length) {
      box.innerHTML = sel && !q && !state.catFilter ? '<div class="empty-state">' + emptyArt("wallet") + '<h3>Nothing spent on this day</h3>A day with no spending. Nice.</div>'
        : q || state.catFilter || s.count || everywhere ? '<div class="empty-state">' + emptyArt("search") + '<h3>No matches</h3>' + (everywhere ? "Nothing found in any month." : 'Nothing this month. Try "All months".') + "</div>"
        : '<div class="empty-state">' + emptyArt("wallet") + '<h3>Nothing here yet</h3>Tap the + button to add your first expense for ' + esc(monthName(state.month, { month: "long" })) + ".</div>";
      return;
    }
    let html = "", day = null, group = [];
    if (q || state.catFilter) {
      // totals and the count cover everything found, even when the list below stops at 400
      const tr = found.filter(isSpend).reduce((a, e) => a + R(e), 0), ti = found.filter(isInc).reduce((a, e) => a + R(e), 0);
      html += '<div class="day-head" style="padding-top:2px"><span>' + found.length + " result" + (found.length === 1 ? "" : "s") + (found.length > list.length ? ", newest " + list.length + " shown" : "") + (everywhere ? " in all months" : " in " + esc(monthName(state.month, { month: "long" }))) + '</span><span class="t">' + (tr ? "<b>" + rmb0(tr) + "</b>" : "") + (ti ? (tr ? " · " : "") + '<b class="inc-amt">+' + rmb0(ti) + "</b>" : "") + "</span></div>";
    }
    const flush = () => {
      if (!group.length) return;
      const out = group.filter(isSpend), inn = group.filter(isInc);
      const dr = out.reduce((a, e) => a + R(e), 0), du = out.reduce((a, e) => a + U(e), 0), di = inn.reduce((a, e) => a + R(e), 0);
      html += '<div class="day-head"><span>' + esc(day === todayISO() ? "Today" : dayLabelY(day)) + '</span><span class="t">' + (out.length ? '<b class="out-amt">' + rmb0(dr) + "</b> · " + usd(du) : "") + (di > 0 ? (out.length ? " · " : "") + '<b class="inc-amt">+' + rmb0(di) + "</b> in" : "") + "</span></div>" + group.map(entryHTML).join("");
      group = [];
    };
    list.forEach((e) => { if (e.date !== day) { flush(); day = e.date; } group.push(e); });
    flush();
    box.innerHTML = html;
    bindEntries(box);
    // the first rows of a list you have just arrived at come in one after another; later redraws stay still
    const listKey = [state.month, sel, state.catFilter, everywhere].join("|");
    if (staggerPending || listKey !== lastListKey) { staggerRows(box); staggerPending = false; lastListKey = listKey; }
    swipe.prepare();
    if (state.justAdded && box.querySelector(".entry.fresh")) state.justAdded = null;
  }

  // ---------- Report ----------
  function donutSVG(rows, total) {
    const Rr = 86, SW = 30, C = 2 * Math.PI * Rr, cx = 120, cy = 120;
    let off = 0, segs = "", labels = "", si = 0;
    rows.forEach((r) => {
      const frac = total > 0 ? r.rmb / total : 0, len = frac * C;
      if (len <= 0) return;
      const gap = rows.length > 1 ? Math.min(2.5, len / 3) : 0;
      segs += '<circle class="seg-arc" cx="' + cx + '" cy="' + cy + '" r="' + Rr + '" fill="none" stroke="' + esc(r.color) + '" stroke-width="' + SW + '" style="stroke-dasharray:' + Math.max(len - gap, 0.01).toFixed(2) + " " + (C - Math.max(len - gap, 0.01)).toFixed(2) + ";--d:" + (si++ * 0.09).toFixed(2) + 's" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cy + ')"><title>' + esc(r.name) + ": " + Math.round(frac * 100) + "% · " + rmb0(r.rmb) + "</title></circle>";
      if (frac >= 0.06) {
        const a = ((off + len / 2) / C) * 2 * Math.PI - Math.PI / 2;
        labels += '<text class="pl" x="' + (cx + Rr * Math.cos(a)).toFixed(1) + '" y="' + (cy + Rr * Math.sin(a) + 4).toFixed(1) + '" text-anchor="middle" style="fill:#fff;font:800 11.5px var(--f);pointer-events:none">' + Math.round(frac * 100) + "%</text>";
      }
      off += len;
    });
    return '<svg viewBox="0 0 240 240" role="img" aria-label="Spending by section">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rr + '" fill="none" stroke="var(--surface-2)" stroke-width="' + SW + '"/>' + segs + labels +
      '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" style="fill:var(--muted);font:700 12px var(--f)">Total</text>' +
      '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" style="fill:var(--ink);font:800 22px var(--f);letter-spacing:-0.5px">' + rmb0(total) + "</text></svg>";
  }

  function weekHTML() {
    const t = new Date(), k = (t.getDay() + 6) % 7, days = [], prevDays = [];
    for (let i = 0; i < 7; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - k + i); days.push(isoOf(d)); prevDays.push(isoOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))); }
    const today = todayISO(), byDate = {};
    state.expenses.forEach((e) => { if (!isSpend(e)) return; const x = byDate[e.date] = byDate[e.date] || { r: 0, u: 0, cat: {} }; x.r += R(e); x.u += U(e); x.cat[e.cat] = (x.cat[e.cat] || 0) + R(e); });
    const sum = (list) => list.reduce((a, iso) => { const x = byDate[iso]; if (x) { a.r += x.r; a.u += x.u; Object.entries(x.cat).forEach(([c, v]) => (a.cat[c] = (a.cat[c] || 0) + v)); } return a; }, { r: 0, u: 0, cat: {} });
    const a = sum(days.slice(0, k + 1)), b = sum(prevDays.slice(0, k + 1));
    if (a.r === 0 && b.r === 0) return "";
    let cmp = "";
    if (b.r > 0) { const d = Math.round(((a.r - b.r) / b.r) * 100); cmp = " · " + (Math.abs(d) < 3 ? "same as last week" : '<span class="' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ " : "▼ ") + Math.abs(d) + "%</span> vs last week"); }
    let big = null;
    new Set(Object.keys(a.cat).concat(Object.keys(b.cat))).forEach((c) => { const d = (a.cat[c] || 0) - (b.cat[c] || 0); if (!big || Math.abs(d) > Math.abs(big.d)) big = { c, d }; });
    const max = Math.max(1, ...days.concat(prevDays).map((iso) => (byDate[iso] ? byDate[iso].r : 0)));
    const bars = days.map((iso, i) => {
      const v = byDate[iso] ? byDate[iso].r : 0, pv = byDate[prevDays[i]] ? byDate[prevDays[i]].r : 0;
      return '<div class="wb' + (iso === today ? " today" : "") + (iso > today ? " future" : "") + '" title="' + esc(dayLabel(iso)) + ": " + rmb0(v) + " (last week " + rmb0(pv) + ')"><div class="wb-bars"><i class="ghost" style="height:' + (pv / max) * 100 + '%"></i><i style="height:' + (iso > today ? 0 : (v / max) * 100) + '%"></i></div><span>' + ["M", "T", "W", "T", "F", "S", "S"][i] + "</span></div>";
    }).join("");
    return '<div class="card week"><div class="week-top"><div><div class="cap">This week</div><div class="wk out-amt">' + rmb0(a.r) + '</div><div class="alt"><span class="usd">' + usd(a.u) + "</span>" + cmp + "</div>" +
      (big && Math.abs(big.d) >= 5 && b.r > 0 ? '<div class="wk-big">' + tile(catById(big.c), "ci") + "<span>Biggest change: <strong>" + esc(catById(big.c).name) + '</strong> <span class="' + (big.d > 0 ? "up" : "down") + '">' + (big.d > 0 ? "+" : "-") + rmb0(Math.abs(big.d)) + "</span></span></div>" : "") +
      '</div><div class="wbars" aria-hidden="true">' + bars + "</div></div></div>";
  }

  function takeaways(s, prev, key) {
    const out = [], prevName = monthName(shiftMonth(key, -1), { month: "long" }), inc = s.inc;
    if (prev.rmb > 0) {
      const d = Math.round(((s.rmb - prev.rmb) / prev.rmb) * 100);
      if (Math.abs(d) < 3) out.push(["info", "=", "You spent about the same as in " + prevName + "."]);
      else out.push([d > 0 ? "bad" : "good", d > 0 ? "↑" : "↓", "You spent <strong>" + Math.abs(d) + "% " + (d > 0 ? "more" : "less") + "</strong> than in " + prevName + " (" + rmb0(s.rmb) + " vs " + rmb0(prev.rmb) + ")."]);
    }
    const ranked = Object.entries(s.byCat).sort((a, b) => b[1].rmb - a[1].rmb);
    if (ranked.length) {
      const [cid, v] = ranked[0], top = quote(reasonsFor(v.items), 2);
      out.push(["info", "1", "Most money went to <strong>" + esc(catById(cid).name) + "</strong>: " + pct(v.rmb, s.rmb) + "%" + (top.length ? ", mainly " + top.join(" and ") : "") + "."]);
    }
    if (state.config.foodLimit > 0) {
      const n = key === curMonth() ? Number(todayISO().slice(8, 10)) : daysIn(key);
      let ok = 0, tracked = 0;
      for (let d = 1; d <= n; d++) { const iso = key + "-" + pad(d); if (state.expenses.some((e) => e.date === iso)) { tracked++; if (foodOn(iso) <= state.config.foodLimit) ok++; } }
      if (tracked) out.push([ok === tracked ? "good" : ok / tracked >= 0.7 ? "info" : "bad", "¥", "Food stayed under " + rmb0(state.config.foodLimit) + " a day on <strong>" + ok + " of " + tracked + "</strong> days you logged."]);
    }
    const over = state.config.categories.filter((c) => c.budget > 0).map((c) => ({ c, spent: (s.byCat[c.id] || { rmb: 0 }).rmb })).filter((x) => x.spent > x.c.budget).sort((a, b) => (b.spent - b.c.budget) - (a.spent - a.c.budget));
    if (over.length) out.push(["bad", "!", "Over budget: " + over.slice(0, 3).map((x) => "<strong>" + esc(x.c.name) + "</strong> by " + rmb0(x.spent - x.c.budget)).join(", ") + "."]);
    else if (totalBudget() > 0) out.push(["good", "✓", "You stayed inside every budget."]);
    if (prev.rmb > 0) {
      let best = null;
      Object.entries(s.byCat).forEach(([cid, v]) => { const p = (prev.byCat[cid] || { rmb: 0 }).rmb, d = v.rmb - p; if (d > 100 && (!best || d > best.d)) best = { cid, d, v }; });
      if (best) { const top = quote(reasonsFor(best.v.items), 2); out.push(["bad", "↑", "<strong>" + esc(catById(best.cid).name) + "</strong> went up " + rmb0(best.d) + " compared with " + prevName + (top.length ? ", because of " + top.join(" and ") : "") + "."]); }
    }
    if (inc > 0 && s.rmb > 0) {
      const kept = pct(inc - s.byKind.need - s.byKind.want, inc);
      if (s.left < 0) out.push(["bad", "%", "Spending and savings together were <strong>" + rmb0(-s.left) + " more</strong> than your income this month, so some came from money you already had."]);
      else out.push([kept >= 20 ? "good" : "bad", "%", "You kept or saved <strong>" + kept + "%</strong> of your income. A healthy target is 20% or more."]);
    }
    const noWhy = s.list.filter((e) => !(e.reason || "").trim()).length;
    if (noWhy) out.push(["bad", "?", noWhy + " expense" + (noWhy > 1 ? "s have" : " has") + " no reason. Tap them on Home to add one."]);
    return out.slice(0, 5);
  }

  function bindMode(el) {
    // moving between Day / Week / Month / Year: bars that exist on both screens glide to their new size instead of redrawing
    el.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { const snap = snapshotBars(el); state.reportMode = b.dataset.mode; pref.set("reportMode", b.dataset.mode); syncMonthSwitch(); renderReport(); morphBars(el, snap); }));
    scrubBars(el);
    el.querySelectorAll("[data-goto-month]").forEach((b) => (b.onclick = () => { state.month = b.dataset.gotoMonth; state.reportMode = "month"; renderAll(); window.scrollTo({ top: 0 }); }));
    el.querySelectorAll(".cal .day[data-d]").forEach((b) => (b.onclick = () => { state.repDay = state.repDay === b.dataset.d ? null : b.dataset.d; renderReport(); }));
    el.querySelectorAll("[data-see-cat]").forEach((b) => (b.onclick = () => { state.catFilter = b.dataset.seeCat; state.homeView = "list"; state.selDay = null; setView("home"); }));
  }

  // ---------- Patterns ----------
  function hbars(rows, fmtV) {
    const max = Math.max(1, ...rows.map((r) => r.v));
    const top = rows.reduce((t, r) => (r.v > t ? r.v : t), 0);
    return rows.map((r) => '<div class="hbar' + (r.v === top && r.v > 0 ? " top" : "") + '"><span class="l">' + esc(r.l) + '</span><span class="b"><i style="width:' + (r.v / max) * 100 + '%"></i></span><span class="v">' + fmtV(r) + "</span></div>").join("");
  }
  function patternsHTML(key, s) {
    const out = [];
    // 1. Last 6 months: spent vs income
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(key, i - 5));
    const st = months.map(statsFor);
    if (st.filter((x) => x.count).length >= 2) {
      const max = Math.max(1, ...st.map((x) => Math.max(x.rmb, x.inc)));
      const avg = st.filter((x) => x.rmb > 0).reduce((a, x) => a + x.rmb, 0) / Math.max(1, st.filter((x) => x.rmb > 0).length);
      const bars = months.map((m, i) => { const x = st[i]; return '<button type="button" class="ybar' + (m === key ? " sel" : "") + '" style="--i:' + i + '" data-goto-month="' + m + '" title="' + esc(monthName(m)) + ": spent " + rmb0(x.rmb) + ", income " + rmb0(x.inc) + '"><span class="yv">' + (x.rmb ? compactRmb(x.rmb) : "") + '</span><span class="yb" style="height:120px">' + (x.inc > 0 ? '<i class="ghost" style="height:' + (x.inc / max) * 100 + '%"></i>' : "") + '<i style="height:' + (x.rmb / max) * 100 + '%"></i></span><span class="yl">' + monthName(m, { month: "short" }) + "</span></button>"; }).join("");
      out.push('<div class="card stack"><div class="head"><h2>Last 6 months</h2><span class="hint">dark = spent' + (st.some((x) => x.inc) ? ", green = income" : "") + '</span></div><div class="ybars" style="grid-template-columns:repeat(6,minmax(0,1fr))">' + bars + '</div><p class="hint" style="margin:0">Average month: <b style="color:var(--ink)">' + rmb0(avg) + "</b> spent. This month is " + (s.rmb > avg ? '<span class="up">' + rmb0(s.rmb - avg) + " above</span>" : '<span class="down">' + rmb0(avg - s.rmb) + " below</span>") + " average" + (key === curMonth() ? " so far" : "") + ".</p></div>");
    }
    // 2. Weekdays (last 90 days, no monthly bills)
    const end = key === curMonth() ? new Date() : new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0);
    // count only days since your first entry, so a short history is not divided by 90 days
    const firstIso = state.expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");
    let start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 89);
    if (firstIso && firstIso > isoOf(start)) { const [fy, fm, fd] = firstIso.split("-").map(Number); start = new Date(fy, fm - 1, fd); }
    const sIso = isoOf(start), eIso = isoOf(end);
    const spanDays = Math.round((new Date(end.getFullYear(), end.getMonth(), end.getDate()) - start) / 864e5) + 1;
    const wsum = [0, 0, 0, 0, 0, 0, 0], wcount = [0, 0, 0, 0, 0, 0, 0];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) wcount[(d.getDay() + 6) % 7]++;
    let anyW = 0;
    state.expenses.forEach((e) => { if (!isSpend(e) || isFixed(e) || !e.date || e.date < sIso || e.date > eIso) return; const [y, m, dd] = e.date.split("-").map(Number); wsum[(new Date(y, m - 1, dd).getDay() + 6) % 7] += R(e); anyW++; });
    if (anyW >= 5) {
      const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const rows = names.map((n, i) => ({ l: n.slice(0, 3), full: n, v: wcount[i] ? wsum[i] / wcount[i] : 0 }));
      const top = rows.reduce((a, r) => (r.v > a.v ? r : a), rows[0]);
      const wk = (rows[5].v + rows[6].v) / 2, wd = (rows[0].v + rows[1].v + rows[2].v + rows[3].v + rows[4].v) / 5;
      out.push('<div class="card stack"><div class="head"><h2>By day of week</h2><span class="hint">average per day, ' + (spanDays >= 90 ? "last 90 days" : "since " + shortDate(sIso) + " (" + spanDays + " days)") + '</span></div><div>' + hbars(rows, (r) => rmb0(r.v)) + '</div><p class="hint" style="margin:0">You spend most on <b style="color:var(--ink)">' + top.full + "s</b>. Weekend days average " + rmb0(wk) + ", weekdays " + rmb0(wd) + ". Debt payments and monthly bills are left out." + (spanDays < 28 ? (Math.min(...wcount) <= 1 ? " Some weekdays have only been counted once so far" : " Each weekday has been counted only " + Math.min(...wcount) + " times so far") + ", so this gets more reliable over the coming weeks." : "") + "</p></div>");
    }
    // 3. Payment methods (this month)
    const pm = Object.create(null);
    s.list.forEach((e) => { const k = e.method || "Other"; pm[k] = (pm[k] || 0) + R(e); });
    const pmr = Object.entries(pm).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v }));
    if (pmr.length) out.push('<div class="card stack"><div class="head"><h2>How you paid</h2><span class="hint">this month</span></div><div>' + hbars(pmr, (r) => pct(r.v, s.rmb) + "% · " + rmb0(r.v)) + "</div></div>");
    // 4. Fixed vs flexible + spending size
    if (s.list.length) {
      const fixed = s.list.filter(isFixed).reduce((a, e) => a + R(e), 0), flex = s.rmb - fixed;
      const amounts = s.list.map(R).sort((a, b) => a - b), n = amounts.length;
      const median = n % 2 ? amounts[(n - 1) / 2] : (amounts[n / 2 - 1] + amounts[n / 2]) / 2;
      const small = amounts.filter((a) => a < 30), smallT = small.reduce((a, b) => a + b, 0);
      const firstE = state.expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");
      const fromDay = firstE.slice(0, 7) === key ? Number(firstE.slice(8, 10)) : 1;
      const days = (key === curMonth() ? Number(todayISO().slice(8, 10)) : daysIn(key)) - fromDay + 1;
      const spendDays = new Set(s.list.map((e) => e.date)).size;
      out.push('<div class="card stack"><div class="head"><h2>Fixed and flexible</h2><span class="hint">this month</span></div>' +
        '<div class="ff-bar">' + (fixed > 0 ? '<div class="fx" style="width:' + (fixed / s.rmb) * 100 + '%"></div>' : "") + (flex > 0 ? '<div class="fl" style="width:' + (flex / s.rmb) * 100 + '%"></div>' : "") + "</div>" +
        '<div class="legend2"><span><span class="dot" style="background:var(--ink)"></span> Fixed <b>' + rmb0(fixed) + "</b> (" + pct(fixed, s.rmb) + '%)</span><span><span class="dot" style="background:var(--accent)"></span> Flexible <b>' + rmb0(flex) + "</b> (" + pct(flex, s.rmb) + "%)</span></div>" +
        '<p class="hint" style="margin:0">Fixed is utilities, debt payments and monthly bills. Flexible is everything you decide day to day, the part you can change fastest.</p>' +
        '<div class="stat-grid">' +
        '<div><div class="lbl">Expenses</div><div class="val">' + n + "</div><small>on " + spendDays + " of " + days + (fromDay > 1 ? " days since you started" : " days") + "</small></div>" +
        '<div><div class="lbl">Typical expense</div><div class="val">' + rmb0(median) + "</div><small>average " + rmb0(s.rmb / n) + "</small></div>" +
        '<div><div class="lbl">Largest single</div><div class="val">' + rmb0(amounts[n - 1]) + "</div><small>" + pct(amounts[n - 1], s.rmb) + "% of the month</small></div>" +
        '<div><div class="lbl">Small buys under ¥30</div><div class="val">' + small.length + "</div><small>" + rmb0(smallT) + " in total</small></div>" +
        "</div></div>");
    }
    if (!out.length) return "";
    return '<div class="head" style="margin-top:8px"><h2 style="font-size:20px">Patterns</h2><span class="hint">how and when you spend</span></div><div class="patterns">' + out.join("") + "</div>";
  }

  // ---------- Money review written by Claude ----------
  let reviewCtl = null, reviewLive = null;
  function formatReview(text) {
    const lines = String(text || "").split(/\r?\n/);
    let html = "", inList = false;
    const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    lines.forEach((ln) => {
      const t = ln.trim();
      const li = t.match(/^[-*•]\s+(.*)$/);
      if (li) { if (!inList) { html += "<ul>"; inList = true; } html += "<li>" + inline(li[1]) + "</li>"; return; }
      if (inList) { html += "</ul>"; inList = false; }
      if (!t) return;
      const h = t.match(/^#{1,4}\s+(.*)$/);
      html += h ? "<h3>" + inline(h[1]) + "</h3>" : "<p>" + inline(t) + "</p>";
    });
    if (inList) html += "</ul>";
    return html;
  }
  function reviewData(key) {
    const s = statsFor(key), prev = statsFor(shiftMonth(key, -1));
    const days = key === curMonth() ? Number(todayISO().slice(8, 10)) : daysIn(key);
    const L = [];
    L.push("Month: " + monthName(key) + (key === curMonth() ? " (in progress, day " + days + " of " + daysIn(key) + ")" : " (complete)"));
    const firstIso = state.expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");
    if (firstIso.slice(0, 7) === key && firstIso.slice(8, 10) !== "01") L.push("Tracking started on " + dayLabel(firstIso) + " (first entry ever), so days before that are not missing spending, they were simply not logged. Judge daily averages from that date.");
    L.push("Income: " + rmb0(s.inc) + (s.inc ? " from " + Object.entries(s.byInc).map(([c, v]) => catById(c).name + " " + rmb0(v.rmb)).join(", ") : " (none recorded)"));
    L.push("Spent (excluding savings): " + rmb0(s.rmb) + "; moved to savings/investing: " + rmb0(s.saved) + "; left: " + rmb0(s.left));
    L.push("Needs " + rmb0(s.byKind.need) + ", wants " + rmb0(s.byKind.want) + ", savings " + rmb0(s.byKind.save));
    L.push("Last month spent: " + rmb0(prev.rmb) + ", income " + rmb0(prev.inc));
    L.push("\nSpending by section (amount, share, change vs last month, budget, main reasons):");
    Object.entries(s.byCat).sort((a, b) => b[1].rmb - a[1].rmb).forEach(([cid, v]) => {
      const c = catById(cid), p = (prev.byCat[cid] || { rmb: 0 }).rmb;
      L.push("- " + c.name + ": " + rmb0(v.rmb) + " (" + pct(v.rmb, s.rmb) + "%), last month " + rmb0(p) + (c.budget ? ", budget " + rmb0(c.budget) : "") + "; " +
        reasonsFor(v.items).slice(0, 5).map((r) => r.label + " " + rmb0(r.rmb) + (r.n > 1 ? " x" + r.n : "")).join(", "));
    });
    if (state.config.foodLimit > 0) {
      let ok = 0, tracked = 0;
      for (let d = 1; d <= days; d++) { const iso = key + "-" + pad(d); if (state.expenses.some((e) => e.date === iso)) { tracked++; if (foodOn(iso) <= state.config.foodLimit) ok++; } }
      L.push("\nDaily food limit " + rmb0(state.config.foodLimit) + " (groceries + dining): kept on " + ok + " of " + tracked + " logged days.");
    }
    L.push("\nBiggest expenses: " + s.list.slice().sort((a, b) => R(b) - R(a)).slice(0, 6).map((e) => (e.reason || catById(e.cat).name) + " " + rmb0(R(e)) + " (" + e.date + ")").join("; "));
    const pm = Object.create(null); s.list.forEach((e) => { pm[e.method || "Other"] = (pm[e.method || "Other"] || 0) + R(e); });
    L.push("Payment methods: " + Object.entries(pm).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + rmb0(v)).join(", "));
    if (state.config.bills.length) L.push("Monthly bills set up: " + state.config.bills.map((b) => b.name + " " + (b.currency === "RMB" ? rmb0(b.amount) : usd0(b.amount)) + (b.type === "income" ? " (income)" : "")).join(", "));
    L.push("Exchange rate: 1 USD = " + state.config.rate + " CNY.");
    return L.join("\n");
  }
  function reviewPrompt(key) {
    return "You are a calm, practical personal finance advisor. Write a monthly money review for one person, based only on the data below. " +
      "Amounts are Chinese yuan (¥). Be specific: use their real numbers, sections and reasons. No praise filler, no streaks or games, no generic tips that ignore the data, no investment product recommendations. " +
      "If the month is still in progress, say so and project the month end from the pace so far. If no income was recorded, say what that means for the review.\n\n" +
      "Use plain text in exactly this format:\n## In one sentence\n(one sentence)\n## What stood out\n- 3 or 4 bullets\n## Where you could save\n- 2 or 3 bullets, each with a realistic ¥ amount per month\n## Plan for next month\n- 2 or 3 concrete actions, such as a suggested budget for a named section\n\n" +
      "Keep it under 230 words, in simple English.\n\nDATA\n" + reviewData(key);
  }
  function reviewCardHTML(key) {
    const saved = state.reviews[key];
    if (!canAsk() && !(saved && saved.text)) return "";
    let body;
    if (reviewLive && reviewLive.key === key) body = '<div class="review-body' + (reviewLive.text ? "" : " thinking") + '" id="review-body">' + (reviewLive.text ? formatReview(reviewLive.text) : "Reading your month… this can take up to a minute.") + "</div>" +
      '<div class="review-meta"><span>Written by Claude from your entries</span><button type="button" class="btn small" id="review-stop">Stop</button></div>';
    else if (saved && saved.text) body = '<div class="review-body" id="review-body">' + formatReview(saved.text) + "</div>" +
      '<div class="review-meta"><span>Written by Claude on ' + esc(new Date(saved.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + (saved.count != null && saved.count !== statsFor(key).count ? " · your entries changed since" : "") + "</span>" + (canAsk() ? '<button type="button" class="btn small" id="review-go">Write again</button>' : "") + "</div>";
    else body = '<p class="hint" style="margin:0">Claude reads this month\'s entries and writes a short review: what stood out, where you could save, and a plan for next month. It uses your own Claude account.</p>' +
      '<div><button type="button" class="btn primary" id="review-go">Write my review</button></div>';
    if (state.reviews[key] === undefined && store && store.getReview) {
      state.reviews[key] = null;
      store.getReview(key).then((r) => { if (r && r.text) { state.reviews[key] = r; if (state.view === "report" && state.month === key) renderReport(); } }).catch(() => {});
    }
    return '<div class="card stack" id="review-card"><div class="head"><h2>Money review</h2><span class="hint">by Claude</span></div>' + body + '<div class="form-msg" id="review-msg"></div></div>';
  }
  function bindReview(el, key) {
    const go = el.querySelector("#review-go"), stop = el.querySelector("#review-stop");
    if (stop) stop.onclick = () => { if (reviewCtl) reviewCtl.abort(); };
    if (!go) return;
    go.onclick = async () => {
      if (!canAsk()) return;
      reviewCtl = new AbortController();
      reviewLive = { key, text: "" };
      renderReport();
      try {
        const res = await sampleFn(reviewPrompt(key), { signal: reviewCtl.signal, cache: false, onText: ({ text }) => {
          reviewLive.text = text; const b = $("review-body"); if (b) { b.classList.remove("thinking"); b.innerHTML = formatReview(text); }
        } });
        const rec = { text: res.text, at: Date.now(), count: statsFor(key).count };
        state.reviews[key] = rec;
        try { await store.saveReview(key, rec); } catch (e) {}
        reviewLive = null; renderReport();
      } catch (e) {
        blockIfPermanent(e);
        const partial = e && e.text;
        reviewLive = null;
        if (partial && e.code !== "refused") state.reviews[key] = { text: partial + "\n\n(The review was cut short.)", at: Date.now(), count: statsFor(key).count };
        renderReport();
        const m = $("review-msg");
        if (m && e && e.code !== "cancelled") m.textContent = e.code === "rate_limited" ? "Claude is busy or your usage limit was reached. Try again later." : e.code === "not_granted" ? "Claude was not allowed for this page, so the review is off." : "The review could not be written right now. Try again in a moment.";
      }
    };
  }
  // Week report: Monday to Sunday, every section's total, day by day, compared with the week before.
  const weekStart = () => state.weekOf || mondayOf(todayISO());
  function weekStats(mon, len) {
    const days = Array.from({ length: len || 7 }, (_, i) => addDays(mon, i)), set = new Set(days);
    const st = { days, spent: 0, spentU: 0, inc: 0, saved: 0, byCat: Object.create(null), byDay: {}, list: [], count: 0 };
    state.expenses.forEach((e) => {
      if (!set.has(e.date)) return;
      st.count++;
      if (isInc(e)) { st.inc += R(e); return; }
      if (isSave(e)) { st.saved += R(e); return; }
      st.spent += R(e); st.spentU += U(e); st.list.push(e);
      const c = (st.byCat[e.cat] = st.byCat[e.cat] || { rmb: 0, usd: 0, count: 0, items: [] });
      c.rmb += R(e); c.usd += U(e); c.count++; c.items.push(e);
      st.byDay[e.date] = (st.byDay[e.date] || 0) + R(e);
    });
    return st;
  }
  function weekReportHTML() {
    const mon = weekStart(), sun = addDays(mon, 6), w = weekStats(mon), pw = weekStats(addDays(mon, -7));
    const thisWeek = mon === mondayOf(todayISO());
    const wd = (iso) => new Date(iso + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const range = wd(mon) + " – " + wd(sun);
    let cmp = "";
    if (pw.spent > 0) { const d = Math.round(((w.spent - pw.spent) / pw.spent) * 100); cmp = Math.abs(d) < 3 ? "About the same as the week before" : '<span class="' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ " : "▼ ") + Math.abs(d) + "%</span> vs the week before (" + rmb0(pw.spent) + ")"; }
    let html = '<div class="card report-hero"><div class="week-nav"><button type="button" class="icon-btn" data-wk="-1" aria-label="Previous week">‹</button><div class="label">' + (thisWeek ? "This week · " : "") + esc(range) + '</div><button type="button" class="icon-btn" data-wk="1" aria-label="Next week"' + (thisWeek ? " disabled" : "") + ">›</button></div>" +
      '<div class="total out-amt" data-v="' + w.spent + '">' + rmb0(w.spent) + '</div><div class="total-alt usd">' + usd(w.spentU) + "</div>" +
      '<div class="line">' + (cmp || (w.count ? "First week with entries" : "Nothing logged this week")) + "</div>" +
      (w.inc > 0 || w.saved > 0 ? '<div class="sum-line">' + (w.inc > 0 ? '<span class="inc">Income <b>' + rmb0(w.inc) + "</b></span>" : "") + (w.saved > 0 ? "<span>Saved <b>" + rmb0(w.saved) + "</b></span>" : "") + "</div>" : "") +
      (!thisWeek ? '<div style="margin-top:12px"><button type="button" class="btn small" data-wk="0">Back to this week</button></div>' : "") + "</div>";
    if (!w.list.length) return html + '<div class="card empty-state"><h3>No spending in this week</h3>Use ‹ to look at earlier weeks.</div>';
    html += weekRunChart(mon);
    const rows = Object.entries(w.byCat).sort((a, b) => b[1].rmb - a[1].rmb);
    html += '<div class="card stack"><div class="head"><h2>By section</h2><span class="hint">tap a section to see what it was</span></div><div class="donut-wrap">' +
      donutSVG(rows.map(([cid, v]) => ({ name: catById(cid).name, color: catById(cid).color, rmb: v.rmb })), w.spent) + "</div><div>" +
      rows.map(([cid, v]) => {
        const c = catById(cid), p = (pw.byCat[cid] || { rmb: 0 }).rmb, d = v.rmb - p;
        const change = pw.spent > 0 ? (Math.abs(d) < 0.5 ? "same as the week before" : '<span class="' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ " : "▼ ") + rmb0(Math.abs(d)) + "</span> vs the week before") : v.count + " entr" + (v.count === 1 ? "y" : "ies");
        return '<details class="where"><summary>' + tile(c, "tile sm") + '<span class="name">' + esc(c.name) + "<small>" + change + '</small></span><span class="pct">' + pct(v.rmb, w.spent) + '%</span><span class="amt out-amt">' + rmb0(v.rmb) + '<small class="usd">' + usd0(v.usd) + "</small></span></summary>" +
          '<div class="entries where-entries wk">' + v.items.slice().sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : (b.createdAt || 0) - (a.createdAt || 0))).map((e) => entryHTML(e, "week")).join("") + "</div></details>";
      }).join("") +
      '<div class="where-total"><span>Total spent</span><b class="out-amt">' + rmb0(w.spent) + "</b></div></div></div>";
    const maxD = Math.max(1, ...w.days.map((d) => w.byDay[d] || 0));
    html += '<div class="card stack"><div class="head"><h2>Day by day</h2><span class="hint">spending</span></div><div>' +
      w.days.map((d) => { const v = w.byDay[d] || 0; return '<div class="hbar' + (v === maxD && v > 0 ? " top" : "") + '"><span class="l">' + esc(new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) + (d === todayISO() ? " ·" : "") + '</span><span class="b"><i style="width:' + (v / maxD) * 100 + '%"></i></span><span class="v">' + (d > todayISO() ? "" : rmb0(v)) + "</span></div>"; }).join("") +
      '</div><p class="hint" style="margin:0">Average ' + rmb0(w.spent / Math.max(1, thisWeek ? ((new Date().getDay() + 6) % 7) + 1 : 7)) + " a day" + (thisWeek ? " so far" : "") + ".</p></div>";
    return html;
  }
  // Day report: one day's spending by section, compared with the day before and with your average day.
  const dayOf = () => state.dayOf || todayISO();
  function dayReportHTML() {
    const d = dayOf(), today = todayISO(), isToday = d === today, w = weekStats(d, 1), pd = weekStats(addDays(d, -1), 1);
    const prevWord = isToday ? "yesterday" : "the day before";
    // your average day: spending from your first entry up to the day before this one
    const firstIso = state.expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");
    let avg = 0;
    if (firstIso && firstIso < d) {
      const [fy, fm, fd] = firstIso.split("-").map(Number), [y, m, dd] = d.split("-").map(Number);
      const n = Math.round((new Date(y, m - 1, dd) - new Date(fy, fm - 1, fd)) / 864e5);
      const tot = state.expenses.filter((e) => isSpend(e) && !isFixed(e) && e.date >= firstIso && e.date < d).reduce((a, e) => a + R(e), 0);
      avg = n > 0 ? tot / n : 0;
    }
    const label = (isToday ? "Today · " : d === addDays(today, -1) ? "Yesterday · " : "") + new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    let cmp = "";
    if (pd.spent > 0) { const x = Math.round(((w.spent - pd.spent) / pd.spent) * 100); cmp = Math.abs(x) < 3 ? "About the same as " + prevWord : '<span class="' + (x > 0 ? "up" : "down") + '">' + (x > 0 ? "▲ " : "▼ ") + Math.abs(x) + "%</span> vs " + prevWord + " (" + rmb0(pd.spent) + ")"; }
    const lim = state.config.foodLimit, food = foodOn(d);
    let html = '<div class="card report-hero"><div class="week-nav"><button type="button" class="icon-btn" data-dy="-1" aria-label="Previous day">‹</button><div class="label">' + esc(label) + '</div><button type="button" class="icon-btn" data-dy="1" aria-label="Next day"' + (isToday ? " disabled" : "") + ">›</button></div>" +
      '<div class="total out-amt" data-v="' + w.spent + '">' + rmb0(w.spent) + '</div><div class="total-alt usd">' + usd(w.spentU) + "</div>" +
      '<div class="line">' + (cmp || (w.count ? "Nothing spent " + prevWord : "Nothing logged on this day")) + "</div>" +
      (avg > 0 ? '<div class="line">Your average day: <b>' + rmb0(avg) + "</b>" + (w.spent > 0 ? (w.spent > avg ? ' · <span class="up">' + rmb0(w.spent - avg) + " more</span>" : ' · <span class="down">' + rmb0(avg - w.spent) + " less</span>") : "") + "</div>" : "") +
      (lim > 0 && w.count ? '<div class="line">Food ' + rmb0(food) + " of " + rmb0(lim) + (food > lim ? ' · <span class="up">' + rmb0(food - lim) + " over</span>" : ' · <span class="down">' + rmb0(lim - food) + " left</span>") + "</div>" : "") +
      (w.inc > 0 || w.saved > 0 ? '<div class="sum-line">' + (w.inc > 0 ? '<span class="inc">Income <b>' + rmb0(w.inc) + "</b></span>" : "") + (w.saved > 0 ? "<span>Saved <b>" + rmb0(w.saved) + "</b></span>" : "") + "</div>" : "") +
      (!isToday ? '<div style="margin-top:12px"><button type="button" class="btn small" data-dy="0">Back to today</button></div>' : "") + "</div>";
    if (!w.list.length) return html + '<div class="card empty-state"><h3>No spending on this day</h3>Use ‹ to look at earlier days.</div>';
    html += dayRunChart(d);
    const rows = Object.entries(w.byCat).sort((a, b) => b[1].rmb - a[1].rmb);
    html += '<div class="card stack"><div class="head"><h2>By section</h2><span class="hint">tap a section to see what it was</span></div><div class="donut-wrap">' +
      donutSVG(rows.map(([cid, v]) => ({ name: catById(cid).name, color: catById(cid).color, rmb: v.rmb })), w.spent) + "</div><div>" +
      rows.map(([cid, v]) => {
        const c = catById(cid), p = (pd.byCat[cid] || { rmb: 0 }).rmb, x = v.rmb - p;
        const change = pd.spent > 0 ? (Math.abs(x) < 0.5 ? "same as " + prevWord : '<span class="' + (x > 0 ? "up" : "down") + '">' + (x > 0 ? "▲ " : "▼ ") + rmb0(Math.abs(x)) + "</span> vs " + prevWord) : v.count + (v.count === 1 ? " entry" : " entries");
        return '<details class="where"><summary>' + tile(c, "tile sm") + '<span class="name">' + esc(c.name) + "<small>" + change + '</small></span><span class="pct">' + pct(v.rmb, w.spent) + '%</span><span class="amt out-amt">' + rmb0(v.rmb) + '<small class="usd">' + usd0(v.usd) + "</small></span></summary>" +
          '<div class="entries where-entries">' + v.items.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((e) => entryHTML(e, true)).join("") + "</div></details>";
      }).join("") +
      '<div class="where-total"><span>Total spent</span><b class="out-amt">' + rmb0(w.spent) + "</b></div></div></div>";
    return html;
  }
  function bindDay(el) {
    el.querySelectorAll("[data-dy]").forEach((b) => (b.onclick = () => {
      const k = Number(b.dataset.dy);
      state.dayOf = k === 0 ? null : addDays(dayOf(), k);
      if (state.dayOf && state.dayOf >= todayISO()) state.dayOf = null;
      renderReport();
      if (k) { const v = $("v-report"); v.classList.remove("slide-next", "slide-prev"); void v.offsetWidth; v.classList.add(k < 0 ? "slide-prev" : "slide-next"); }
    }));
  }
  function bindWeek(el) {
    el.querySelectorAll("[data-wk]").forEach((b) => (b.onclick = () => {
      const k = Number(b.dataset.wk);
      state.weekOf = k === 0 ? null : addDays(weekStart(), 7 * k);
      if (state.weekOf && state.weekOf >= mondayOf(todayISO())) state.weekOf = null;
      state.slide = k < 0 ? "prev" : k > 0 ? "next" : null;
      renderReport();
      if (state.slide) { const v = $("v-report"); v.classList.remove("slide-next", "slide-prev"); void v.offsetWidth; v.classList.add("slide-" + state.slide); state.slide = null; }
    }));
  }
  function yearHTML() {
    const y = state.month.slice(0, 4), cm = curMonth();
    const months = Array.from({ length: 12 }, (_, i) => y + "-" + pad(i + 1));
    const st = months.map(statsFor);
    const total = st.reduce((a, s) => a + s.rmb, 0), totalU = st.reduce((a, s) => a + s.usd, 0);
    const yInc = st.reduce((a, s) => a + s.inc, 0), ySaved = st.reduce((a, s) => a + s.saved, 0);
    if (!total && !yInc) return '<div class="card empty-state"><h3>Nothing logged in ' + y + "</h3>Add expenses and this view shows the whole year month by month.</div>";
    const active = st.filter((s) => s.count > 0).length, max = Math.max(1, ...st.map((s) => Math.max(s.rmb, s.inc)));
    const bi = st.reduce((bi, s, i) => (s.rmb > st[bi].rmb ? i : bi), 0);
    const bars = months.map((m, i) => {
      const s = st[i], future = m > cm;
      return '<button type="button" class="ybar' + (m === state.month ? " sel" : "") + '" style="--i:' + i + '" data-goto-month="' + m + '"' + (future && !s.count ? " disabled" : "") + ' title="' + esc(monthName(m)) + ": " + rmb0(s.rmb) + '"><span class="yv">' + (s.rmb ? compactRmb(s.rmb) : "") + '</span><span class="yb">' + (s.inc > 0 ? '<i class="ghost" style="height:' + (s.inc / max) * 100 + '%"></i>' : "") + '<i style="height:' + (s.rmb / max) * 100 + '%"></i></span><span class="yl">' + monthName(m, { month: "short" }) + "</span></button>";
    }).join("");
    const byCat = Object.create(null);
    st.forEach((s) => Object.entries(s.byCat).forEach(([c, v]) => { byCat[c] = byCat[c] || { r: 0, u: 0 }; byCat[c].r += v.rmb; byCat[c].u += v.usd; }));
    const rows = Object.entries(byCat).sort((a, b) => b[1].r - a[1].r).map(([cid, v]) => {
      const c = catById(cid);
      return '<div class="yrow">' + tile(c, "tile sm") + '<span class="name">' + esc(c.name) + "<small>about " + rmb0(v.r / Math.max(active, 1)) + " a month</small></span>" + '<span class="pct">' + pct(v.r, total) + '%</span><span class="amt out-amt">' + rmb0(v.r) + '<small class="usd">' + usd0(v.u) + "</small></span></div>";
    }).join("");
    return '<div class="card report-hero"><div class="label">Spent in ' + y + ' so far</div><div class="total out-amt" data-v="' + total + '">' + rmb0(total) + '</div><div class="total-alt usd">' + usd(totalU) + '</div><div class="line">About ' + rmb0(total / Math.max(active, 1)) + " a month · biggest month " + esc(monthName(months[bi], { month: "long" })) + " (" + rmb0(st[bi].rmb) + ")</div>" +
      (yInc > 0 || ySaved > 0 ? '<div class="sum-line"><span class="inc">Income <b>' + rmb0(yInc) + "</b></span><span>Saved <b>" + rmb0(ySaved) + "</b></span>" + (yInc > 0 ? "<span>Left <b>" + rmb0(yInc - total - ySaved) + "</b></span><span>Savings rate <b>" + pct(yInc - total, yInc) + "%</b></span>" : "") + "</div>" : "") + "</div>" +
      '<div class="report-grid"><div class="card stack"><div class="head"><h2>Month by month</h2><span class="hint">' + (yInc > 0 ? "dark = spent, green = income · " : "") + "tap a month</span></div><div class=\"ybars\">" + bars + "</div></div>" +
      '<div class="card stack"><div class="head"><h2>Sections this year</h2></div><div>' + rows + "</div></div></div>";
  }

  let lastReportAnim = null;
  // Each card animates the first time at least a quarter of it is on screen, once per month/mode.
  let reportObserver = null;
  const playedCards = new Set();
  // Running total chart: the line climbs as money is spent; a faint line shows the period before. Touch it to read a point.
  const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))); for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v * 1.06) return m * p; return 10 * p; };
  function runChartHTML(o) {
    const W = 600, H = 190, top = 8;
    const all = o.pts.concat(o.ghost || [], o.proj || []);
    const yMax = niceMax(Math.max(10, ...all.map((p) => p[1])));
    const X = (x) => (x / o.xMax) * W, Y = (y) => H - (y / yMax) * (H - top);
    const f = (n) => n.toFixed(1);
    const path = (ps, step) => ps.map((p, i) => (i === 0 ? "M" + f(X(p[0])) + "," + f(Y(p[1])) : step ? "H" + f(X(p[0])) + "V" + f(Y(p[1])) : "L" + f(X(p[0])) + "," + f(Y(p[1])))).join("");
    const main = path(o.pts, o.step), last = o.pts[o.pts.length - 1];
    const area = main + "V" + H + "H" + f(X(o.pts[0][0])) + "Z";
    const grid = [1, 2, 3].map((i) => { const v = (yMax / 3) * i; return '<div class="lc-g" style="bottom:' + ((v / yMax) * (H - top) / H) * 100 + '%"><span>' + compactRmb(v) + "</span></div>"; }).join("");
    const ticks = o.ticks.map(([x, l]) => '<span style="left:' + (x / o.xMax) * 100 + '%">' + esc(l) + "</span>").join("");
    const hov = o.hover.map(([x, y, t]) => [Math.round((x / o.xMax) * 1000) / 10, Math.round((Y(y) / H) * 1000) / 10, t]);
    return '<div class="card stack lc-card"><div class="head"><h2>' + esc(o.title) + '</h2><span class="hint">' + o.hint + "</span></div>" +
      '<div class="lc" data-pts="' + esc(JSON.stringify(hov)) + '"><div class="lc-plot">' + grid +
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lcfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bad)" stop-opacity=".22"/><stop offset="1" stop-color="var(--bad)" stop-opacity="0"/></linearGradient></defs>' +
      (o.ghost && o.ghost.length > 1 ? '<path class="lc-ghost" d="' + path(o.ghost, o.step) + '"/>' : "") +
      (o.proj ? '<path class="lc-proj" d="' + path(o.proj, false) + '"/>' : "") +
      '<g class="lc-draw"><path class="lc-area" d="' + area + '"/><path class="lc-line" d="' + main + '"/></g></svg>' +
      '<i class="lc-end" style="left:' + (last[0] / o.xMax) * 100 + "%;top:" + (Y(last[1]) / H) * 100 + '%"></i><i class="lc-dot" hidden></i><div class="lc-tip" hidden></div></div>' +
      '<div class="lc-x">' + ticks + "</div></div>" +
      (o.foot ? '<p class="hint" style="margin:0">' + o.foot + "</p>" : "") + "</div>";
  }
  function bindRunCharts(root) {
    root.querySelectorAll(".lc").forEach((box) => {
      let pts = []; try { pts = JSON.parse(box.dataset.pts || "[]"); } catch (e) {}
      if (!pts.length) return;
      const plot = box.querySelector(".lc-plot"), dot = box.querySelector(".lc-dot"), tip = box.querySelector(".lc-tip");
      const show = (ev) => {
        const r = plot.getBoundingClientRect(), xp = ((ev.clientX - r.left) / r.width) * 100;
        let best = pts[0]; pts.forEach((p) => { if (Math.abs(p[0] - xp) < Math.abs(best[0] - xp)) best = p; });
        dot.hidden = tip.hidden = false;
        dot.style.left = best[0] + "%"; dot.style.top = best[1] + "%";
        tip.innerHTML = best[2];
        const tw = tip.offsetWidth, px = (best[0] / 100) * r.width;
        tip.style.left = Math.max(0, Math.min(r.width - tw, px - tw / 2)) + "px";
        tip.style.top = Math.max(0, (best[1] / 100) * r.height - tip.offsetHeight - 12) + "px";
      };
      plot.addEventListener("pointermove", show);
      plot.addEventListener("pointerdown", show);
      plot.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") dot.hidden = tip.hidden = true; });
    });
  }
  const hhmm = (h) => pad(Math.floor(h)) + ":" + pad(Math.round((h % 1) * 60) % 60);
  const entryHour = (e) => { if (!e.createdAt) return 0; const t = new Date(e.createdAt); return isoOf(t) === e.date ? t.getHours() + t.getMinutes() / 60 : 0; };
  // cumulative spending through one day, step by step in the order you added it
  function dayRun(iso) {
    const list = state.expenses.filter((e) => e.date === iso && isSpend(e)).map((e) => ({ e, h: entryHour(e) })).sort((a, b) => a.h - b.h || (a.e.createdAt || 0) - (b.e.createdAt || 0));
    let c = 0; const pts = [[0, 0]], hover = [];
    list.forEach(({ e, h }) => { c += R(e); pts.push([h, c]); hover.push([h, c, "<b>" + (h ? hhmm(h) : "No time") + "</b> · " + esc((e.reason || catById(e.cat).name).slice(0, 28)) + ' <span class="out-amt">−' + rmb0(R(e)) + "</span><br>" + rmb0(c) + " so far"]); });
    return { pts, hover, total: c };
  }
  function dayRunChart(iso) {
    const today = todayISO(), isToday = iso === today, now = new Date(), nowH = now.getHours() + now.getMinutes() / 60;
    const r = dayRun(iso), y = dayRun(addDays(iso, -1));
    if (!r.hover.length) return "";
    const end = isToday ? Math.max(nowH, r.pts[r.pts.length - 1][0]) : 24;
    r.pts.push([end, r.total]);
    y.pts.push([24, y.total]);
    const prevWord = isToday ? "yesterday" : "the day before";
    let byNow = 0; if (isToday) { y.pts.forEach((p) => { if (p[0] <= nowH) byNow = p[1]; }); }
    const foot = isToday && y.total > 0 ? (r.total > byNow ? 'By this time ' + prevWord + " you had spent " + rmb0(byNow) + ', so today is <span class="up">' + rmb0(r.total - byNow) + " ahead</span>." : 'By this time ' + prevWord + " you had spent " + rmb0(byNow) + ', so today is <span class="down">' + rmb0(byNow - r.total) + " behind</span>.") : "";
    const untimed = r.hover.filter((h) => h[0] === 0).length;
    return runChartHTML({ title: "Through the day", hint: "red = this day · grey = " + prevWord, xMax: 24, step: true, pts: r.pts, ghost: y.pts, hover: r.hover,
      ticks: [[0, "00"], [6, "06"], [12, "12"], [18, "18"], [24, "24"]],
      foot: foot + (untimed ? (foot ? " " : "") + untimed + (untimed === 1 ? " entry was" : " entries were") + " added on another day, so " + (untimed === 1 ? "it starts" : "they start") + " the line at 00:00." : "") });
  }
  function weekRunChart(mon) {
    const today = todayISO(), cur = mon === mondayOf(today);
    const run = (m) => { let c = 0; return Array.from({ length: 7 }, (_, i) => { const d = addDays(m, i), v = state.expenses.filter((e) => e.date === d && isSpend(e)).reduce((a, e) => a + R(e), 0); c += v; return { d, v, c }; }); };
    const w = run(mon), p = run(addDays(mon, -7));
    const upto = cur ? w.findIndex((x) => x.d === today) + 1 : 7;
    if (!w.slice(0, upto).some((x) => x.v > 0)) return "";
    const pts = [[0, 0]].concat(w.slice(0, upto).map((x, i) => [i + 1, x.c]));
    const ghost = [[0, 0]].concat(p.map((x, i) => [i + 1, x.c]));
    const lbl = (d) => new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const hover = w.slice(0, upto).map((x, i) => [i + 1, x.c, "<b>" + lbl(x.d) + "</b> · " + rmb0(x.v) + " that day<br>" + rmb0(x.c) + " so far · last week " + rmb0(p[i].c)]);
    const a = w[upto - 1].c, b = p[upto - 1].c;
    const foot = b > 0 ? "By " + lbl(w[upto - 1].d).split(",")[0] + " last week you had spent " + rmb0(b) + (a > b ? ', this week is <span class="up">' + rmb0(a - b) + " more</span>." : ', this week is <span class="down">' + rmb0(b - a) + " less</span>.") : "";
    return runChartHTML({ title: "Week so far", hint: "red = this week · grey = last week", xMax: 7, pts, ghost, hover,
      ticks: ["M", "T", "W", "T", "F", "S", "S"].map((l, i) => [i + 0.5, l]), foot });
  }
  function monthRunChart(key, s, proj) {
    const n = daysIn(key), cur = key === curMonth(), upto = cur ? Number(todayISO().slice(8, 10)) : n;
    const byDay = (list) => { const o = {}; list.forEach((e) => { const d = Number(e.date.slice(8, 10)); o[d] = (o[d] || 0) + R(e); }); return o; };
    const a = byDay(s.list), pk = shiftMonth(key, -1), pb = byDay(statsFor(pk).list), pn = daysIn(pk);
    let c = 0; const pts = [[0, 0]], hover = [];
    for (let d = 1; d <= upto; d++) { c += a[d] || 0; pts.push([d, c]); }
    let g = 0; const ghost = [[0, 0]], gAt = [0];
    for (let d = 1; d <= Math.min(pn, n); d++) { g += pb[d] || 0; ghost.push([d, g]); gAt[d] = g; }
    const hasPrev = g > 0;
    c = 0;
    for (let d = 1; d <= upto; d++) { c += a[d] || 0; hover.push([d, c, "<b>" + esc(monthName(key, { month: "short" })) + " " + d + "</b> · " + rmb0(a[d] || 0) + " that day<br>" + rmb0(c) + " so far" + (hasPrev ? " · last month " + rmb0(gAt[Math.min(d, gAt.length - 1)] || 0) : "")]); }
    const projPts = cur && proj > c && upto < n ? [[upto, c], [n, proj]] : null;
    const ticks = [1, 8, 15, 22, n].map((d) => [d, String(d)]);
    const lastAt = gAt[Math.min(upto, gAt.length - 1)] || 0;
    const foot = (hasPrev ? "On day " + upto + " last month you had spent " + rmb0(lastAt) + (c > lastAt ? ', this month is <span class="up">' + rmb0(c - lastAt) + " more</span>." : ', this month is <span class="down">' + rmb0(lastAt - c) + " less</span>.") : "") +
      (projPts ? (hasPrev ? " " : "") + "The dotted line is where this pace takes you: about <b>" + rmb0(proj) + "</b>." : "");
    return runChartHTML({ title: "Month so far", hint: "red = this month" + (hasPrev ? " · grey = last month" : "") + (projPts ? " · dotted = pace" : ""), xMax: n, pts, ghost: hasPrev ? ghost : null, proj: projPts, hover, ticks, foot });
  }
  function playOnView(root, key) {
    if (reportObserver) reportObserver.disconnect();
    if (reduceMotion() || !("IntersectionObserver" in window)) return;
    const cards = Array.from(root.querySelectorAll(".card"));
    cards.forEach((c, i) => { const h = c.querySelector("h2"); c.dataset.pk = key + "#" + (h ? h.textContent : i); });
    reportObserver = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const c = en.target; reportObserver.unobserve(c);
        if (playedCards.has(c.dataset.pk)) return;
        playedCards.add(c.dataset.pk);
        c.classList.remove("play"); void c.offsetWidth; c.classList.add("play");
      });
    }, { threshold: 0.25 });
    cards.forEach((c) => { if (!playedCards.has(c.dataset.pk)) reportObserver.observe(c); });
  }
  const heroCount = (el) => { const t = el.querySelector(".report-hero .total[data-v]"); if (t) countUp(t, "rep-" + state.reportMode, Number(t.dataset.v), rmb0); };
  function renderReport() {
    const key = state.month, s = statsFor(key), prev = statsFor(shiftMonth(key, -1));
    const el = $("v-report");
    const animKey = state.reportMode + "|" + (state.reportMode === "week" ? weekStart() : state.reportMode === "day" ? dayOf() : key);
    const toggle = '<div class="mode-row on-bg"><div class="seg" role="group" aria-label="Report period"><button type="button" data-mode="day" aria-pressed="' + (state.reportMode === "day") + '">Day</button><button type="button" data-mode="week" aria-pressed="' + (state.reportMode === "week") + '">Week</button><button type="button" data-mode="month" aria-pressed="' + (state.reportMode === "month") + '">Month</button><button type="button" data-mode="year" aria-pressed="' + (state.reportMode === "year") + '">Year</button></div></div>';
    if (!state.loaded) { el.innerHTML = '<div class="card">' + skeletonRows(4) + "</div>"; return; }
    if (state.reportMode === "year") { el.innerHTML = toggle + yearHTML(); bindMode(el); heroCount(el); playOnView(el, animKey); return; }
    if (state.reportMode === "day") { el.innerHTML = toggle + dayReportHTML(); bindMode(el); bindDay(el); bindRunCharts(el); bindEntries(el); heroCount(el); playOnView(el, animKey); return; }
    if (state.reportMode === "week") { el.innerHTML = toggle + weekReportHTML(); bindMode(el); bindWeek(el); bindRunCharts(el); bindEntries(el); heroCount(el); playOnView(el, animKey); return; }
    const week = key === curMonth() ? weekHTML() : "";
    if (!s.count) {
      el.innerHTML = toggle + week + '<div class="card empty-state"><h3>No report for ' + esc(monthName(key)) + ' yet</h3>Add expenses during the month. This page then shows where your money went and why.</div>';
      bindMode(el); return;
    }
    const inc = s.inc;
    // days since you started logging, so a month you began mid-way is not divided by days before your first entry
    const firstIso = state.expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");
    const firstDay = firstIso.slice(0, 7) === key ? Number(firstIso.slice(8, 10)) : 1;
    const daysElapsed = Math.max(1, (key === curMonth() ? Number(todayISO().slice(8, 10)) : daysIn(key)) - firstDay + 1);
    const flexSoFar = s.list.filter((e) => !isFixed(e)).reduce((a, e) => a + R(e), 0);
    let line = "About " + rmb0(flexSoFar / Math.max(daysElapsed, 1)) + " a day on flexible spending";
    const daysLeft = key === curMonth() ? daysIn(key) - Number(todayISO().slice(8, 10)) : 0;
    if (daysLeft > 0) line += " · heading for about " + rmb0(s.rmb + (flexSoFar / daysElapsed) * daysLeft) + " by month end";
    const rows = Object.entries(s.byCat).map(([cid, v]) => ({ cid, v, name: catById(cid).name, color: catById(cid).color, rmb: v.rmb })).sort((a, b) => b.rmb - a.rmb);

    let html = '<div class="card report-hero"><div class="label">Spent in ' + esc(monthName(key)) + (key === curMonth() ? " so far" : "") + '</div><div class="total out-amt" data-v="' + s.rmb + '">' + rmb0(s.rmb) + '</div><div class="total-alt usd">' + usd(s.usd) + '</div><div class="line">' + line + "</div></div>" + monthRunChart(key, s, daysLeft > 0 ? s.rmb + (flexSoFar / daysElapsed) * daysLeft : 0) + calendarCardHTML(s, key) + week;
    if (s.inc > 0 || s.saved > 0) {
      const cell = (l, v, u, cls) => '<div><div class="lbl">' + l + '</div><div class="val' + (cls ? " " + cls : "") + '">' + rmb0(v) + '<small class="usd">' + usd0(u) + "</small></div></div>";
      const rate = s.inc > 0 ? pct(s.inc - s.rmb, s.inc) : 0;
      html += '<div class="card stack"><div class="head"><h2>Income vs spending</h2></div><div class="flow">' +
        cell("Income", s.inc, s.incU, "inc") + cell("Spent", s.rmb, s.usd, "out-amt") + cell("Saved", s.saved, s.savedU) + cell("Left", s.left, s.leftU, s.left < 0 ? "up" : "") + "</div>" +
        (s.inc > 0 ? '<div class="rate-line">Savings rate <span class="' + (rate >= 20 ? "down" : "up") + '" style="font-weight:800">' + rate + '%</span> <span class="muted">(saved + left, out of income). Aim for 20% or more.</span></div>' +
          "<div>" + Object.entries(s.byInc).sort((a, b) => b[1].rmb - a[1].rmb).map(([cid, v]) => { const c = catById(cid); return '<div class="yrow">' + tile(c, "tile sm") + '<span class="name">' + esc(c.name) + "<small>" + esc(reasonsFor(v.items).filter((r) => r.label !== NO_REASON).slice(0, 2).map((r) => r.label).join(", ") || nOf(v.count, "entry", "entries")) + '</small></span><span class="pct">' + pct(v.rmb, s.inc) + '%</span><span class="amt inc-amt">+' + rmb0(v.rmb) + '<small class="usd">' + usd0(v.usd) + "</small></span></div>"; }).join("") + "</div>"
          : '<p class="hint" style="margin:0">Add income with the + button to see what is left and your savings rate.</p>') + "</div>";
    }
    html += '<div class="card stmt-card"><div style="min-width:0"><h2 style="font-size:17px;font-weight:800">Monthly statement</h2><p class="hint" style="margin:2px 0 0">A clean PDF of ' + esc(monthName(key, { month: "long" })) + ": where money came from, where it went, debts and every entry. Print it, share it or save it to Files.</p></div>" +
      '<button type="button" class="btn primary" id="stmt-go">Download PDF</button></div>';
    html += reviewCardHTML(key);
    html += '<div class="report-grid"><div class="card stack"><div class="head"><h2>Where it went</h2><span class="hint">tap a section to see why</span></div><div class="donut-wrap">' + donutSVG(rows, s.rmb) + "</div><div>" +
      rows.map((r) => {
        const c = catById(r.cid), v = r.v, p = (prev.byCat[r.cid] || { rmb: 0 }).rmb, d = v.rmb - p;
        const change = prev.rmb > 0 ? (Math.abs(d) < 1 ? "same as last month" : '<span class="' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ " : "▼ ") + rmb0(Math.abs(d)) + "</span> vs last month") : v.count + (v.count === 1 ? " entry" : " entries");
        const over = c.budget > 0 && v.rmb > c.budget;
        const bud = c.budget > 0 ? '<div class="bud"><div class="track"><div class="fill' + (over ? " over" : "") + '" style="width:' + Math.min((v.rmb / c.budget) * 100, 100) + "%;background:" + esc(c.color) + '"></div></div><div class="hint" style="font-size:12px;margin-top:4px">' + (over ? '<span class="up">' + rmb0(v.rmb - c.budget) + " over budget</span>" : rmb0(c.budget - v.rmb) + " left of " + rmb0(c.budget)) + "</div></div>" : "";
        return '<details class="where"><summary>' + tile(c, "tile sm") + '<span class="name">' + esc(c.name) + "<small>" + change + '</small></span><span class="pct">' + pct(v.rmb, s.rmb) + '%</span><span class="amt out-amt">' + rmb0(v.rmb) + '<small class="usd">' + usd0(v.usd) + "</small></span>" + bud + "</summary>" +
          (() => { const rs = reasonsFor(v.items), top = rs.slice(0, 6), maxR = Math.max(1, ...top.map((x) => x.rmb));
            return '<ul class="reason-list" style="--c:' + esc(c.color) + '">' + top.map((x) => '<li><span class="r"><span class="rl' + (x.label === NO_REASON ? " muted" : "") + '">' + esc(x.label) + "</span><small>" + (x.n > 1 ? x.n + " times · " : "") + pct(x.rmb, v.rmb) + '% of ' + esc(c.name) + '</small><i class="rb" style="width:' + (x.rmb / maxR) * 100 + '%"></i></span><span class="ra"><b>' + rmb0(x.rmb) + '</b><small class="usd">' + usd0(x.usd) + "</small></span></li>").join("") +
              (rs.length > top.length ? '<li class="more">+ ' + (rs.length - top.length) + " more, smaller ones</li>" : "") + "</ul>"; })() +
          '<button type="button" class="link-btn see-all" data-see-cat="' + esc(r.cid) + '">See all ' + v.count + " entr" + (v.count === 1 ? "y" : "ies") + " →</button></details>";
      }).join("") + "</div></div>";
    const tk = takeaways(s, prev, key);
    html += '<div class="stack"><div class="card stack"><div class="head"><h2>In short</h2></div><ul class="takeaways">' + tk.map((i) => '<li><span class="ico ' + i[0] + '">' + esc(i[1]) + "</span><span>" + i[2] + "</span></li>").join("") + "</ul></div>";
    const kb = s.byKind, base = inc > 0 ? inc : s.rmb + s.saved, kp = (v) => (base > 0 ? (v / base) * 100 : 0);
    html += '<div class="card"><div class="head" style="margin-bottom:14px"><h2>Needs, wants, savings</h2><span class="hint">' + (inc > 0 ? "of income" : "of spending") + "</span></div>" +
      '<div class="split-bar" role="img" aria-label="Needs ' + Math.round(kp(kb.need)) + "%, wants " + Math.round(kp(kb.want)) + "%, savings " + Math.round(kp(kb.save)) + '%">' +
      ["need", "want", "save"].map((k) => (kb[k] > 0 ? '<div class="k-' + k + '" style="width:' + Math.min(kp(kb[k]), 100) + '%"></div>' : "")).join("") + "</div>" +
      '<div class="split-legend">' + [["need", "Needs", "≤50%"], ["want", "Wants", "≤30%"], ["save", "Savings", "≥20%"]].map(([k, l, t]) =>
        '<div><div class="lbl"><span class="dot k-' + k + '"></span>' + l + '</div><div class="val">' + Math.round(kp(kb[k])) + '%</div><div class="tgt">' + rmb0(kb[k]) + (inc > 0 ? " · goal " + t : "") + "</div></div>").join("") + "</div></div>";
    const big = s.list.slice().sort((a, b) => R(b) - R(a)).slice(0, 3);
    html += '<div class="card"><div class="head"><h2>Biggest 3</h2></div><div class="entries" style="margin-top:6px">' + big.map(entryHTML).join("") + "</div></div></div></div>";
    html += patternsHTML(key, s);
    el.innerHTML = toggle + html;
    bindEntries(el);
    bindMode(el);
    bindRunCharts(el);
    bindReview(el, key);
    heroCount(el);
    playOnView(el, animKey);
    const sg = el.querySelector("#stmt-go"); if (sg) sg.onclick = () => makeStatement(key, sg);
  }

  // ---------- Wallets ----------
  // A wallet: {id, name, icon, color, methods: [payment methods that use it], balance, setAt}.
  // Its balance = the amount you set + every income into it − every expense paid from it, counting
  // only entries added after you set the balance, plus transfers in and out. Credit card is not a wallet.
  const DEFAULT_WALLETS = [
    { id: "cash", name: "Cash", icon: "w_cash", color: "#D9A11A", methods: ["Cash"] },
    { id: "wechat", name: "WeChat", icon: "w_wechat", color: "#07C160", methods: ["WeChat Pay"] },
    { id: "alipay", name: "Alipay", icon: "w_alipay", color: "#1677FF", methods: ["Alipay"] },
    { id: "bank", name: "Bank card", icon: "w_bank", color: "#4F6BED", methods: ["Bank card", "Bank transfer"] }
  ];
  const wTile = (w) => '<span class="tile" style="--c:' + esc(w.color) + '">' + icon(w.icon) + "</span>";
  // Wallets keep their own currency. A $ wallet counts in dollars; totals convert it to yuan at your rate.
  const wMoney = (w, n) => (wCur(w) === "USD" ? usd0(n) : rmb0(n));
  const convert = (n, fromCur, toCur) => (fromCur === toCur ? n : fromCur === "USD" ? n * state.config.rate : n / state.config.rate);
  const walletOf = (method) => (state.config.wallets || []).find((w) => w.methods.includes(method));
  // A balance "on" a past day means it was true at the start of that day, so entries dated that day count.
  const balanceTime = (iso) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || "")) || iso >= todayISO()) return Date.now(); const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
  const balanceDayText = (iso) => (iso && iso < todayISO() ? " at the start of " + shortDate(iso) : "");
// ---------- Money rules live in src/lib/ledger.js; these bind them to the app state ----------
  const monthList = (key) => monthListOf(state.expenses, key);
  const statsFor = (key) => statsOf(state.expenses, key);
  const wToRmb = (w, n) => wToRmbOf(w, n, state.config.rate);
  const inWalletCur = (w, d, amt) => inWalletCurOf(w, d, amt, state.config.rate);
  const walletMoves = (w) => walletMovesOf(w, { expenses: state.expenses, debts: state.debts, transfers: state.transfers, wallets: state.config.wallets || [] }, state.config.rate, (id) => catById(id).name);
  // what a wallet holds today: something dated in the future has not happened yet, so it counts from its own date
  const walletBalance = (w) => { const b = walletBalanceOn(w, { expenses: state.expenses, debts: state.debts, transfers: state.transfers, wallets: state.config.wallets || [] }, state.config.rate, todayISO()); return b == null ? w.balance : b; };
  async function saveWallets(wallets, msg) {
    try { await store.saveConfig({ ...state.config, wallets }); state.config = normalizeConfig({ ...state.config, wallets }); if (msg) toast(msg); renderAll(true); return true; }
    catch (e) { toast("Could not save. Try again.", true); return false; }
  }

  function renderWallets() {
    const el = $("v-wallets"), ws = state.config.wallets;
    if (!state.configLoaded) { el.innerHTML = '<div class="card">' + skeletonRows(4) + "</div>"; return; }
    if (!ws || !ws.length) {
      el.innerHTML = '<div class="card stack"><div class="head"><h2>Set up your wallets</h2></div>' +
        '<p class="hint" style="margin:0">Type how much money is in each one right now. After that the app keeps them up to date: paying with WeChat Pay lowers WeChat, income received in Alipay raises Alipay, and so on. Leave 0 for any you do not use.</p>' +
        DEFAULT_WALLETS.map((w) => '<div class="wsetup">' + wTile(w) + '<label for="ws-' + w.id + '" style="font-weight:700">' + esc(w.name) + '<div class="hint" style="font-weight:500">' + esc(w.methods.join(", ")) + '</div></label><input class="input" id="ws-' + w.id + '" inputmode="decimal" placeholder="¥0"></div>').join("") +
        '<div class="wform"><label for="ws-date" style="font-weight:700">These amounts are from</label><input class="input" type="date" id="ws-date" style="flex:0 1 170px"></div>' +
        '<p class="hint" style="margin:0">Leave today, or pick an earlier day if you will add entries from before today. Credit card spending is not taken from a wallet.</p>' +
        '<button type="button" class="btn primary big" id="ws-start" style="flex:none">Start tracking</button></div>';
      $("ws-date").value = todayISO(); $("ws-date").max = todayISO();
      $("ws-start").onclick = async () => {
        if ($("ws-date").value && !saneDate($("ws-date").value)) { toast("Check the date. The year looks wrong.", true); return; }
        const now = balanceTime($("ws-date").value);
        const bad =DEFAULT_WALLETS.find((w) => { const t = $("ws-" + w.id).value.trim(); return t && !isFinite(parseAmt(t)); });
        if (bad) { toast("Check the amount for " + bad.name + ", for example 1250.", true); return; }
        const list = DEFAULT_WALLETS.map((w) => { const v = parseAmt($("ws-" + w.id).value); return { ...w, balance: isFinite(v) ? round2(v) : 0, setAt: now }; });
        await saveWallets(list, "Wallets ready. They update as you add entries");
      };
      return;
    }
    const bals = ws.map((w) => ({ w, b: walletBalance(w), moves: walletMoves(w) }));
    bals.forEach((x) => { x.r = wToRmb(x.w, x.b); });
    const total = bals.reduce((a, x) => a + x.r, 0), pos = bals.filter((x) => x.r > 0), posT = pos.reduce((a, x) => a + x.r, 0);
    const usdHeld = bals.filter((x) => wCur(x.w) === "USD").reduce((a, x) => a + x.b, 0);
    const mk = curMonth();
    let html = '<div class="card stack wtotal"><div><div class="cap">Total money</div><div class="big' + (total < 0 ? " out-amt" : "") + '" id="w-total">' + rmb0(total) + '</div><div class="usd" style="font-size:15px">' + usd(total / state.config.rate) + "</div>" + (usdHeld ? '<div class="hint" style="margin-top:4px">Includes ' + usd0(usdHeld) + " in dollar wallets, counted at ¥" + state.config.rate.toFixed(2) + " = $1.</div>" : "") + "</div>" +
      (posT > 0 ? '<div class="wbar">' + pos.map((x) => '<div style="width:' + (x.r / posT) * 100 + "%;background:" + esc(x.w.color) + '" title="' + esc(x.w.name) + '"></div>').join("") + "</div>" : "") +
      '<div class="legend2">' + bals.map((x) => '<span><span class="dot" style="background:' + esc(x.w.color) + '"></span> ' + esc(x.w.name) + " <b>" + wMoney(x.w, x.b) + "</b></span>").join("") + "</div></div>";
    html += '<div class="card"><div class="head" style="margin-bottom:4px"><h2>Wallets</h2><span class="hint">tap one for details</span></div>' + bals.map(({ w, b, moves }) => {
      const mIn = moves.filter((m) => m.amt > 0 && (m.date || "").slice(0, 7) === mk).reduce((a, m) => a + m.amt, 0), mOut = moves.filter((m) => m.amt < 0 && (m.date || "").slice(0, 7) === mk).reduce((a, m) => a - m.amt, 0);
      const others = ws.filter((x) => x.id !== w.id);
      return '<details class="wallet" data-wid="' + esc(w.id) + '"' + (state.openWallets[w.id] ? " open" : "") + "><summary>" + wTile(w) +
        '<span style="min-width:0"><div class="wname">' + esc(w.name) + '</div><div class="wsub">' + (mOut || mIn ? "This month " + (mOut ? '<span class="out-amt">−' + wMoney(w, mOut) + "</span>" : "") + (mOut && mIn ? " · " : "") + (mIn ? '<span class="inc-amt">+' + wMoney(w, mIn) + "</span>" : "") : "No changes this month") + '</div></span><span class="wbal' + (b < 0 ? " out-amt" : "") + '"><span class="wbm">' + wMoney(w, b) + '</span><small class="usd" style="display:block;font-size:12px;font-weight:600">' + (wCur(w) === "USD" ? "≈ " + rmb0(wToRmb(w, b)) : usd(b / state.config.rate)) + "</small>" + "</span></summary>" +
        '<div class="wallet-body">' +
        (moves.length ? "<div>" + moves.slice(0, 8).map((m) => '<div class="wmove"><span class="l"><span class="d">' + esc(m.date ? shortDate(m.date) : "") + "</span>" + esc(m.label) + '</span><b class="' + (m.amt < 0 ? "out-amt" : "inc-amt") + '">' + (m.amt < 0 ? "−" : "+") + wMoney(w, Math.abs(m.amt)) + "</b></div>").join("") + "</div>" : '<p class="hint" style="margin:0">No changes since you set the balance. Pay with ' + esc(w.methods[0] || w.name) + " and it shows here.</p>") +
        '<div class="hint">' + (wCur(w) === "USD" ? "Dollar wallet. " : "") + "Balance set to " + wMoney(w, w.balance) + " on " + esc(new Date(w.setAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + ".</div>" +
        '<div class="debt-actions"><button type="button" class="btn" data-wact="set">Set balance</button>' + (others.length ? '<button type="button" class="btn" data-wact="move">Move money</button>' : "") + '<button type="button" class="btn danger" data-wact="del">Remove</button></div>' +
        '<div class="wform" data-wform="set" hidden><input class="input" inputmode="decimal" placeholder="Balance, ' + (wCur(w) === "USD" ? "$" : "¥") + '" aria-label="Balance"><span class="hint">on</span><input class="input" type="date" data-wdate aria-label="Balance on this date" style="flex:0 1 150px"><button type="button" class="btn small primary" data-wsave="set">Save</button><span class="hint" style="flex-basis:100%">Pick an earlier day if this was your balance before entries you are adding now. Everything dated that day or later is counted.</span></div>' +
        (others.length ? '<div class="wform" data-wform="move" hidden><select class="input" aria-label="Move to">' + others.map((o) => '<option value="' + esc(o.id) + '" data-cur="' + wCur(o) + '">to ' + esc(o.name) + (wCur(o) !== wCur(w) ? " (" + (wCur(o) === "USD" ? "$" : "¥") + ")" : "") + "</option>").join("") + '</select><div class="mrow"><span class="mlab">' + (wCur(w) === "USD" ? "$" : "¥") + ' out</span><input class="input" inputmode="decimal" data-mamt placeholder="Amount" aria-label="Amount that left this wallet"></div>' +
          '<div class="mrow" data-mgot-row hidden><span class="mlab" data-mgot-label>in</span><input class="input" inputmode="decimal" data-mgot aria-label="Amount received"></div><button type="button" class="btn small primary" data-wsave="move">Move</button><span class="hint" data-mnote hidden style="flex-basis:100%"></span></div>' : "") +
        "</div></details>";
    }).join("") + "</div>";
    html += '<div class="card stack"><div class="head"><h2>Add a wallet</h2><span class="hint">a second bank, a savings box…</span></div><div class="wform"><input class="input" id="wa-name" maxlength="30" placeholder="Name, e.g. ICBC card"><select class="input" id="wa-cur" aria-label="Currency" style="flex:0 0 76px"><option value="RMB">¥</option><option value="USD">$</option></select><input class="input" id="wa-bal" inputmode="decimal" placeholder="Balance"><button type="button" class="btn primary" id="wa-add">Add</button></div>' +
      '<p class="hint" style="margin:0">Choose $ for a dollar card or account. A new wallet also appears under "Paid with" when you add an expense. Credit card spending is not taken from a wallet.</p></div>';
    el.innerHTML = html;
    const t = $("w-total"); if (t) countUp(t, "w-total", total, rmb0);
    // each wallet's balance rolls to its new value (a move between wallets shows on both)
    el.querySelectorAll("details.wallet").forEach((d) => { const m = d.querySelector(".wbm"); if (m) rollNumber(m, m.textContent, { id: "wb-" + d.dataset.wid }); });
    // closing a wallet also closes any half-filled box inside it, so it opens clean next time
    el.querySelectorAll("details.wallet").forEach((d) => d.addEventListener("toggle", () => {
      state.openWallets[d.dataset.wid] = d.open;
      if (!d.open) d.querySelectorAll("[data-wform]").forEach((f) => { f.hidden = true; f.querySelectorAll("input").forEach((i) => (i.value = "")); });
    }));
    el.querySelectorAll("details.wallet").forEach((d) => {
      const w = ws.find((x) => x.id === d.dataset.wid); if (!w) return;
      d.querySelectorAll("[data-wact]").forEach((b) => (b.onclick = async () => {
        const act = b.dataset.wact;
        if (act === "del") {
          if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Tap again to remove"; setTimeout(() => { b.classList.remove("armed"); b.textContent = "Remove"; }, 3500); return; }
          // Undo puts the wallet back in the same place with its balance and history unchanged
          const idx = ws.findIndex((x) => x.id === w.id), saved = { ...w };
          if (await saveWallets(ws.filter((x) => x.id !== w.id))) {
            toast(w.name + " removed", false, { label: "Undo", fn: async () => {
              const now = (state.config.wallets || []).filter((x) => x.id !== saved.id);
              now.splice(Math.min(idx, now.length), 0, saved);
              await saveWallets(now, saved.name + " is back");
            } });
          }
          return;
        }
        // "Set balance" / "Move money" always open their box (never close it), filled and ready to type
        d.querySelectorAll("[data-wform]").forEach((f) => { f.hidden = f.dataset.wform !== act; });
        const f = d.querySelector('[data-wform="' + act + '"]');
        if (f) { const inp = f.querySelector("input"); if (act === "set") { inp.value = walletBalance(w); const dt = f.querySelector("[data-wdate]"); if (dt) { dt.value = todayISO(); dt.max = todayISO(); } } else inp.value = ""; inp.focus(); inp.select(); }
      }));
      // Enter saves, same as tapping Save / Move
      d.querySelectorAll("[data-wform] input").forEach((inp) => inp.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter") return;
        ev.preventDefault();
        const btn = inp.closest("[data-wform]").querySelector("[data-wsave]");
        if (btn) btn.click();
      }));
      const fs = d.querySelector('[data-wsave="set"]');
      if (fs) fs.onclick = async () => {
        const v = parseAmt(d.querySelector('[data-wform="set"] input').value);
        if (!isFinite(v)) { toast("Enter the balance, for example 1250.", true); return; }
        const dv = d.querySelector("[data-wdate]") && d.querySelector("[data-wdate]").value;
        if (dv && !saneDate(dv)) { toast("Check the date. The year looks wrong.", true); return; }
        state.openWallets[w.id] = true;
        await saveWallets(ws.map((x) => (x.id === w.id ? { ...x, balance: round2(v), setAt: balanceTime(d.querySelector("[data-wdate]") && d.querySelector("[data-wdate]").value) } : x)), w.name + " set to " + wMoney(w, v) + balanceDayText(d.querySelector("[data-wdate]") && d.querySelector("[data-wdate]").value));
      };
      const mf = d.querySelector('[data-wform="move"]');
      if (mf) {
        const sel = mf.querySelector("select"), amtIn = mf.querySelector("[data-mamt]"), gotIn = mf.querySelector("[data-mgot]"), gotL = mf.querySelector("[data-mgot-label]"), note = mf.querySelector("[data-mnote]");
        let touched = false;
        const sync = () => {
          const dest = ws.find((x) => x.id === sel.value), cross = dest && wCur(dest) !== wCur(w);
          mf.querySelector("[data-mgot-row]").hidden = note.hidden = !cross;
          if (!cross) return;
          gotIn.placeholder = wCur(dest) === "USD" ? "$" : "¥"; gotL.textContent = (wCur(dest) === "USD" ? "$" : "¥") + " in";
          const a = parseAmt(amtIn.value);
          if (!touched) gotIn.value = a > 0 ? round2(convert(a, wCur(w), wCur(dest))) : "";
          note.textContent = "Filled in at ¥" + state.config.rate.toFixed(2) + " = $1. Change it to what you really got after the bank's rate and fees.";
        };
        sel.addEventListener("change", () => { touched = false; sync(); });
        amtIn.addEventListener("input", sync);
        gotIn.addEventListener("input", () => { touched = true; });
        mf.querySelector("[data-mamt]").addEventListener("focus", sync);
        sync();
      }
      const fm = d.querySelector('[data-wsave="move"]');
      if (fm) fm.onclick = async () => {
        const f = d.querySelector('[data-wform="move"]'), to = f.querySelector("select").value, amt = parseAmt(f.querySelector("[data-mamt]").value);
        if (!(round2(amt) > 0)) { toast("Enter how much you moved.", true); return; }
        const dest = ws.find((x) => x.id === to);
        const cross = dest && wCur(dest) !== wCur(w);
        const got = cross ? parseAmt(f.querySelector("[data-mgot]").value) : amt;
        if (cross && !(round2(got) > 0)) { toast("Enter how much you received.", true); return; }
        const id = "t" + uid(), tr = { from: w.id, to, amount: round2(amt), amountTo: round2(got), date: todayISO(), createdAt: Date.now() };
        try {
          await store.transferSet(id, tr);
          // the amount travels from one wallet to the other (changing to the other currency on the way)
          const balOf = (wid) => $("v-wallets").querySelector('details.wallet[data-wid="' + CSS.escape(wid) + '"] .wbal');
          flyMoney(balOf(w.id), balOf(to), wMoney(w, amt), cross ? wMoney(dest, got) : "", w.color);
          toast("Moved " + wMoney(w, amt) + (cross ? " → " + wMoney(dest, got) : "") + " to " + (dest ? dest.name : "wallet"), false, { label: "Undo", fn: async () => { try { await store.transferDelete(id); toast("Undone", true); } catch (e) {} } });
        } catch (e) { toast("Could not save. Try again.", true); }
      };
    });
    $("wa-add").onclick = async () => {
      const name = $("wa-name").value.trim(), balText = $("wa-bal").value.trim(), bal = parseAmt(balText);
      if (!name) { toast("Give the wallet a name.", true); return; }
      if (balText && !isFinite(bal)) { toast("Check the balance, for example 1250.", true); return; }
      // the name becomes the wallet's payment method, so it must not already be one of another wallet's methods
      if (ws.some((x) => x.name.toLowerCase() === name.toLowerCase() || x.methods.some((m) => m.toLowerCase() === name.toLowerCase()))) { toast("You already have a wallet with that name.", true); return; }
      const palette = ["#12A594", "#8B5CF6", "#E5487F", "#F07A2E", "#3E9BF0"];
      const w = { id: "w" + uid(), name, icon: /bank|card|icbc|boc|ccb|abc|cmb/i.test(name) ? "w_bank" : "w_other", color: palette[ws.length % palette.length], methods: [name], currency: $("wa-cur").value === "USD" ? "USD" : "RMB", balance: isFinite(bal) ? round2(bal) : 0, setAt: Date.now() };
      await saveWallets(ws.concat([w]), name + " added");
    };
    ["wa-name", "wa-bal"].forEach((id) => $(id).addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); $("wa-add").click(); } }));
  }

  // ---------- Backup and restore ----------
  async function saveBackup() {
    const msg = $("bk-msg");
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
    if (!dl) { msg.textContent = "Could not start the download."; return; }
    const data = { app: "money-ledger", version: 1, exportedAt: new Date().toISOString(), config: state.config,
      expenses: state.expenses.map((e) => ({ ...e })), debts: state.debts.map((d) => ({ ...d })), transfers: state.transfers.map((t) => ({ ...t })) };
    try {
      await dl.save({ filename: "money-ledger-backup-" + todayISO() + ".json", data: JSON.stringify(data, null, 1) });
      try { await store.saveConfig({ ...state.config, lastBackupAt: Date.now() }); state.config.lastBackupAt = Date.now(); } catch (e) {}
      msg.textContent = ""; toast("Backup saved: " + nOf(data.expenses.length, "entry", "entries") + ", " + nOf(data.debts.length, "debt", "debts"));
      if (state.view === "settings") $("bk-last").textContent = "Last backup today";
    } catch (e) { msg.textContent = e && e.code === "declined" ? "Backup cancelled." : "Could not save the backup right now."; }
  }
  function readBackup(file) {
    const msg = $("bk-msg"), panel = $("bk-panel");
    const r = new FileReader();
    r.onload = () => {
      let data = null;
      try { data = JSON.parse(String(r.result)); } catch (e) { data = null; }
      const problem = backupProblem(data);
      if (problem) { msg.textContent = problem; panel.hidden = true; return; }
      msg.textContent = "";
      data.expenses = cleanExpenses(data.expenses); data.debts = cleanDebts(data.debts); data.transfers = cleanTransfers(data.transfers);
      const ids = new Set(state.expenses.map((e) => e.id));
      const newCount = data.expenses.filter((e) => e && e.id && !ids.has(e.id)).length;
      panel.hidden = false;
      panel.innerHTML = '<div class="bk-box"><div><b>Backup from ' + esc(data.exportedAt ? new Date(data.exportedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "unknown date") + "</b></div>" +
        "<div>" + nOf(data.expenses.length, "entry", "entries") + " · " + nOf(data.debts.length, "debt", "debts") + " · " + nOf(data.transfers.length, "wallet move", "wallet moves") + "</div>" +
        '<div class="hint">Add missing: keeps everything here and adds the ' + nOf(newCount, "entry", "entries") + " you do not have yet. Replace: deletes what is here now and puts the backup in its place.</div>" +
        '<div class="form-actions"><button type="button" class="btn primary" id="bk-merge">Add missing</button><button type="button" class="btn danger" id="bk-replace">Replace everything</button><button type="button" class="btn" id="bk-cancel">Cancel</button></div><div class="hint" id="bk-prog"></div></div>';
      $("bk-cancel").onclick = () => { panel.hidden = true; };
      $("bk-merge").onclick = () => restoreBackup(data, false);
      const rb = $("bk-replace");
      rb.onclick = () => {
        if (!rb.classList.contains("armed")) { rb.classList.add("armed"); rb.textContent = "Tap again to replace"; setTimeout(() => { rb.classList.remove("armed"); rb.textContent = "Replace everything"; }, 4000); return; }
        restoreBackup(data, true);
      };
    };
    r.onerror = () => { msg.textContent = "Could not read that file."; };
    r.readAsText(file);
  }
  async function restoreBackup(data, replace) {
    const prog = $("bk-prog"), btns = $("bk-panel").querySelectorAll("button");
    if (!state.configLoaded) { prog.textContent = "Your settings are still loading. Try again in a moment."; return; }
    btns.forEach((b) => (b.disabled = true));
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== "id" && k !== "_pending"));
    let done = 0;
    try {
      const have = new Set(replace ? [] : state.expenses.map((e) => e.id)), haveD = new Set(replace ? [] : state.debts.map((d) => d.id)), haveT = new Set(replace ? [] : state.transfers.map((t) => t.id));
      const exps = data.expenses.filter((e) => !have.has(String(e.id)));
      for (const e of exps) { await store.addWithId(String(e.id), strip(e)); if (++done % 10 === 0) prog.textContent = "Restoring entries… " + done + " of " + exps.length; }
      for (const d of data.debts.filter((x) => !haveD.has(String(x.id)))) await store.debtSet(String(d.id), strip(d));
      for (const t of data.transfers.filter((x) => !haveT.has(String(x.id)))) await store.transferSet(String(t.id), strip(t));
      // Replace removes the old data only after the backup is safely in, so a problem half way can never leave you with less than you had
      if (replace) {
        const inFile = (list) => new Set(list.map((x) => String(x.id)));
        const keepE = inFile(data.expenses), keepD = inFile(data.debts), keepT = inFile(data.transfers);
        for (const e of state.expenses.filter((x) => !keepE.has(x.id))) await store.remove(e.id);
        for (const d of state.debts.filter((x) => !keepD.has(x.id))) await store.debtDelete(d.id);
        for (const t of state.transfers.filter((x) => !keepT.has(x.id))) await store.transferDelete(t.id);
      }
      if (data.config && (replace || !state.config.wallets)) {
        const cfg = replace ? data.config : { ...state.config, wallets: data.config.wallets || state.config.wallets };
        await store.saveConfig(cfg); state.config = normalizeConfig(cfg);
      }
      $("bk-panel").hidden = true;
      toast(replace ? "Backup restored" : "Added " + nOf(exps.length, "entry", "entries") + " from the backup");
      renderAll("force");
    } catch (e) {
      prog.textContent = "Stopped after " + done + " items: " + (e && e.code === "quota_exceeded" ? "storage is full." : "connection problem. Try again; items already restored are kept.");
      btns.forEach((b) => (b.disabled = false));
    }
  }

  // ---------- Debts between people ----------
  // A debt: {dir: "owed" (they owe me) | "owe" (I owe them), person, amount, currency, rate, reason, start, due, payments: [{id, date, amount}], settled, settledAt}
  // Paying back is not spending and getting paid back is not income, so debts never touch the monthly totals.
  const paidOf = (d) => (d.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const leftOf = (d) => Math.max(0, round2(Number(d.amount) - paidOf(d)));
  const toRmb = (d, amt) => (d.currency === "USD" ? amt * (Number(d.rate) || state.config.rate) : amt);
  const dMoney = (d, amt) => (d.currency === "USD" ? usdS(amt) + " (≈" + rmb0(toRmb(d, amt)) + ")" : rmbS(amt));
  const personKey = (n) => String(n || "").trim().toLowerCase();
  const AVATAR_COLORS = ["#4F6BED", "#F07A2E", "#2FA968", "#8B5CF6", "#E5487F", "#12A594", "#D9A11A", "#3E9BF0"];
  const avatar = (name) => { const k = personKey(name); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const ini = String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?"; return '<span class="avatar" style="--c:' + AVATAR_COLORS[h % AVATAR_COLORS.length] + '">' + esc(ini) + "</span>"; };
  const shortDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + (String(y) !== todayISO().slice(0, 4) ? ", " + y : ""); };
  function dueInfo(d) {
    if (!d.due) return { cls: "", text: "No due date", days: null };
    const days = Math.round((Date.parse(d.due) - Date.parse(todayISO())) / 864e5);
    if (days < 0) return { cls: "over", text: "Overdue " + -days + " day" + (days === -1 ? "" : "s"), days };
    if (days === 0) return { cls: "soon", text: "Due today", days };
    if (days <= 3) return { cls: "soon", text: "Due in " + days + " day" + (days === 1 ? "" : "s"), days };
    return { cls: "", text: "Due " + shortDate(d.due), days };
  }
  const openDebts = () => state.debts.filter((d) => !d.settled && leftOf(d) > 0);
  function debtAlerts() {
    return openDebts().map((d) => ({ d, i: dueInfo(d) })).filter((x) => x.i.days != null && x.i.days <= 3).sort((a, b) => a.i.days - b.i.days);
  }
  function reminderText(d) {
    return "Hi " + String(d.person).trim() + ", just a friendly reminder about the " + dMoney(d, leftOf(d)).replace(/ \(≈.*\)/, "") + (d.reason ? " for " + d.reason : "") + " from " + shortDate(d.start) + "." + (d.due ? " Could you pay it back by " + shortDate(d.due) + "?" : "") + " Thanks!";
  }

  function renderDebts() {
    const el = $("v-debts");
    if (!state.debtsLoaded) { el.innerHTML = '<div class="card empty-state">Loading…</div>'; return; }
    const open = openDebts(), settled = state.debts.filter((d) => d.settled || leftOf(d) <= 0).sort((a, b) => (b.settledAt || 0) - (a.settledAt || 0));
    const owedT = open.filter((d) => d.dir === "owed").reduce((a, d) => a + toRmb(d, leftOf(d)), 0);
    const oweT = open.filter((d) => d.dir === "owe").reduce((a, d) => a + toRmb(d, leftOf(d)), 0);
    const net = owedT - oweT;
    let html = '<div class="card stack"><div class="debt-totals">' +
      '<div><div class="lbl">Owed to you</div><div class="val g">' + rmb0(owedT) + '</div><small>' + open.filter((d) => d.dir === "owed").length + " open</small></div>" +
      '<div><div class="lbl">You owe</div><div class="val r">' + rmb0(oweT) + '</div><small>' + open.filter((d) => d.dir === "owe").length + " open</small></div>" +
      '<div><div class="lbl">Net</div><div class="val' + (net > 0 ? " g" : net < 0 ? " r" : "") + '">' + (net > 0 ? "+" : "") + rmb0(net) + "</div><small>" + (net > 0 ? "in your favor" : net < 0 ? "you owe more" : "all even") + "</small></div></div>" +
      '<button type="button" class="btn primary big" id="debt-add" style="flex:none">+ Add a debt</button></div>';

    // group open debts by person, net amount per person
    const people = Object.create(null);
    open.forEach((d) => { const k = personKey(d.person); (people[k] = people[k] || { name: String(d.person).trim(), items: [], net: 0 }).items.push(d); people[k].net += (d.dir === "owed" ? 1 : -1) * toRmb(d, leftOf(d)); });
    const list = Object.entries(people).map(([k, p]) => { p.key = k; p.next = p.items.map(dueInfo).filter((i) => i.days != null).sort((a, b) => a.days - b.days)[0] || null; return p; })
      .sort((a, b) => (a.next ? a.next.days : 9999) - (b.next ? b.next.days : 9999) || Math.abs(b.net) - Math.abs(a.net));
    const personHTML = (p) => {
      const items = p.items.slice().sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1);
      return '<details class="person" data-pk="' + esc(p.key) + '"' + (state.openPeople[p.key] === true ? " open" : "") + "><summary>" + avatar(p.name) +
        '<span style="min-width:0"><div class="pname">' + esc(p.name) + '</div><div class="psub">' + (p.next ? '<span class="badge ' + p.next.cls + '">' + esc(p.next.text) + "</span>" : "") + "<span>" + items.length + " open</span></div></span>" +
        '<span class="pamt ' + (p.net >= 0 ? "inc-amt" : "up") + '">' + rmb0(Math.abs(p.net)) + "<small>" + (p.net >= 0 ? "owes you" : "you owe") + "</small></span></summary>" +
        items.map((d) => {
          const paid = paidOf(d), left = leftOf(d), i = dueInfo(d), pc = Math.min(100, (paid / Number(d.amount)) * 100);
          return '<div class="debt-item" data-did="' + esc(d.id) + '"><div class="dtop"><span class="dtitle">' + esc(d.reason || (d.dir === "owed" ? "Owes you" : "You owe")) + (p.items.some((x) => x.dir !== d.dir) ? ' <span class="badge">' + (d.dir === "owed" ? "owes you" : "you owe") + "</span>" : "") + '</span><span class="dleft ' + (d.dir === "owed" ? "inc-amt" : "up") + '">' + esc(dMoney(d, left)) + " left</span></div>" +
            '<div class="dmeta">' + esc(dMoney(d, Number(d.amount))) + " from " + esc(shortDate(d.start)) + (walletName(d.wallet) ? " · " + (d.dir === "owed" ? "out of " : "into ") + esc(walletName(d.wallet)) : "") + ' · <span class="badge ' + i.cls + '">' + esc(i.text) + "</span>" + (d.example ? ' · <span class="badge">example</span>' : "") + "</div>" +
            (paid > 0 ? '<div class="prog"><i style="width:' + pc + '%"></i></div><div class="pays">' + d.payments.map((pp) => "<span>" + esc(shortDate(pp.date)) + ": paid " + esc(dMoney(d, Number(pp.amount))) + (walletName(pp.wallet) ? " · " + esc(walletName(pp.wallet)) : "") + "</span>").join("") + "</div>" : "") +
            '<div class="pay-row" hidden><label class="pr-l">' + (d.dir === "owed" ? "How much did " + esc(String(d.person).trim()) + " give back?" : "How much did you pay back?") + "</label>" +
            '<div class="pr-amt"><input class="input" inputmode="decimal" enterkeyhint="done" placeholder="' + (d.currency === "USD" ? "$" : "¥") + ' amount" aria-label="Amount paid">' +
            '<button type="button" class="chip" data-quick="all">All ' + esc(dMoney(d, left)) + "</button>" + (left >= 2 ? '<button type="button" class="chip" data-quick="half">Half ' + esc(dMoney(d, round2(left / 2))) + "</button>" : "") + "</div>" +
            walletSelect(d) + '<div class="pr-prev" aria-live="polite"></div>' +
            '<div class="pr-btns"><button type="button" class="btn primary" data-act="pay-save">Save payment</button><button type="button" class="btn" data-act="pay-cancel">Cancel</button></div></div>' +
            '<div class="debt-actions"><button type="button" class="btn" data-act="pay">' + (d.dir === "owed" ? "They paid part" : "I paid part") + '</button><button type="button" class="btn primary" data-act="settle">Mark fully paid</button>' +
            (d.dir === "owed" ? '<button type="button" class="btn" data-act="remind">Copy reminder</button>' : "") +
            '<button type="button" class="btn" data-act="edit">Edit</button><button type="button" class="btn danger" data-act="del">Delete</button></div></div>';
        }).join("") + "</details>";
    };
    const owedPeople = list.filter((p) => p.net > 0 || (p.net === 0 && p.items.some((d) => d.dir === "owed"))), owePeople = list.filter((p) => !owedPeople.includes(p));
    if (!open.length) html += '<div class="card empty-state"><h3>No open debts</h3>When you lend money or borrow it, add it here with a pay-back date. You will see who owes you, who you owe, and what is due soon.</div>';
    if (owedPeople.length) html += '<div class="card"><div class="head" style="margin-bottom:4px"><h2>Owed to me</h2><span class="hint">money to get back</span></div>' + owedPeople.map(personHTML).join("") + "</div>";
    if (owePeople.length) html += '<div class="card"><div class="head" style="margin-bottom:4px"><h2>I owe</h2><span class="hint">money to give back</span></div>' + owePeople.map(personHTML).join("") + "</div>";
    if (settled.length) html += '<details class="card"><summary class="head" style="cursor:pointer;list-style:none"><h2>Settled</h2><span class="hint">' + settled.length + " paid back · tap to show</span></summary><div style=\"margin-top:10px\">" +
      settled.map((d) => '<div class="settled-row"><span><b>' + esc(d.person) + "</b> · " + esc(d.reason || (d.dir === "owed" ? "owed you" : "you owed")) + '</span><span class="muted">' + esc(dMoney(d, Number(d.amount))) + (d.settledAt ? " · " + esc(new Date(d.settledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : "") + ' <button type="button" class="del-sm" data-sdel="' + esc(d.id) + '" aria-label="Delete">×</button></span></div>').join("") + "</div></details>";
    el.innerHTML = html;

    $("debt-add").onclick = () => openDebtSheet(null);
    el.querySelectorAll("details.person").forEach((dt) => dt.addEventListener("toggle", () => { state.openPeople[dt.dataset.pk] = dt.open; }));
    el.querySelectorAll("[data-sdel]").forEach((b) => (b.onclick = async () => {
      const sd = state.debts.find((x) => x.id === b.dataset.sdel), touched = sd && (sd.wallet || (sd.payments || []).some((p) => p.wallet));
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = touched ? "Delete? Wallets change" : "Delete?"; b.classList.add("armed"); if (touched) toast("Deleting it also undoes its wallet moves. To keep your wallets as they are, leave it in Settled.", true); return; }
      const copy = sd ? Object.fromEntries(Object.entries(sd).filter(([k]) => k !== "id")) : null;
      try { await store.debtDelete(b.dataset.sdel); toast("Deleted", false, copy ? { label: "Undo", fn: async () => { try { await store.debtSet(b.dataset.sdel, copy); toast("Restored"); } catch (err) {} } } : null); } catch (e) { toast("Could not delete. Try again.", true); }
    }));
    el.querySelectorAll(".debt-item").forEach((box) => {
      const d = state.debts.find((x) => x.id === box.dataset.did); if (!d) return;
      const row = box.querySelector(".pay-row");
      const inp = row.querySelector("input"), prev = row.querySelector(".pr-prev"), payBtn = box.querySelector('[data-act="pay"]');
      const who = String(d.person).trim();
      const preview = () => {
        const a = parseAmt(inp.value), w = walletName(pickW());
        if (!(a > 0)) { prev.textContent = (d.dir === "owed" ? who + " owes you " : "You owe " + who + " ") + dMoney(d, leftOf(d)) + "."; prev.className = "pr-prev"; return; }
        const amt = Math.min(a, leftOf(d)), rest = round2(leftOf(d) - amt);
        prev.className = "pr-prev on";
        prev.textContent = (rest <= 0 ? (d.dir === "owed" ? who + " has paid you back in full" : "You have paid " + who + " back in full") : (d.dir === "owed" ? who + " will still owe you " : "You will still owe " + who + " ") + dMoney(d, rest)) +
          (w ? " · " + w + (d.dir === "owed" ? " +" : " −") + dMoney(d, amt) : " · no wallet changes") + (a > leftOf(d) ? " (only " + dMoney(d, leftOf(d)) + " was left)" : "") + ".";
      };
      // "They paid part" starts empty; "Mark fully paid" fills in everything that is left. Both let you pick the wallet.
      const fullBtn = box.querySelector('[data-act="settle"]'), saveBtn = row.querySelector('[data-act="pay-save"]');
      const openRow = (show, full) => {
        row.hidden = !show; payBtn.hidden = fullBtn.hidden = show;
        if (!show) return;
        inp.value = full ? leftOf(d) : "";
        row.querySelector(".pr-l").textContent = full ? (d.dir === "owed" ? who + " paid everything back" : "You paid " + who + " everything back") : (d.dir === "owed" ? "How much did " + who + " give back?" : "How much did you pay back?");
        row.querySelector(".pr-amt").hidden = !!full;
        saveBtn.textContent = full ? "Save, fully paid" : "Save payment";
        const def = d.wallet && (state.config.wallets || []).some((w) => w.id === d.wallet) ? d.wallet : defaultWallet();
        row.querySelectorAll("[data-pw]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.pw === def)));
        preview();
        if (full) saveBtn.focus({ preventScroll: true }); else inp.focus({ preventScroll: true });
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      payBtn.onclick = () => openRow(true, false);
      fullBtn.onclick = () => openRow(true, true);
      row.querySelector('[data-act="pay-cancel"]').onclick = () => openRow(false);
      inp.addEventListener("input", preview);
      row.querySelectorAll("[data-quick]").forEach((b) => (b.onclick = () => { inp.value = b.dataset.quick === "all" ? leftOf(d) : round2(leftOf(d) / 2); preview(); }));
      row.querySelectorAll("[data-pw]").forEach((b) => (b.onclick = () => { row.querySelectorAll("[data-pw]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); preview(); }));
      function pickW() { const on = row.querySelector('[data-pw][aria-pressed="true"]'); return on ? on.dataset.pw : ""; }
      box.querySelector('[data-act="pay-save"]').onclick = () => recordPayment(d, parseAmt(row.querySelector("input").value), pickW());
      row.querySelector("input").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); recordPayment(d, parseAmt(ev.target.value), pickW()); } });
      const rb = box.querySelector('[data-act="remind"]');
      if (rb) rb.onclick = () => {
        const text = reminderText(d);
        const done = () => toast("Reminder copied. Paste it in WeChat");
        const fallback = () => { let ta = box.querySelector("textarea"); if (!ta) { ta = document.createElement("textarea"); ta.className = "input"; ta.rows = 3; ta.readOnly = true; box.appendChild(ta); } ta.value = text; ta.focus(); ta.select(); toast("Select the text and copy it", true); };
        try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
      };
      box.querySelector('[data-act="edit"]').onclick = () => openDebtSheet(d);
      const del = box.querySelector('[data-act="del"]');
      del.onclick = async () => {
        if (!del.classList.contains("armed")) { del.classList.add("armed"); del.textContent = "Tap again"; setTimeout(() => { del.classList.remove("armed"); del.textContent = "Delete"; }, 3500); return; }
        const copy = Object.fromEntries(Object.entries(d).filter(([k]) => k !== "id"));
        try { await store.debtDelete(d.id); toast("Debt deleted", false, { label: "Undo", fn: async () => { try { await store.debtSet(d.id, copy); toast("Restored"); } catch (err) {} } }); } catch (e) { toast("Could not delete. Try again.", true); }
      };
    });
  }
  async function recordPayment(d, amount, walletId) {
    const left = leftOf(d);
    if (!(round2(amount) > 0)) { toast("Enter the amount that was paid.", true); return; }
    const amt = round2(Math.min(amount, left));
    const before = Object.fromEntries(Object.entries(d).filter(([k]) => k !== "id"));
    const payments = (d.payments || []).concat([{ id: uid(), date: todayISO(), amount: amt, wallet: walletId || "", at: Date.now() }]);
    const doc = { ...before, payments };
    const fully = round2(Number(d.amount) - payments.reduce((a, p) => a + Number(p.amount), 0)) <= 0;
    if (fully) { doc.settled = true; doc.settledAt = Date.now(); }
    // "paid back" moment: the bar fills to 100%, a green check pops, then the debt moves to Settled
    const box = document.querySelector('.debt-item[data-did="' + d.id + '"]');
    if (fully && box && !reduceMotion()) {
      let prog = box.querySelector(".prog");
      if (!prog) { prog = document.createElement("div"); prog.className = "prog"; prog.innerHTML = '<i style="width:0%"></i>'; box.querySelector(".dmeta").after(prog); }
      box.querySelectorAll("button").forEach((b) => (b.disabled = true));
      void prog.offsetWidth;
      prog.querySelector("i").style.width = "100%";
      const top = box.querySelector(".dtop .dleft");
      if (top) top.outerHTML = '<span class="paid-check">✓ Paid back</span>';
      box.classList.add("paid-anim");
      await sleep(950);
    }
    try {
      await store.debtSet(d.id, doc);
      toast((fully ? "Settled with " + String(d.person).trim() : "Recorded " + dMoney(d, amt) + " · " + dMoney(d, round2(left - amt)) + " left") + (walletName(walletId) ? " · " + walletName(walletId) + (d.dir === "owed" ? " +" : " −") + inWalletText(walletId, d, amt) : ""), false,
        { label: "Undo", fn: async () => { try { await store.debtSet(d.id, before); toast("Undone", true); } catch (e) {} } });
    } catch (e) { toast("Could not save. Try again.", true); }
  }

  // Debt form (its own bottom sheet)
  const dForm = { dir: "owed", currency: "RMB", wallet: "" };
  const walletName = (id) => { const w = id && (state.config.wallets || []).find((x) => x.id === id); return w ? w.name : ""; };
  // what a debt amount comes to in that wallet's own money: a dollar wallet shows dollars
  const inWalletText = (id, d, amt) => { const w = (state.config.wallets || []).find((x) => x.id === id); return w ? wMoney(w, inWalletCur(w, d, amt)) : ""; };
  const defaultWallet = () => { const ws = state.config.wallets || []; const byMethod = walletOf(DEFAULT_METHOD); return (byMethod || ws[0] || { id: "" }).id; };
  // wallet picker for a pay-back: the debt's own wallet first, then the others, then "No wallet"
  // wallet buttons for a pay-back: the debt's own wallet is picked first; a debt without one starts on Alipay
  function walletSelect(d) {
    const ws = state.config.wallets || []; if (!ws.length) return "";
    const cur = d.wallet && ws.some((w) => w.id === d.wallet) ? d.wallet : defaultWallet();
    return '<label class="pr-l">' + (d.dir === "owed" ? "Into which wallet?" : "From which wallet?") + '</label><div class="pay-wallets" role="group">' +
      ws.map((w) => '<button type="button" class="chip" data-pw="' + esc(w.id) + '" aria-pressed="' + (w.id === cur) + '"><span class="ci" style="--c:' + esc(w.color) + '">' + icon(w.icon) + "</span>" + esc(w.name) + "</button>").join("") +
      '<button type="button" class="chip plain" data-pw="" aria-pressed="false">No wallet</button></div>';
  }
  function renderDebtWallets() {
    const ws = state.config.wallets || [], f = $("d-wallet-field");
    f.hidden = !ws.length;
    if (!ws.length) { dForm.wallet = ""; return; }
    $("d-wallet-label").textContent = dForm.dir === "owed" ? "Money went out of" : "Money came into";
    const opts = ws.map((w) => ({ id: w.id, name: w.name, w })).concat([{ id: "", name: "No wallet" }]);
    $("d-wallet").innerHTML = opts.map((o) => '<button type="button" class="chip' + (o.w ? "" : " plain") + '" data-w="' + esc(o.id) + '" aria-pressed="' + (dForm.wallet === o.id) + '">' + (o.w ? '<span class="ci" style="--c:' + esc(o.w.color) + '">' + icon(o.w.icon) + "</span>" : "") + esc(o.name) + "</button>").join("");
    $("d-wallet").querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => { dForm.wallet = b.dataset.w; renderDebtWallets(); }));
    $("d-wallet-hint").textContent = dForm.wallet ? (dForm.dir === "owed" ? walletName(dForm.wallet) + " goes down now and goes back up when they pay you." : walletName(dForm.wallet) + " goes up now and goes down when you pay it back.")
      : "Wallets will not change. Use this if the money is already in an expense, or the debt is older than your wallet balances.";
  }
  function setDebtDir(dir) { dForm.dir = dir; $("d-dir").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.dir === dir))); $("d-due").previousElementSibling.textContent = dir === "owed" ? "Pay me back by" : "I pay back by"; renderDebtWallets(); }
  function setDebtCur(cur) { dForm.currency = cur; $("d-cur").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === cur))); }
  function openDebtSheet(d) {
    state.debtEditId = d ? d.id : null;
    $("d-title").textContent = d ? "Edit debt" : "Add debt";
    dForm.wallet = d ? (d.wallet && (state.config.wallets || []).some((w) => w.id === d.wallet) ? d.wallet : "") : defaultWallet();
    setDebtDir(d ? d.dir : "owed"); setDebtCur(d && d.currency === "USD" ? "USD" : "RMB");
    $("d-person").value = d ? d.person : ""; $("d-amount").value = d ? d.amount : ""; $("d-reason").value = d ? d.reason || "" : "";
    $("d-start").value = d ? d.start : todayISO(); $("d-due").value = d ? d.due || "" : ""; $("d-msg").textContent = "";
    const names = Object.create(null); state.debts.forEach((x) => { names[personKey(x.person)] = String(x.person).trim(); });
    $("d-people").innerHTML = Object.values(names).map((n) => '<option value="' + esc(n) + '"></option>').join("");
    clearGhosts();
    $("scrim").hidden = false; $("dsheet").hidden = false; $("dsheet").scrollTop = 0; syncSheetLock();
    if (window.innerWidth > 640) $("d-person").focus({ preventScroll: true });
  }
  function closeDebtSheet() {
    slideAway($("dsheet"), $("sheet").hidden);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $("dsheet").hidden = true; $("dsheet").style.transform = "";
    if ($("sheet").hidden) { $("scrim").hidden = true; $("scrim").style.opacity = ""; }
    syncSheetLock();
  }
  async function saveDebt(ev) {
    ev.preventDefault();
    const msg = $("d-msg"), person = $("d-person").value.trim(), amount = parseAmt($("d-amount").value);
    if (!person) { msg.textContent = "Write the person's name."; $("d-person").focus(); return; }
    if (!(round2(amount) > 0)) { msg.textContent = "Enter the amount."; $("d-amount").focus(); return; }
    const start = $("d-start").value || todayISO(), due = $("d-due").value || "";
    if (!saneDate(start) || (due && !saneDate(due))) { msg.textContent = "Check the dates. A year looks wrong."; return; }
    if (due && due < start) { msg.textContent = "The pay-back date is before the start date."; return; }
    const old = state.debtEditId ? state.debts.find((x) => x.id === state.debtEditId) : null;
    const doc = { dir: dForm.dir, person, amount: round2(amount), currency: dForm.currency, rate: old && old.rate ? old.rate : state.config.rate, reason: $("d-reason").value.trim(), start, due,
      payments: old ? old.payments || [] : [], settled: false, settledAt: 0, createdAt: old ? old.createdAt || Date.now() : Date.now(),
      // a wallet chosen (or changed) now counts from now on; an unchanged one keeps its original moment
      wallet: dForm.wallet || "", walletAt: dForm.wallet ? (old && old.wallet === dForm.wallet ? old.walletAt || old.createdAt || Date.now() : Date.now()) : 0 };
    if (old && old.example) doc.example = true;
    if (doc.payments.reduce((a, p) => a + Number(p.amount), 0) >= doc.amount) { doc.settled = true; doc.settledAt = Date.now(); }
    $("d-save").disabled = true;
    try {
      const id = old ? old.id : "d" + uid();
      await store.debtSet(id, doc);
      state.openPeople = { [personKey(person)]: true };
      closeDebtSheet();
      toast(old ? "Debt updated" : (doc.dir === "owed" ? person + " owes you " : "You owe " + person + " ") + dMoney(doc, doc.amount) + (doc.wallet && !old ? " · " + walletName(doc.wallet) + (doc.dir === "owed" ? " −" : " +") + inWalletText(doc.wallet, doc, doc.amount) : ""));
    } catch (e) { msg.textContent = "Could not save. Check your connection and try again."; }
    finally { $("d-save").disabled = false; }
  }

  // ---------- Settings ----------
  let draftCats = null;
  function renderSettings() {
    $("s-food").value = state.config.foodLimit || 0;
    const lc = (state.config.limits || []).length;
    $("s-lim-hint").textContent = lc ? lc + (lc === 1 ? " limit: " : " limits: ") + state.config.limits.map((l) => limName(l) + " " + rmb0(l.amount) + " a " + limWord(l)).join(", ") + ". Add, change or delete them on the Limits screen." : "Set limits for any section, per week or per month, on the Limits screen.";
    $("s-go-limits").onclick = () => setView("limits");
    $("s-food-hint").textContent = "Counts " + listJoin(state.config.foodCats.map((id) => catById(id).name)) + ". Starts fresh every day.";
    // show the rate in full: 6.7123 shown as 6.71 would be saved back as 6.71 the next time anything here is saved
    $("s-rate").value = state.config.rate.toFixed(4).replace(/0{1,2}$/, "");
    draftCats =state.config.categories.map((c) => ({ ...c }));
    draftIncs = state.config.incomeCats.map((c) => ({ id: c.id, name: c.name, color: c.color }));
    drawCatRows();
    drawIncRows();
    drawBills();
    $("s-msg").textContent = "";
    $("bk-last").textContent = state.config.lastBackupAt ? "Last backup " + new Date(state.config.lastBackupAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No backup yet";
    $("storage-line").textContent = state.mode === "db" ? "Your entries are saved in your Money Ledger account." : "Your entries are saved on this device only.";
  }
  function drawCatRows() {
    const box = $("s-cats");
    box.innerHTML = draftCats.map((c, i) =>
      '<div class="cat-row">' +
      '<input type="color" id="sc-color-' + i + '" value="' + esc(c.color) + '" aria-label="Color for ' + esc(c.name) + '">' +
      '<input class="input" id="sc-name-' + i + '" value="' + esc(c.name) + '" maxlength="40" aria-label="Section name">' +
      '<select class="input kind-sel" id="sc-kind-' + i + '" aria-label="Type">' + Object.entries(KIND_LABEL).map(([k, l]) => '<option value="' + k + '"' + (c.kind === k ? " selected" : "") + ">" + l + "</option>").join("") + "</select>" +
      '<input class="input bud" id="sc-bud-' + i + '" inputmode="decimal" value="' + (c.budget || 0) + '" aria-label="Monthly budget in yuan">' +
      '<button type="button" class="del" aria-label="Remove ' + esc(c.name) + '" data-del="' + i + '">×</button></div>').join("");
    box.querySelectorAll("input,select").forEach((inp) => (inp.oninput = () => { state.settingsDirty = true; readCatRows(); }));
    box.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      readCatRows();
      const i = Number(b.dataset.del), c = draftCats[i];
      if (draftCats.length <= 1) { $("s-msg").textContent = "Keep at least one section."; return; }
      const used = state.expenses.filter((e) => e.cat === c.id).length;
      if (used && b.dataset.armed !== "1") { b.dataset.armed = "1"; $("s-msg").textContent = "“" + c.name + "” has " + nOf(used, "entry", "entries") + ". Tap × again to remove it (" + (used === 1 ? "it" : "they") + " will show as Other)."; return; }
      draftCats.splice(i, 1); state.settingsDirty = true; $("s-msg").textContent = "Removed. Tap Save settings to keep this change."; drawCatRows();
    }));
  }
  function readCatRows() {
    draftCats.forEach((c, i) => {
      const n = $("sc-name-" + i); if (!n) return;
      c.name = n.value.trim() || "Section";
      c.color = $("sc-color-" + i).value;
      c.kind = $("sc-kind-" + i).value;
      const b = parseAmt($("sc-bud-" + i).value); c.budget = b > 0 ? round2(b) : 0;
    });
  }
  let draftIncs = [];
  function drawIncRows() {
    const box = $("s-incs");
    box.innerHTML = draftIncs.map((c, i) =>
      '<div class="inc-row">' +
      '<input type="color" id="si-color-' + i + '" value="' + esc(c.color) + '" aria-label="Color for ' + esc(c.name) + '">' +
      '<input class="input" id="si-name-' + i + '" value="' + esc(c.name) + '" maxlength="40" aria-label="Income source name">' +
      '<button type="button" class="del" aria-label="Remove ' + esc(c.name) + '" data-idel="' + i + '">×</button></div>').join("");
    box.querySelectorAll("input").forEach((inp) => (inp.oninput = () => { state.settingsDirty = true; readIncRows(); }));
    box.querySelectorAll("[data-idel]").forEach((b) => (b.onclick = () => {
      readIncRows();
      const i = Number(b.dataset.idel), c = draftIncs[i];
      if (draftIncs.length <= 1) { $("s-msg").textContent = "Keep at least one income source."; return; }
      const used = state.expenses.filter((e) => isInc(e) && e.cat === c.id).length;
      if (used && b.dataset.armed !== "1") { b.dataset.armed = "1"; $("s-msg").textContent = "“" + c.name + "” has " + nOf(used, "entry", "entries") + ". Tap × again to remove it."; return; }
      draftIncs.splice(i, 1); state.settingsDirty = true; $("s-msg").textContent = "Removed. Tap Save settings to keep this change."; drawIncRows();
    }));
  }
  function readIncRows() {
    draftIncs.forEach((c, i) => { const n = $("si-name-" + i); if (!n) return; c.name = n.value.trim() || "Income"; c.color = $("si-color-" + i).value; });
  }
  // what is wrong with what was typed in Settings, or "" if it can be saved
  function settingsProblem() {
    const rate = parseRate($("s-rate").value);
    if (!(rate >= 0.0001 && rate < 100)) return "Enter the rate as yuan per dollar, for example 6.70.";
    const foodText = $("s-food").value.trim();
    if (foodText && !(parseAmt(foodText) >= 0)) return "Check the daily food limit. Use a number, or 0 to turn it off.";
    const badBudget = (draftCats || []).find((c, i) => { const el = $("sc-bud-" + i), t = el ? el.value.trim() : ""; return t && !(parseAmt(t) >= 0); });
    return badBudget ? "Check the budget for " + badBudget.name + ". Use a number, or 0 for none." : "";
  }
  async function saveSettings() {
    const problem = settingsProblem();
    if (problem) { $("s-msg").textContent = problem; return; }
    if (!state.configLoaded) { $("s-msg").textContent = "Your settings are still loading. Try again in a moment."; return; }
    readCatRows(); readIncRows();
    const rate = parseRate($("s-rate").value);
    const food = parseAmt($("s-food").value);
    const newRate = Math.round(rate * 10000) / 10000;
    const cfg = { ...state.config, rate: newRate, rateSetAt: newRate !== state.config.rate || !state.config.rateSetAt ? Date.now() : state.config.rateSetAt,
      foodLimit: food > 0 ? round2(food) : 0, foodCats: state.config.foodCats.slice(), bills: state.config.bills.map((b) => ({ ...b })),
      incomeCats: draftIncs.map((c) => ({ ...c })), categories: draftCats.map((c) => ({ ...c })) };
    $("s-save").disabled = true;
    try { await store.saveConfig(cfg); state.config = normalizeConfig(cfg); state.settingsDirty = false; toast("Settings saved"); renderAll("force"); }
    catch (e) { $("s-msg").textContent = "Could not save settings. Try again."; }
    finally { $("s-save").disabled = false; }
  }

  // ---------- Monthly statement (PDF) ----------
  // Pages are built as A4-sized HTML (794 × 1123 px), drawn to images and joined into a PDF.
  // Drawing through the browser keeps Chinese text and the app fonts exactly as on screen.
  const STMT_CSS =
    ".stmt-page{width:794px;height:1123px;box-sizing:border-box;padding:52px 56px 0;background:#fff;color:#0B0B0F;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;font-size:12px;line-height:1.45;position:relative;font-variant-numeric:normal;letter-spacing:0;font-kerning:none}" +
    ".stmt-body{height:985px;overflow:hidden;display:flex;flex-direction:column;gap:18px}" +
    ".stmt-foot{position:absolute;left:56px;right:56px;bottom:30px;display:flex;justify-content:space-between;font-size:10px;color:#8A8A93;border-top:1px solid #E6E6EB;padding-top:10px}" +
    ".s-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:16px;border-bottom:2px solid #0B0B0F}" +
    ".s-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}.s-brand svg{width:34px;height:34px;border-radius:9px;background:linear-gradient(180deg,#2E344E,#0B0B0F)}" +
    ".s-title{font-size:26px;font-weight:800;margin-top:14px}.s-sub{color:#6E6E76;font-size:11.5px}" +
    ".s-meta{text-align:right;color:#6E6E76;font-size:11px;line-height:1.6}.s-meta b{color:#0B0B0F}" +
    ".s-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.s-kpi{border:1px solid #E6E6EB;border-radius:12px;padding:12px 14px}" +
    ".s-kpi .l{font-size:10.5px;font-weight:700;color:#6E6E76;text-transform:uppercase}.s-kpi .v{font-size:20px;font-weight:800;margin-top:2px}.s-kpi .u{font-size:10.5px;color:#6E6E76;font-weight:600}" +
    ".g{color:#1C9A55}.r{color:#E0342B}.m{color:#6E6E76}" +
    ".s-note{background:#F4F5F8;border-radius:10px;padding:10px 14px;font-size:11.5px}" +
    ".s-sec h3{font-size:14px;font-weight:800;margin:0 0 8px;display:flex;justify-content:space-between;align-items:baseline}.s-sec h3 span{font-size:11px;color:#6E6E76;font-weight:600}" +
    "table.s-t{width:100%;border-collapse:collapse}table.s-t th{text-align:left;font-size:9.5px;text-transform:uppercase;color:#6E6E76;font-weight:700;padding:5px 6px;border-bottom:1px solid #D9D9E0}" +
    "table.s-t td{padding:5px 6px;border-bottom:1px solid #EFEFF3;vertical-align:middle;white-space:nowrap}table.s-t td.n,table.s-t th.n{text-align:right}" +
    "table.s-t td.w{white-space:normal;max-width:250px;overflow:hidden;text-overflow:ellipsis}table.s-t tr.tot td{font-weight:800;border-bottom:0;border-top:1.5px solid #0B0B0F}" +
    ".dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:6px;vertical-align:0}" +
    ".bar{position:relative;height:6px;border-radius:99px;background:#EFEFF3;overflow:hidden;width:90px}.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}" +
    ".s-split{display:flex;height:10px;border-radius:99px;overflow:hidden;gap:2px;margin:4px 0 8px}" +
    ".s-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}" +
    ".tag{font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:99px;background:#F2F2F5;color:#6E6E76}.tag.in{background:#E3F5EA;color:#1C9A55}";
  const LOGO_SVG = '<svg viewBox="0 0 1024 1024"><g fill="none" stroke="#fff" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"><path d="M352 300 512 515 672 300M512 515v255M392 570h240M392 680h240"/></g><circle cx="780" cy="250" r="56" fill="#46C77F"/></svg>';

  function statementBlocks(key) {
    const s = statsFor(key), prev = statsFor(shiftMonth(key, -1));
    const mName = monthName(key), blocks = [];
    const rate = s.inc > 0 ? pct(s.inc - s.rmb, s.inc) : null;
    const kpi = (l, v, u, cls) => '<div class="s-kpi"><div class="l">' + l + '</div><div class="v ' + (cls || "") + '">' + v + '</div><div class="u">' + u + "</div></div>";
    blocks.push('<div class="s-head"><div><div class="s-brand">' + LOGO_SVG + 'Money Ledger</div><div class="s-title">Monthly statement</div><div class="s-sub">' + esc(mName) + (key === curMonth() ? " · month in progress, up to " + esc(dayLabel(todayISO())) : "") + "</div></div>" +
      '<div class="s-meta">Prepared <b>' + esc(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })) + "</b><br>Main currency: <b>Chinese yuan (¥)</b><br>Exchange rate: <b>¥" + state.config.rate.toFixed(2) + " = $1</b><br>" + nOf(s.count, "entry", "entries") + "</div></div>");
    blocks.push('<div class="s-kpis">' + kpi("Money in", rmb0(s.inc), usd(s.incU), "g") + kpi("Money out (spent)", rmb0(s.rmb), usd(s.usd)) + kpi("Moved to savings", rmb0(s.saved), usd(s.savedU)) + kpi("Left", rmb0(s.left), usd(s.leftU), s.left < 0 ? "r" : "") + "</div>");
    const notes = [];
    if (rate != null) notes.push("Savings rate <b class='" + (rate >= 20 ? "g" : "r") + "'>" + rate + "%</b> of income (saved plus left over).");
    if (prev.rmb > 0) { const d = Math.round(((s.rmb - prev.rmb) / prev.rmb) * 100); notes.push("Spending is <b>" + (Math.abs(d) < 3 ? "about the same as" : Math.abs(d) + "% " + (d > 0 ? "higher than" : "lower than")) + "</b> " + esc(monthName(shiftMonth(key, -1), { month: "long" })) + " (" + rmb0(prev.rmb) + ")."); }
    if (!s.inc) notes.push("No income was recorded this month.");
    if (notes.length) blocks.push('<div class="s-note">' + notes.join(" ") + "</div>");

    // Money in
    const incRows = Object.entries(s.byInc).sort((a, b) => b[1].rmb - a[1].rmb);
    blocks.push('<div class="s-sec"><h3>Where money came from <span>' + rmb0(s.inc) + " · " + nOf(s.incList.length, "entry", "entries") + "</span></h3>" +
      (incRows.length ? '<table class="s-t"><thead><tr><th>Source</th><th>Details</th><th class="n">Entries</th><th class="n">Share</th><th class="n">Yuan</th><th class="n">Dollars</th></tr></thead><tbody>' +
        incRows.map(([cid, v]) => { const c = catById(cid); return '<tr><td><span class="dot" style="background:' + esc(c.color) + '"></span>' + esc(c.name) + '</td><td class="w m">' + esc(reasonsFor(v.items).filter((r) => r.label !== NO_REASON).slice(0, 3).map((r) => r.label).join(", ")) + '</td><td class="n">' + v.count + '</td><td class="n">' + pct(v.rmb, s.inc) + '%</td><td class="n g"><b>+' + rmb0(v.rmb) + '</b></td><td class="n m">' + usd0(v.usd) + "</td></tr>"; }).join("") +
        '<tr class="tot"><td>Total in</td><td></td><td class="n">' + s.incList.length + '</td><td></td><td class="n g">+' + rmb0(s.inc) + '</td><td class="n">' + usd0(s.incU) + "</td></tr></tbody></table>"
        : '<div class="s-note m">No income recorded for this month.</div>') + "</div>");

    // Money out
    const outRows = Object.entries(s.byCat).sort((a, b) => b[1].rmb - a[1].rmb);
    const maxOut = Math.max(1, ...outRows.map(([, v]) => v.rmb));
    blocks.push('<div class="s-sec"><h3>Where money went <span>' + rmb0(s.rmb) + " spent · " + nOf(s.list.length, "entry", "entries") + "</span></h3>" +
      (outRows.length ? '<table class="s-t"><thead><tr><th>Section</th><th>Main reasons</th><th></th><th class="n">Share</th><th class="n">vs last month</th><th class="n">Yuan</th><th class="n">Dollars</th></tr></thead><tbody>' +
        outRows.map(([cid, v]) => {
          const c = catById(cid), p = (prev.byCat[cid] || { rmb: 0 }).rmb, d = v.rmb - p;
          return '<tr><td><span class="dot" style="background:' + esc(c.color) + '"></span>' + esc(c.name) + '</td><td class="w m">' + esc(reasonsFor(v.items).filter((r) => r.label !== NO_REASON).slice(0, 2).map((r) => r.label + (r.n > 1 ? " ×" + r.n : "")).join(", ")) +
            '</td><td><div class="bar"><i style="width:' + (v.rmb / maxOut) * 100 + "%;background:" + esc(c.color) + '"></i></div></td><td class="n">' + pct(v.rmb, s.rmb) + '%</td><td class="n ' + (prev.rmb > 0 ? (d > 0.5 ? "r" : d < -0.5 ? "g" : "m") : "m") + '">' + (prev.rmb > 0 ? (Math.abs(d) < 0.5 ? "same" : (d > 0 ? "+" : "−") + rmb0(Math.abs(d))) : "—") +
            '</td><td class="n"><b>' + rmb0(v.rmb) + '</b></td><td class="n m">' + usd0(v.usd) + "</td></tr>";
        }).join("") +
        (s.saved > 0 ? '<tr><td><span class="dot" style="background:#1C9A55"></span>Moved to savings</td><td class="w m">not counted as spending</td><td></td><td></td><td></td><td class="n"><b>' + rmb0(s.saved) + '</b></td><td class="n m">' + usd0(s.savedU) + "</td></tr>" : "") +
        '<tr class="tot"><td>Total out</td><td></td><td></td><td></td><td></td><td class="n">' + rmb0(s.rmb + s.saved) + '</td><td class="n">' + usd0(s.usd + s.savedU) + "</td></tr></tbody></table>"
        : '<div class="s-note m">No spending recorded for this month.</div>') + "</div>");

    // Needs / wants / savings + payment methods
    const kb = s.byKind, base = s.inc > 0 ? s.inc : s.rmb + s.saved, kp = (v) => (base > 0 ? Math.round((v / base) * 100) : 0);
    const pm = Object.create(null); s.list.forEach((e) => { pm[e.method || "Other"] = (pm[e.method || "Other"] || 0) + R(e); });
    if (s.rmb + s.saved > 0) blocks.push('<div class="s-two"><div class="s-sec"><h3>Needs, wants, savings <span>' + (s.inc > 0 ? "of income" : "of money out") + '</span></h3><div class="s-split">' +
      [["need", "#0B0B0F"], ["want", "#2B47E6"], ["save", "#1C9A55"]].map(([k, col]) => (kb[k] > 0 ? '<div style="width:' + Math.min(kp(kb[k]), 100) + "%;background:" + col + '"></div>' : "")).join("") + "</div>" +
      '<table class="s-t"><tbody><tr><td><span class="dot" style="background:#0B0B0F"></span>Needs</td><td class="n">' + kp(kb.need) + '%</td><td class="n">' + rmb0(kb.need) + '</td><td class="n m">guide ≤50%</td></tr><tr><td><span class="dot" style="background:#2B47E6"></span>Wants</td><td class="n">' + kp(kb.want) + '%</td><td class="n">' + rmb0(kb.want) + '</td><td class="n m">guide ≤30%</td></tr><tr><td><span class="dot" style="background:#1C9A55"></span>Savings</td><td class="n">' + kp(kb.save) + '%</td><td class="n">' + rmb0(kb.save) + '</td><td class="n m">guide ≥20%</td></tr></tbody></table></div>' +
      '<div class="s-sec"><h3>How you paid <span>spending</span></h3><table class="s-t"><tbody>' + Object.entries(pm).sort((a, b) => b[1] - a[1]).map(([k, v]) => "<tr><td>" + esc(k) + '</td><td class="n">' + pct(v, s.rmb) + '%</td><td class="n">' + rmb0(v) + "</td></tr>").join("") + "</tbody></table></div></div>");

    // Debts snapshot
    const open = openDebts();
    if (open.length) {
      const list = (dir) => open.filter((d) => d.dir === dir).sort((a, b) => (a.due || "9999") < (b.due || "9999") ? -1 : 1).map((d) => "<tr><td>" + esc(d.person) + '</td><td class="w m">' + esc(d.reason || "") + '</td><td class="n m">' + esc(dueInfo(d).text) + '</td><td class="n"><b>' + esc(dMoney(d, leftOf(d)).replace(/ \(≈.*\)/, "")) + "</b></td></tr>").join("") || '<tr><td class="m">None</td></tr>';
      const tot = (dir) => open.filter((d) => d.dir === dir).reduce((a, d) => a + toRmb(d, leftOf(d)), 0);
      blocks.push('<div class="s-sec"><h3>Debts with people <span>open today · not counted in money in or out</span></h3><div class="s-two"><div><div class="m" style="font-weight:700;margin-bottom:4px">Owed to me · <span class="g">' + rmb0(tot("owed")) + '</span></div><table class="s-t"><tbody>' + list("owed") + '</tbody></table></div><div><div class="m" style="font-weight:700;margin-bottom:4px">I owe · <span class="r">' + rmb0(tot("owe")) + '</span></div><table class="s-t"><tbody>' + list("owe") + "</tbody></table></div></div></div>");
    }
    // All entries, oldest first
    const rows = s.all.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0))).map((e) => {
      const c = catById(e.cat), inc = isInc(e);
      return "<tr><td>" + esc(shortDate(e.date)) + '</td><td><span class="tag' + (inc ? " in" : "") + '">' + (inc ? "IN" : isSave(e) ? "SAVE" : "OUT") + '</span></td><td><span class="dot" style="background:' + esc(c.color) + '"></span>' + esc(c.name) + '</td><td class="w">' + esc(e.reason || "—") + '</td><td class="m">' + esc(e.bill ? "Monthly bill" : e.method || "") +
        '</td><td class="n ' + (inc ? "g" : "") + '"><b>' + (inc ? "+" : "") + rmb(R(e)) + '</b></td><td class="n m">' + (e.currency === "USD" ? "$" + fmt(Number(e.amount)) : usd(U(e))) + "</td></tr>";
    });
    return { blocks, rows, total: '<tr class="tot"><td colspan="5">Net for the month (in − out − savings)</td><td class="n ' + (s.left < 0 ? "r" : "g") + '">' + rmb(s.left) + '</td><td class="n">' + usd(s.leftU) + "</td></tr>" };
  }

  async function makeStatement(key, btn) {
    const s = statsFor(key);
    if (!s.count) { toast("Nothing to put in a statement for this month.", true); return; }
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
    if (!dl) { toast("Could not start the download.", true); return; }
    const label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Making your PDF…"; }
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-12000px;top:0;z-index:-1;pointer-events:none";
    host.innerHTML = "<style>" + STMT_CSS + "</style>";
    document.body.appendChild(host);
    try {
      await window.__loadPdfLibs();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const { blocks, rows, total } = statementBlocks(key);
      const pages = [];
      const newPage = () => { const p = document.createElement("div"); p.className = "stmt-page"; p.innerHTML = '<div class="stmt-body"></div><div class="stmt-foot"><span></span><span></span></div>'; host.appendChild(p); pages.push(p); return p.firstChild; };
      const over = (body) => body.scrollHeight > body.clientHeight + 1;
      let body = newPage();
      for (const html of blocks) {
        const wrap = document.createElement("div"); wrap.innerHTML = html; const el = wrap.firstChild;
        body.appendChild(el);
        if (over(body) && body.children.length > 1) { body.removeChild(el); body = newPage(); body.appendChild(el); }
      }
      // All entries table, continued across pages with its header repeated
      const tableHead = '<thead><tr><th>Date</th><th></th><th>Section</th><th>Reason</th><th>Paid / received</th><th class="n">Yuan</th><th class="n">Dollars</th></tr></thead>';
      const startTable = (title) => { const sec = document.createElement("div"); sec.className = "s-sec"; sec.innerHTML = "<h3>" + title + '</h3><table class="s-t">' + tableHead + "<tbody></tbody></table>"; body.appendChild(sec); return sec; };
      let sec = startTable("All entries <span>" + rows.length + " in date order</span>");
      if (over(body)) { body.removeChild(sec); body = newPage(); sec = startTable("All entries <span>" + rows.length + " in date order</span>"); }
      const all = rows.concat([total]);
      for (let i = 0; i < all.length; i++) {
        const tb = sec.querySelector("tbody");
        tb.insertAdjacentHTML("beforeend", all[i]);
        if (over(body)) { tb.removeChild(tb.lastElementChild); body = newPage(); sec = startTable("All entries <span>continued</span>"); sec.querySelector("tbody").insertAdjacentHTML("beforeend", all[i]); }
      }
      pages.forEach((p, i) => { const f = p.querySelectorAll(".stmt-foot span"); f[0].textContent = "Money Ledger · " + monthName(key) + " statement"; f[1].textContent = "Page " + (i + 1) + " of " + pages.length; });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      for (let i = 0; i < pages.length; i++) {
        if (btn) btn.textContent = "Making your PDF… page " + (i + 1) + " of " + pages.length;
        const canvas = await window.html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true });
        if (i) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
      }
      pdf.setProperties({ title: "Money Ledger statement " + monthName(key), creator: "Money Ledger" });
      const blob = pdf.output("blob");
      try { await dl.save({ filename: "Money Ledger statement " + key + ".pdf", data: blob }); toast("Statement saved (" + pages.length + " page" + (pages.length > 1 ? "s" : "") + ")"); }
      catch (e) { if (e && e.code !== "declined") toast("Could not save the PDF right now.", true); }
    } catch (e) {
      toast("Could not make the PDF. Check your connection and try again.", true);
    } finally {
      host.remove();
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  // ---------- Export ----------
  function toCSV(list) {
    // columns 2, 3, 4, 5 and 11 hold typed text (section, kind, reason, method, note)
    const TEXT = new Set([2, 3, 4, 5, 11]);
    const head = ["Date", "Type", "Section", "Need/Want", "Reason", "Paid with / received in", "Amount", "Currency", "Rate (CNY per USD)", "RMB", "USD", "Note"];
    const rows = list.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0))).map((e) => [e.date, isInc(e) ? "Income" : "Expense", catById(e.cat).name, isInc(e) ? "" : KIND_LABEL[e.kind] || "", e.reason, e.method, e.amount, e.currency, e.rate, e.rmb, e.usd, e.note]);
    return [head].concat(rows).map((r) => r.map((v, i) => csvCell(v, TEXT.has(i))).join(",")).join("\n");
  }
  async function exportCSV(all) {
    const list = all ? state.expenses : monthList(state.month), msg = $("x-msg");
    if (!list.length) { msg.textContent = "Nothing to download for this month."; return; }
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
    if (!dl) { msg.textContent = "Could not start the download."; return; }
    try { await dl.save({ filename: all ? "money-ledger-all.csv" : "money-ledger-" + state.month + ".csv", data: toCSV(list) }); msg.textContent = "Downloaded " + nOf(list.length, "entry", "entries") + "."; }
    catch (e) { msg.textContent = e && e.code === "declined" ? "Download cancelled." : "Could not download right now."; }
  }

  // ---------- Wire up ----------
  function init() {
    $("f-date").value = todayISO();
    renderMethodChips();
    setCurrency(state.form.currency);
    document.querySelectorAll(".cur-toggle button").forEach((b) => (b.onclick = () => { setCurrency(b.dataset.cur); if (window.innerWidth > 640) $("f-amount").focus(); }));
    $("f-kind").querySelectorAll("button").forEach((b) => (b.onclick = () => setKind(b.dataset.kind, true)));
    $("f-type").querySelectorAll("button").forEach((b) => (b.onclick = () => { if (state.form.type !== b.dataset.type) setType(b.dataset.type); }));
    $("f-amount").addEventListener("input", () => { renderConvert(); $("f-msg").textContent = ""; });
    $("f-date").addEventListener("input", () => { updateMoreSummary(); updateShopWarn(); });
    $("f-note").addEventListener("input", updateMoreSummary);
    $("add-form").addEventListener("submit", submitForm);
    $("fab").onclick = () => { if (state.view === "debts") { openDebtSheet(null); return; } resetForm(); openSheet(); };
    $("debt-form").addEventListener("submit", saveDebt);
    $("dsheet-close").onclick = closeDebtSheet;
    $("d-dir").querySelectorAll("button").forEach((b) => (b.onclick = () => setDebtDir(b.dataset.dir)));
    $("d-cur").querySelectorAll("button").forEach((b) => (b.onclick = () => setDebtCur(b.dataset.cur)));
    $("d-quick").querySelectorAll("[data-due]").forEach((b) => (b.onclick = () => {
      const n = Number(b.dataset.due);
      if (!n) { $("d-due").value = ""; return; }
      const [y, m, d] = ($("d-start").value || todayISO()).split("-").map(Number);
      $("d-due").value = isoOf(new Date(y, m - 1, d + n));
    }));
    $("sheet-close").onclick = closeSheet;
    $("scrim").onclick = () => { if (!$("dsheet").hidden) closeDebtSheet(); if (!$("sheet").hidden) closeSheet(); };
    document.addEventListener("keydown", (ev) => { if (ev.key !== "Escape") return; if (!$("dsheet").hidden) closeDebtSheet(); else if (!$("sheet").hidden) closeSheet(); });
    $("f-delete").onclick = async () => {
      const d = $("f-delete");
      if (!d.classList.contains("armed")) { d.classList.add("armed"); d.textContent = "Tap again to delete"; delTimer = setTimeout(disarmDelete, 4000); return; }
      const id = state.editId; disarmDelete();
      try { await deleteEntry(id, true); closeSheet(); } catch (e) { $("f-msg").textContent = "Could not delete. Try again."; }
    };
    $("smart-go").onclick = () => smartFill(null);
    $("smart-in").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); smartFill(null); } });
    $("smart-file").addEventListener("change", () => { const f = $("smart-file").files && $("smart-file").files[0]; if (f) smartFill(f); $("smart-file").value = ""; });
    $("f-repeat").onclick = async () => {
      const e = state.expenses.find((x) => x.id === state.editId);
      if (!e) return;
      const day = Number(e.date.slice(8, 10)), key = curMonth();
      const b = { id: "b" + uid(), type: isInc(e) ? "income" : "expense", name: (e.reason || "").trim() || catById(e.cat).name, cat: e.cat, amount: Number(e.amount), currency: e.currency === "USD" ? "USD" : "RMB", day, method: e.method || DEFAULT_METHOD };
      if (e.date.slice(0, 7) === key) { const rid = "bill-" + b.id + "-" + key; billsDone.add(rid); try { await store.markBillRun(rid); } catch (err) {} }
      if (await saveBills(state.config.bills.concat([b]), "Repeats on the " + ordinal(day) + " of every month")) closeSheet();
    };
    document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
    const j = $("jump");
    j.addEventListener("click", (ev) => { try { j.showPicker(); ev.preventDefault(); } catch (e) {} });
    j.addEventListener("change", () => goToDate(j.value));
    $("search-btn").onclick = () => {
      if ($("search-row").hidden) {
        $("search-row").hidden = false; $("search-btn").setAttribute("aria-pressed", "true");
        clearDay(); renderHome();
        $("flt-q").focus();
      } else { closeSearch(); renderHome(); }
    };
    $("flt-q").addEventListener("input", renderHome);
    $("search-all").onclick = () => { state.searchAll = !state.searchAll; $("search-all").setAttribute("aria-pressed", String(state.searchAll)); renderHome(); };
    $("s-addinc").onclick = () => {
      readIncRows();
      draftIncs.push({ id: "i-" + uid(), name: "New source", color: "#12A594" });
      state.settingsDirty = true; drawIncRows();
      const last = $("si-name-" + (draftIncs.length - 1)); if (last) { last.focus(); last.select(); }
    };
    $("m-prev").onclick = () => { state.month = shiftMonth(state.month, -1); clearDay(); state.slide = "prev"; renderAll(); };
    $("m-next").onclick = () => { state.month = shiftMonth(state.month, 1); clearDay(); state.slide = "next"; renderAll(); };
    $("s-save").onclick = saveSettings;
    ["s-rate", "s-food"].forEach((id) => ($(id).oninput = () => (state.settingsDirty = true)));
    $("s-addcat").onclick = () => {
      readCatRows();
      const palette = ["#4F6BED", "#F07A2E", "#2FA968", "#8B5CF6", "#E5487F", "#12A594", "#D9A11A"];
      draftCats.push({ id: "c-" + uid(), name: "New section", color: palette[draftCats.length % palette.length], kind: "want", budget: 0 });
      state.settingsDirty = true; drawCatRows();
      const last = $("sc-name-" + (draftCats.length - 1)); if (last) { last.focus(); last.select(); }
    };
    $("b-add").onclick = async () => {
      const msg = $("b-msg"), name = $("b-name").value.trim(), amount = parseAmt($("b-amount").value), day = Math.round(parseAmt($("b-day").value));
      if (!name) { msg.textContent = "Give the bill a name, like Rent."; return; }
      if (!(round2(amount) > 0)) { msg.textContent = "Enter the amount."; return; }
      if (!(day >= 1 && day <= 31)) { msg.textContent = "Enter the day of the month it is paid (1 to 31)."; return; }
      msg.textContent = "";
      const b = { id: "b" + uid(), name, cat: $("b-cat").value, amount: round2(amount), currency: $("b-cur").value, day, method: $("b-method").value || DEFAULT_METHOD };
      if (await saveBills(state.config.bills.concat([b]), "Bill added. It repeats on the " + ordinal(day) + " each month")) { $("b-name").value = ""; $("b-amount").value = ""; $("b-day").value = ""; }
    };
    $("x-month").onclick = () => exportCSV(false);
    $("x-all").onclick = () => exportCSV(true);
    // Enter in a small form does the same as its button
    const enterClicks = (ids, btnId) => ids.forEach((id) => $(id).addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); $(btnId).click(); } }));
    enterClicks(["b-name", "b-amount", "b-day"], "b-add");
    enterClicks(["s-food", "s-rate"], "s-save");
    $("bk-save").onclick = saveBackup;
    $("bk-file").addEventListener("change", () => { const f = $("bk-file").files && $("bk-file").files[0]; $("bk-file").value = ""; if (f) readBackup(f); });
    $("x-pdf").onclick = () => { $("x-msg").textContent = ""; makeStatement(state.month, $("x-pdf")); };

    // motion: sliding highlights, sticky day headers, swipe rows, the light/dark ease
    initThemeFade();
    ["f-cats", "f-method", "d-wallet"].forEach((id) => glide($(id), ".chip"));
    ["f-type", "f-kind", "d-dir"].forEach((id) => glide($(id)));
    document.querySelectorAll(".cur-toggle").forEach((b) => glide(b));
    glide($("tabs-wrap"), "button", "aria-selected");
    watchStuck("month-list");
    swipe = initSwipe($("month-list"), { onEdit: startEdit, onDelete: (id) => deleteEntry(id) });
    renderCatChips();
    updateMoreSummary();
    const v = pref.get("view", "home");
    setView(["home", "report", "wallets", "debts", "limits", "settings"].includes(v) ? v : "home");
    initStore().catch((e) => { console.error(e); showError("Your data could not load. Close the app fully and open it again."); });
    initSample();
    watchKeyboard();
    smoothDetails($("v-wallets"));
    smoothDetails($("v-debts"));
    fitBottomBar();
    window.addEventListener("resize", fitBottomBar);
    window.addEventListener("orientationchange", fitBottomBar);
    if (window.ResizeObserver) new ResizeObserver(fitBottomBar).observe(document.body);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { checkNewDay(); return; }
      // the app is being closed or switched away from: do not lose Settings changes
      if (state.view === "settings" && state.settingsDirty && !settingsProblem()) saveSettings();
    });
    window.addEventListener("focus", checkNewDay);
    window.addEventListener("pageshow", checkNewDay);
    setInterval(checkNewDay, 60000);
    enableSheetSwipe("sheet", closeSheet);
    enableSheetSwipe("dsheet", closeDebtSheet);
  }
  init();
})();
