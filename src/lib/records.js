// Building money records. ledger.js does the math on entries, wallets and debts; this builds them, so the
// conventions that math depends on are set in one place: both money amounts (usd + rmb) from one rate,
// createdAt, a wallet's setAt, a debt's walletAt and payment `at`, "settled", and the rate-guess mark.
// Pure: the clock and the rate are arguments, nothing reads the screen.
import { round2 } from "./format.js";
import { withRealRate } from "./ledger.js";

// both money amounts of an amount typed in `currency`
export const amountsOf = (amount, currency, rate) => ({
  usd: round2(currency === "RMB" ? amount / rate : amount),
  rmb: round2(currency === "RMB" ? amount : amount * rate)
});

// An entry. `rate` is the rate the entry keeps (an edit keeps its own). Income has kind "income" and type "income".
export function buildEntry({ date, amount, currency, rate, cat, kind, reason, method, note = "", createdAt, income = false, bill = false, billId, rateGuess = false, tax = 0, tip = 0 }) {
  const e = { date, amount: round2(amount), currency, rate, ...amountsOf(amount, currency, rate), cat, kind: income ? "income" : kind, reason, method, note, createdAt };
  if (income) e.type = "income";
  if (Number(tax) > 0) e.tax = round2(Number(tax));
  if (Number(tip) > 0) e.tip = round2(Number(tip));
  if (bill) { e.bill = true; e.billId = billId; }
  if (rateGuess) e.rateGuess = true;
  return e;
}

// The entry a monthly bill adds on its day.
export function billEntry(b, date, rate, kind, now) {
  return buildEntry({ date, amount: b.amount, currency: b.currency, rate, cat: b.cat, kind: b.type === "income" ? "income" : kind, reason: b.name, method: b.method, createdAt: now, income: b.type === "income", bill: true, billId: b.id });
}

// Until the settings arrive, the rate is only the default. Anything saved with it is marked, and put right once the real rate is known.
export const isRateGuess = (old, configLoaded) => (old ? !!old.rateGuess : !configLoaded);
// the writes that put marked entries and debts right: [{id, doc}] for each
export function ratesToFix({ expenses, debts }, rate) {
  return {
    expenses: expenses.filter((e) => e.rateGuess).map((e) => ({ id: e.id, doc: withRealRate(e, rate) })),
    debts: debts.filter((d) => d.rateGuess).map((d) => { const { rateGuess, id, ...rest } = d; return { id, doc: { ...rest, rate } }; })
  };
}

// The moment a wallet's balance is set from: midnight of a past day (so that day's own entries count), now for today or later.
export function balanceTime(iso, today, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || "")) || iso >= today) return now;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

// ---- debts ----
export const paidOf = (d) => (d.payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0);
export const leftOf = (d) => Math.max(0, round2(Number(d.amount) - paidOf(d)));
// one rule for "settled", used when paying and when saving
export const isSettled = (amount, payments) => round2(Number(amount) - (payments || []).reduce((a, p) => a + (Number(p.amount) || 0), 0)) <= 0;

// Record a payment. The amount is capped at what is left. Returns the new document, the amount really recorded,
// whether the debt is now settled, and the document as it was (for Undo). `d` may carry an id; the document does not.
export function applyPayment(d, amount, { id, today, wallet = "", now }) {
  const left = leftOf(d);
  const amt = round2(Math.min(amount, left));
  const before = Object.fromEntries(Object.entries(d).filter(([k]) => k !== "id"));
  const payments = (d.payments || []).concat([{ id, date: today, amount: amt, wallet: wallet || "", at: now }]);
  const doc = { ...before, payments };
  const fully = isSettled(d.amount, payments);
  if (fully) { doc.settled = true; doc.settledAt = now; }
  return { doc, amt, fully, left, before };
}

// A debt wallet chosen (or changed) now counts from now on; an unchanged one keeps its original moment.
export const walletAtFor = (old, wallet, now) => (wallet ? (old && old.wallet === wallet ? old.walletAt || old.createdAt || now : now) : 0);

// A debt from the form. An edit keeps its rate, payments, createdAt and example mark.
export function buildDebt({ dir, person, amount, currency, reason, start, due, wallet = "" }, { old = null, rate, configLoaded, now }) {
  const doc = {
    dir, person, amount: round2(amount), currency, rate: old && old.rate ? old.rate : rate, reason, start, due,
    payments: old ? old.payments || [] : [], settled: false, settledAt: 0, createdAt: old ? old.createdAt || now : now,
    wallet: wallet || "", walletAt: walletAtFor(old, wallet, now)
  };
  if (old && old.example) doc.example = true;
  if (isRateGuess(old, configLoaded)) doc.rateGuess = true;
  if (isSettled(doc.amount, doc.payments)) { doc.settled = true; doc.settledAt = now; }
  return doc;
}

// ---- moving money between wallets ----
// an amount in one currency as the other, at the rate (what the other wallet is filled in with; the owner can change it)
export const convertAmount = (n, fromCur, toCur, rate) => (fromCur === toCur ? n : fromCur === "USD" ? n * rate : n / rate);
// what is wrong with a move the owner typed ("" when fine). `got` is only needed between a yuan and a dollar wallet.
export const transferProblem = (amount, got, cross) => (!(round2(amount) > 0) ? "Enter how much you moved." : cross && !(round2(got) > 0) ? "Enter how much you received." : "");
// A wallet move. `amountTo` is what the other wallet really received, so a move between ¥ and $ wallets keeps the real figure.
export const buildTransfer = ({ from, to, amount, amountTo, today, now }) => ({ from, to, amount: round2(amount), amountTo: round2(amountTo), date: today, createdAt: now });
