// Tax and tip on meals, and the monthly tax view (International mode). Pure.
import { round2 } from "./format.js";

export const TIP_CATS = ["dining", "coffee"]; // sections that get Tax + Tip rows
export const hasTaxTip = (cat) => TIP_CATS.includes(cat);
export const TIP_PCTS = [15, 18, 20];
export const TAX_CAT = "taxes";
export const TAX_REASONS = ["Income tax", "Property tax", "Car tax & registration", "Tax help / accountant", "Penalties & late fees", "Other tax"];

// tax or tip from a percent of the bill
export const pctOf = (bill, pct) => round2((Number(bill) || 0) * (Number(pct) || 0) / 100);
export const mealTotal = (bill, tax, tip) => round2((Number(bill) || 0) + (Number(tax) || 0) + (Number(tip) || 0));

// an entry back into its parts, in the entry's own currency
export function mealParts(e) {
  const tax = Number(e && e.tax) || 0;
  const tip = Number(e && e.tip) || 0;
  return { bill: round2((Number(e && e.amount) || 0) - tax - tip), tax, tip };
}

// part of an entry in dollars (works for any currency)
const usdPart = (e, part) => (Number(e.amount) > 0 ? (Number(e.usd) || 0) * part / Number(e.amount) : 0);

// Tax and tips in one month ("YYYY-MM") or one year ("YYYY"), in dollars.
export function taxMonth(expenses, key) {
  const reasons = new Map();
  let taxes = 0, meals = 0, tips = 0;
  for (const e of expenses || []) {
    if (!e || typeof e.date !== "string" || !e.date.startsWith(key)) continue;
    if (e.type === "income" || e.kind === "income") continue;
    if (e.cat === TAX_CAT) {
      const u = Number(e.usd) || 0;
      const r = String(e.reason || "").trim() || "Other tax";
      reasons.set(r, (reasons.get(r) || 0) + u);
      taxes += u;
    } else {
      if (Number(e.tax) > 0) meals += usdPart(e, Number(e.tax));
      if (Number(e.tip) > 0) tips += usdPart(e, Number(e.tip));
    }
  }
  const byReason = [...reasons].map(([reason, amount]) => ({ reason, amount: round2(amount) })).sort((a, b) => b.amount - a.amount);
  return { total: round2(taxes + meals), byReason, meals: round2(meals), tips: round2(tips) };
}

// the same for a whole year ("YYYY")
export const taxYear = (expenses, year) => taxMonth(expenses, String(year));

// The entries behind the tax view: Taxes section payments and meals with tax, newest first.
export const isTaxEntry = (e) => !!e && e.type !== "income" && e.kind !== "income" && (e.cat === TAX_CAT || Number(e.tax) > 0);
export function taxEntries(expenses, key) {
  return (expenses || []).filter((e) => isTaxEntry(e) && typeof e.date === "string" && e.date.startsWith(key))
    .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
}
