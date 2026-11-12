import { describe, it, expect } from "vitest";
import { convertAmount, transferProblem, buildTransfer, amountsOf, buildEntry, billEntry, isRateGuess, ratesToFix, balanceTime, leftOf, paidOf, isSettled, applyPayment, walletAtFor, buildDebt } from "../src/lib/records.js";
import { walletBalance } from "../src/lib/ledger.js";

const RATE = 6.7;

describe("entries", () => {
  it("both amounts come from one rate and keep decimals", () => {
    expect(amountsOf(12.8, "RMB", RATE)).toEqual({ usd: 1.91, rmb: 12.8 });
    expect(amountsOf(10, "USD", RATE)).toEqual({ usd: 10, rmb: 67 });
    expect(amountsOf(4.5, "USD", RATE).rmb).toBe(30.15);
  });
  it("builds an expense with the owner's decimals intact", () => {
    const e = buildEntry({ date: "2026-01-02", amount: 12.8, currency: "RMB", rate: RATE, cat: "dining", kind: "need", reason: "lunch", method: "Alipay", createdAt: 5 });
    expect(e).toMatchObject({ amount: 12.8, rmb: 12.8, usd: 1.91, kind: "need", note: "", createdAt: 5 });
    expect(e.type).toBeUndefined();
    expect(e.rateGuess).toBeUndefined();
  });
  it("rounds the stored amount to cents", () => {
    expect(buildEntry({ date: "d", amount: 3.456, currency: "USD", rate: RATE, cat: "c", kind: "want", reason: "", method: "Cash", createdAt: 1 }).amount).toBe(3.46);
  });
  it("income has kind and type income", () => {
    const e = buildEntry({ date: "d", amount: 100, currency: "RMB", rate: RATE, cat: "salary", kind: "need", income: true, reason: "", method: "Alipay", createdAt: 1 });
    expect(e.kind).toBe("income"); expect(e.type).toBe("income");
  });
  it("edits keep the bill mark and a guessed-rate mark", () => {
    const e = buildEntry({ date: "d", amount: 1, currency: "RMB", rate: RATE, cat: "c", kind: "need", reason: "", method: "x", createdAt: 1, bill: true, billId: "b1", rateGuess: true });
    expect(e).toMatchObject({ bill: true, billId: "b1", rateGuess: true });
  });
  it("a monthly bill adds an entry on its day, income bills as income", () => {
    const b = { id: "b1", type: "expense", name: "Rent", cat: "housing", amount: 1000, currency: "RMB", method: "Bank transfer" };
    expect(billEntry(b, "2026-02-05", RATE, "need", 9)).toMatchObject({ date: "2026-02-05", reason: "Rent", bill: true, billId: "b1", kind: "need", rmb: 1000, createdAt: 9 });
    const inc = billEntry({ ...b, type: "income", name: "Pay" }, "2026-02-05", RATE, "need", 9);
    expect(inc).toMatchObject({ type: "income", kind: "income" });
  });
});

describe("rate guesses", () => {
  it("a new record is a guess until the settings loaded; an edit keeps its own mark", () => {
    expect(isRateGuess(null, false)).toBe(true);
    expect(isRateGuess(null, true)).toBe(false);
    expect(isRateGuess({ rateGuess: true }, true)).toBe(true);
    expect(isRateGuess({}, false)).toBe(false);
  });
  it("lists the corrections for marked entries and debts only", () => {
    const fix = ratesToFix({
      expenses: [{ id: "a", amount: 67, currency: "RMB", rate: 6.7, usd: 10, rmb: 67, rateGuess: true }, { id: "b", amount: 1, currency: "RMB", rate: 6.7, usd: 1, rmb: 1 }],
      debts: [{ id: "d", amount: 5, rate: 6.7, rateGuess: true }, { id: "e", amount: 5, rate: 6.7 }]
    }, 7);
    expect(fix.expenses.map((x) => x.id)).toEqual(["a"]);
    expect(fix.expenses[0].doc.rateGuess).toBeUndefined();
    expect(fix.expenses[0].doc.rate).toBe(7);
    expect(fix.debts).toEqual([{ id: "d", doc: { amount: 5, rate: 7 } }]);
  });
});

