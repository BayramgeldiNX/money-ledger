// The settings document: its defaults, its schema (normalizeConfig) and the rules that depend on it.
// Every settings change goes through the store, which runs normalizeConfig, so this is the one place
// that says what a valid config looks like. `wallets: null` means "never set up".
export const DEFAULT_CATS = [
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
export const DEFAULT_INCOME_CATS = [
  { id: "salary", name: "Salary", color: "#15803D" },
  { id: "sidejob", name: "Side job & Freelance", color: "#12A594" },
  { id: "bonus", name: "Bonus", color: "#D9A11A" },
  { id: "gifts_in", name: "Gifts received", color: "#B45FD6" },
  { id: "returns", name: "Investment returns", color: "#2BA6C8" },
  { id: "refund", name: "Refunds", color: "#4F6BED" },
  { id: "income_other", name: "Other income", color: "#6B7280" }
];
export const DEFAULT_RATE = 6.70;
export const DEFAULT_FOOD_LIMIT = 100;
export const DEFAULT_FOOD_CATS = ["groceries", "dining", "coffee", "snacks"];
export const KIND_LABEL = { need: "Need", want: "Want", save: "Savings" };

export function normalizeConfig(d) {
  const c = d || {};
  const listOf = (v, fallback) => { const l = Array.isArray(v) ? v.filter((x) => x && x.id) : []; return l.length ? l : fallback; };
  const cats = listOf(c.categories, DEFAULT_CATS);
  return {
    mode: c.mode === "intl" ? "intl" : c.mode === "cn" ? "cn" : null,
    rate: Number(c.rate) > 0 ? Number(c.rate) : DEFAULT_RATE,
    rateSetAt: Number(c.rateSetAt) > 0 ? Number(c.rateSetAt) : 0,
    income: Number(c.income) > 0 ? Number(c.income) : 0,
    salesTaxPct: Math.min(30, Math.max(0, Number(c.salesTaxPct) || 0)),
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
    later: Array.isArray(c.later) ? c.later.filter((x) => x && x.id && Number(x.amount) > 0).map((x) => ({ id: String(x.id), reason: String(x.reason || ""), amount: Number(x.amount), currency: x.currency === "USD" ? "USD" : "RMB", cat: String(x.cat || "shopping"), method: String(x.method || (c.mode === "intl" ? "Cash" : "Alipay")), addedAt: Number(x.addedAt) || 0, forMonth: String(x.forMonth || "") })) : [],
    categories: cats.map((x) => ({ id: String(x.id), name: String(x.name || "Section"), color: String(x.color || "#888888"), kind: KIND_LABEL[x.kind] ? x.kind : "want", budget: Number(x.budget) > 0 ? Number(x.budget) : 0 }))
  };
}

// An account with nothing in it at all gets the first-time Chinese/International question:
// no mode, wallets never set up, no entries, debts or moves.
export function isBlankAccount(config, { expenses = [], debts = [], transfers = [] } = {}) {
  return !config.mode && config.wallets === null && !expenses.length && !debts.length && !transfers.length;
}

export const TAX_SECTION = { id: "taxes", name: "Taxes", color: "#7A5AF8", kind: "need", budget: 0 };
export const TAX_REFUND_SECTION = { id: "tax_refund", name: "Tax refund", color: "#0E9384" };

// The lists with the Taxes and Tax refund sections added, only if missing (Taxes before "other", Tax refund before "income_other").
export function withTaxSections(config) {
  const add = (list, sec, before) => {
    if (list.some((x) => x.id === sec.id)) return list;
    const i = list.findIndex((x) => x.id === before);
    return i < 0 ? [...list, sec] : [...list.slice(0, i), sec, ...list.slice(i)];
  };
  return {
    categories: add(config.categories || DEFAULT_CATS, TAX_SECTION, "other"),
    incomeCats: add(config.incomeCats || DEFAULT_INCOME_CATS, TAX_REFUND_SECTION, "income_other")
  };
}

// What a new International account starts with: no wallets, and a dollar-sized food limit
// (the yuan default of 100 would be $100 a day). A limit the owner already changed is kept.
export function intlStart(config) {
  return { wallets: [], foodLimit: config.foodLimit === DEFAULT_FOOD_LIMIT ? 20 : config.foodLimit, ...withTaxSections(config) };
}
