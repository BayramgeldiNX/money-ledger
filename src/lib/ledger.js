// The money rules, free of any screen code so they can be tested.
//   An entry is income, savings (counts as saved, not spent) or spending.
//   Left = income - spent - saved.
//   A wallet changes only for things that happened AFTER the balance was set.
import { round2 } from "./format.js";
import { isoOf } from "./dates.js";

export const R = (e) => Number(e.rmb) || 0;
export const U = (e) => Number(e.usd) || 0;
export const isInc = (e) => e.type === "income";
export const isSave = (e) => !isInc(e) && e.kind === "save";
export const isSpend = (e) => !isInc(e) && e.kind !== "save";

export const monthList = (expenses, key) => expenses.filter((e) => typeof e.date === "string" && e.date.slice(0, 7) === key);

// all = every entry; list = spending only (no income, no savings). rmb/usd = spent.
export function statsOf(expenses, key) {
  const all = monthList(expenses, key);
  const s = { all, list: [], incList: [], rmb: 0, usd: 0, inc: 0, incU: 0, saved: 0, savedU: 0, count: all.length, byCat: {}, byInc: {}, byKind: { need: 0, want: 0, save: 0 } };
  all.forEach((e) => {
    const r = R(e), u = U(e);
    if (isInc(e)) {
      s.incList.push(e); s.inc += r; s.incU += u;
      const c = (s.byInc[e.cat] = s.byInc[e.cat] || { rmb: 0, usd: 0, count: 0, items: [] });
      c.rmb += r; c.usd += u; c.count++; c.items.push(e);
      return;
    }
    if (isSave(e)) { s.saved += r; s.savedU += u; s.byKind.save += r; return; }
    s.list.push(e);
    s.rmb += r; s.usd += u;
    const c = (s.byCat[e.cat] = s.byCat[e.cat] || { rmb: 0, usd: 0, count: 0, items: [] });
    c.rmb += r; c.usd += u; c.count++; c.items.push(e);
    s.byKind[e.kind === "need" ? "need" : "want"] += r;
  });
  s.left = s.inc - s.rmb - s.saved; s.leftU = s.incU - s.usd - s.savedU;
  return s;
}

export const wCur = (w) => (w && w.currency === "USD" ? "USD" : "RMB");
export const wToRmb = (w, n, rate) => (wCur(w) === "USD" ? n * rate : n);

// An entry changes a wallet only if it happened after the balance was set: dated a later day,
// or dated that same day and added after the balance. Older-dated entries you type in later are
// already inside the balance you set, so they are not taken off a second time.
export function afterSet(w, date, created) {
  const setDay = isoOf(new Date(w.setAt));
  const d = String(date || "");
  if (!d) return (created || 0) > w.setAt;
  return d > setDay || (d === setDay && (created || 0) > w.setAt);
}

// a debt amount in the wallet's currency (debts keep the rate they were made with)
export const inWalletCur = (w, d, amt, rate) => {
  const dc = d.currency === "USD" ? "USD" : "RMB", r = Number(d.rate) || rate;
  if (dc === wCur(w)) return amt;
  return dc === "USD" ? amt * r : amt / r;
};

// Every move that changed wallet `w` since its balance was set, newest first.
// data = { expenses, debts, transfers, wallets }; names = { cat(id) -> name } only used for the label.
export function walletMoves(w, data, rate, catName = (id) => id) {
  const moves = [];
  data.expenses.forEach((e) => {
    if (!afterSet(w, e.date, e.createdAt) || !w.methods.includes(e.method)) return;
    const v = wCur(w) === "USD" ? U(e) : R(e);
    moves.push({ at: e.createdAt, date: e.date, label: e.reason || catName(e.cat), amt: isInc(e) ? v : -v });
  });
  data.debts.forEach((d) => {
    const sgn = d.dir === "owed" ? -1 : 1, name = String(d.person || "").trim();
    if (d.wallet === w.id && afterSet(w, d.start, d.walletAt || d.createdAt)) moves.push({ at: d.walletAt || d.createdAt, date: d.start, label: (d.dir === "owed" ? "Lent to " : "Borrowed from ") + name, amt: sgn * inWalletCur(w, d, Number(d.amount), rate) });
    (d.payments || []).forEach((p) => { if (p.wallet === w.id && afterSet(w, p.date, p.at)) moves.push({ at: p.at, date: p.date, label: d.dir === "owed" ? name + " paid back" : "Paid back " + name, amt: -sgn * inWalletCur(w, d, Number(p.amount), rate) }); });
  });
  data.transfers.forEach((t) => {
    if (!afterSet(w, t.date, t.createdAt)) return;
    const other = (data.wallets || []).find((x) => x.id === (t.from === w.id ? t.to : t.from));
    if (t.from === w.id) moves.push({ at: t.createdAt, date: t.date, label: "Moved to " + (other ? other.name : "wallet"), amt: -Number(t.amount), tid: t.id });
    if (t.to === w.id) moves.push({ at: t.createdAt, date: t.date, label: "Moved from " + (other ? other.name : "wallet"), amt: Number(t.amountTo != null ? t.amountTo : t.amount), tid: t.id });
  });
  return moves.sort((a, b) => b.at - a.at);
}

export const walletBalance = (w, data, rate) => round2(w.balance + walletMoves(w, data, rate).reduce((a, m) => a + m.amt, 0));