describe("balanceTime (when a wallet balance counts from)", () => {
  const now = new Date(2026, 5, 15, 14, 30).getTime();
  it("today, the future or an unreadable date counts from now", () => {
    expect(balanceTime("2026-06-15", "2026-06-15", now)).toBe(now);
    expect(balanceTime("2026-07-01", "2026-06-15", now)).toBe(now);
    expect(balanceTime("", "2026-06-15", now)).toBe(now);
    expect(balanceTime("junk", "2026-06-15", now)).toBe(now);
  });
  it("a past day counts from its midnight, so that day's own entries are included", () => {
    expect(balanceTime("2026-06-10", "2026-06-15", now)).toBe(new Date(2026, 5, 10).getTime());
  });
  it("the wallet then moves only for things dated after it was set", () => {
    const setAt = balanceTime("2026-06-10", "2026-06-15", now);
    const w = { id: "w", name: "Alipay", methods: ["Alipay"], currency: "RMB", balance: 1000, setAt };
    const before = buildEntry({ date: "2026-06-09", amount: 50, currency: "RMB", rate: RATE, cat: "c", kind: "need", reason: "", method: "Alipay", createdAt: new Date(2026, 5, 9, 12).getTime() });
    const after = buildEntry({ date: "2026-06-12", amount: 30, currency: "RMB", rate: RATE, cat: "c", kind: "need", reason: "", method: "Alipay", createdAt: new Date(2026, 5, 12, 12).getTime() });
    expect(walletBalance(w, { expenses: [before, after], debts: [], transfers: [], wallets: [w] })).toBe(970);
  });
});

describe("debts", () => {
  const debt = { id: "d", dir: "owed", person: "Ann", amount: 100, currency: "RMB", rate: RATE, payments: [] };
  it("paid and left", () => {
    const d = { ...debt, payments: [{ amount: 30 }, { amount: 20.5 }] };
    expect(paidOf(d)).toBe(50.5);
    expect(leftOf(d)).toBe(49.5);
    expect(leftOf({ ...debt, payments: [{ amount: 150 }] })).toBe(0);
  });
  it("one settled rule, safe with decimal sums", () => {
    expect(isSettled(0.3, [{ amount: 0.1 }, { amount: 0.2 }])).toBe(true);
    expect(isSettled(1.1, [{ amount: 1.0999999999999999 }])).toBe(true);
    expect(isSettled(100, [{ amount: 99.99 }])).toBe(false);
  });
  it("a payment is capped at what is left and settles the debt when it clears it", () => {
    const r = applyPayment({ ...debt, payments: [{ amount: 60 }] }, 500, { id: "p1", today: "2026-06-15", wallet: "w1", now: 77 });
    expect(r.amt).toBe(40);
    expect(r.fully).toBe(true);
    expect(r.doc).toMatchObject({ settled: true, settledAt: 77 });
    expect(r.doc.payments.at(-1)).toEqual({ id: "p1", date: "2026-06-15", amount: 40, wallet: "w1", at: 77 });
    expect(r.doc.id).toBeUndefined();
    expect(r.before.payments).toHaveLength(1); // Undo restores this
  });
  it("a part payment leaves the debt open", () => {
    const r = applyPayment(debt, 25.5, { id: "p", today: "t", now: 1 });
    expect(r.fully).toBe(false);
    expect(r.doc.settled).toBeUndefined();
    expect(r.left).toBe(100);
    expect(r.amt).toBe(25.5);
  });
  it("a changed wallet restarts from now; an unchanged wallet keeps its first moment", () => {
    expect(walletAtFor(null, "w1", 50)).toBe(50);
    expect(walletAtFor({ wallet: "w1", walletAt: 10 }, "w1", 50)).toBe(10);
    expect(walletAtFor({ wallet: "w1", walletAt: 0, createdAt: 7 }, "w1", 50)).toBe(7);
    expect(walletAtFor({ wallet: "w1", walletAt: 10 }, "w2", 50)).toBe(50);
    expect(walletAtFor({ wallet: "w1", walletAt: 10 }, "", 50)).toBe(0);
  });
  it("builds a new debt and keeps an edit's rate, payments and createdAt", () => {
    const form = { dir: "owe", person: "Bo", amount: 80.5, currency: "USD", reason: "", start: "2026-01-01", due: "", wallet: "" };
    const fresh = buildDebt(form, { rate: 7, configLoaded: true, now: 99 });
    expect(fresh).toMatchObject({ amount: 80.5, rate: 7, createdAt: 99, settled: false, payments: [], walletAt: 0 });
    expect(fresh.rateGuess).toBeUndefined();
    const old = { id: "x", rate: 6.5, createdAt: 11, payments: [{ amount: 80.5 }], example: true, rateGuess: true };
    const edited = buildDebt(form, { old, rate: 7, configLoaded: true, now: 99 });
    expect(edited).toMatchObject({ rate: 6.5, createdAt: 11, example: true, rateGuess: true, settled: true, settledAt: 99 });
  });
});

describe("moving money between wallets", () => {
  it("converts at the rate in either direction, and leaves the same currency alone", () => {
    expect(convertAmount(670, "RMB", "USD", 6.7)).toBeCloseTo(100);
    expect(convertAmount(100, "USD", "RMB", 6.7)).toBeCloseTo(670);
    expect(convertAmount(5, "RMB", "RMB", 6.7)).toBe(5);
  });
  it("says what is wrong before saving", () => {
    expect(transferProblem(0, 0, false)).toBe("Enter how much you moved.");
    expect(transferProblem(NaN, 5, true)).toBe("Enter how much you moved.");
    expect(transferProblem(10, 0, true)).toBe("Enter how much you received.");
    expect(transferProblem(10, NaN, false)).toBe(""); // same currency: nothing to receive
    expect(transferProblem(10.5, 70, true)).toBe("");
  });
  it("keeps the amount really received, so a ¥ to $ move is not re-converted", () => {
    const tr = buildTransfer({ from: "rmb", to: "usd", amount: 670, amountTo: 98.75, today: "2026-06-15", now: 5 });
    expect(tr).toEqual({ from: "rmb", to: "usd", amount: 670, amountTo: 98.75, date: "2026-06-15", createdAt: 5 });
    const setAt = new Date(2026, 5, 1).getTime();
    const rmb = { id: "rmb", name: "Alipay", methods: ["Alipay"], currency: "RMB", balance: 1000, setAt };
    const usdW = { id: "usd", name: "Chase", methods: ["Chase"], currency: "USD", balance: 0, setAt };
    const ctx = { expenses: [], debts: [], transfers: [{ id: "t", ...tr, createdAt: new Date(2026, 5, 15, 12).getTime() }], wallets: [rmb, usdW] };
    expect(walletBalance(rmb, ctx)).toBe(330);
    expect(walletBalance(usdW, ctx)).toBe(98.75); // the dollars it really got, not 100
  });
  it("rounds to cents", () => {
    expect(buildTransfer({ from: "a", to: "b", amount: 10.005, amountTo: 1.4949, today: "d", now: 1 })).toMatchObject({ amount: 10.01, amountTo: 1.49 });
  });
});

describe("entries with tax and tip", () => {
  const base = { date: "2026-11-01", currency: "USD", rate: RATE, cat: "dining", kind: "need", reason: "Lunch", method: "Cash", createdAt: 1 };
  it("keeps tax and tip when above zero", () => {
    const e = buildEntry({ ...base, amount: 51.55, tax: 3.55, tip: 8 });
    expect(e.amount).toBe(51.55);
    expect(e.tax).toBe(3.55);
    expect(e.tip).toBe(8);
  });
  it("has no tax/tip keys without them", () => {
    const e = buildEntry({ ...base, amount: 40, tax: 0 });
    expect("tax" in e).toBe(false);
    expect("tip" in e).toBe(false);
  });
});
