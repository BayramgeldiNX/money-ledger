import { describe, it, expect } from "vitest";
import { statsOf, afterSet, walletBalance, walletMoves } from "../src/lib/ledger.js";

const RATE = 6.7;
const at = (iso, hh = 12) => new Date(iso + "T" + String(hh).padStart(2, "0") + ":00:00").getTime();
const exp = (o) => ({ currency: "RMB", rate: RATE, usd: Math.round((o.rmb / RATE) * 100) / 100, kind: "need", method: "Alipay", ...o });

describe("month stats", () => {
  const expenses = [
    exp({ date: "2026-10-05", rmb: 100, cat: "dining" }),
    exp({ date: "2026-10-06", rmb: 50, cat: "shopping", kind: "want" }),
    exp({ date: "2026-10-07", rmb: 200, cat: "savings", kind: "save" }),
    exp({ date: "2026-10-08", rmb: 1000, cat: "salary", type: "income", kind: "income" }),
    exp({ date: "2026-09-30", rmb: 999, cat: "dining" }),
  ];
  it("income is not spending, savings are not spending", () => {
    const s = statsOf(expenses, "2026-10");
    expect(s.rmb).toBe(150);
    expect(s.inc).toBe(1000);
    expect(s.saved).toBe(200);
  });
  it("left = income - spent - saved", () => {
    expect(statsOf(expenses, "2026-10").left).toBe(650);
  });
  it("only counts the month asked for", () => {
    expect(statsOf(expenses, "2026-09").rmb).toBe(999);
    expect(statsOf(expenses, "2026-08").count).toBe(0);
  });
  it("splits needs and wants", () => {
    const s = statsOf(expenses, "2026-10");
    expect(s.byKind.need).toBe(100);
    expect(s.byKind.want).toBe(50);
  });
});

describe("a wallet only changes for things after its balance was set", () => {
  const w = { id: "alipay", name: "Alipay", methods: ["Alipay"], currency: "RMB", balance: 68, setAt: at("2026-10-21", 15) };
  it("entries dated before the balance are ignored", () => {
    expect(afterSet(w, "2026-10-20", at("2026-10-22"))).toBe(false);
  });
  it("entries on a later day count", () => {
    expect(afterSet(w, "2026-10-22", at("2026-10-22"))).toBe(true);
  });
  it("same day counts only if added after the balance", () => {
    expect(afterSet(w, "2026-10-21", at("2026-10-21", 10))).toBe(false);
    expect(afterSet(w, "2026-10-21", at("2026-10-21", 18))).toBe(true);
  });
  it("adds income, takes off spending, ignores other payment methods", () => {
    const data = {
      expenses: [
        exp({ date: "2026-10-22", createdAt: at("2026-10-22"), rmb: 20, cat: "dining" }),
        exp({ date: "2026-10-22", createdAt: at("2026-10-22"), rmb: 100, cat: "salary", type: "income", kind: "income" }),
        exp({ date: "2026-10-22", createdAt: at("2026-10-22"), rmb: 999, cat: "dining", method: "Cash" }),
      ],
      debts: [], transfers: [], wallets: [w],
    };
    expect(walletBalance(w, data, RATE)).toBe(148);
  });
});

describe("two wallets that list the same payment method", () => {
  const setAt = at("2026-10-01", 9);
  const bank = { id: "bank", name: "Bank card", methods: ["Bank card", "Bank transfer"], currency: "RMB", balance: 1000, setAt };
  const second = { id: "w2", name: "Bank transfer", methods: ["Bank transfer"], currency: "RMB", balance: 500, setAt };
  const data = { expenses: [exp({ date: "2026-10-10", createdAt: at("2026-10-10"), rmb: 100, cat: "dining", method: "Bank transfer" })], debts: [], transfers: [], wallets: [bank, second] };
  it("takes one expense off one wallet only, the first that lists the method", () => {
    expect(walletBalance(bank, data, RATE)).toBe(900);
    expect(walletBalance(second, data, RATE)).toBe(500);
  });
  it("still works when the wallet list is not passed", () => {
    expect(walletBalance(second, { ...data, wallets: undefined }, RATE)).toBe(400);
  });
});

describe("transfers, debts and dollar wallets", () => {
  const cash = { id: "cash", name: "Cash", methods: ["Cash"], currency: "RMB", balance: 0, setAt: at("2026-10-17", 9) };
  const viza = { id: "viza", name: "VIZA", methods: ["VIZA"], currency: "USD", balance: 75, setAt: at("2026-10-18", 9) };
  const wallets = [cash, viza];
  it("a move between a dollar wallet and yuan wallet uses the amount you really got", () => {
    const data = { expenses: [], debts: [], wallets, transfers: [{ id: "t1", from: "viza", to: "cash", amount: 60, amountTo: 400, date: "2026-10-25", createdAt: at("2026-10-25") }] };
    expect(walletBalance(viza, data, RATE)).toBe(15);
    expect(walletBalance(cash, data, RATE)).toBe(400);
  });
  it("lending takes money out of the wallet and a pay-back puts it back", () => {
    const debt = { id: "d1", dir: "owed", person: "Friend", amount: 650, currency: "RMB", rate: RATE, wallet: "cash", walletAt: at("2026-10-20"), start: "2026-10-20", payments: [{ id: "p1", date: "2026-10-22", amount: 250, wallet: "cash", at: at("2026-10-22") }] };
    const data = { expenses: [], transfers: [], wallets, debts: [debt] };
    expect(walletBalance(cash, data, RATE)).toBe(-400);
  });
  it("borrowing adds money, paying it back takes it off", () => {
    const debt = { id: "d2", dir: "owe", person: "Ali", amount: 80, currency: "RMB", rate: RATE, wallet: "cash", walletAt: at("2026-10-20"), start: "2026-10-20", payments: [{ id: "p2", date: "2026-10-21", amount: 30, wallet: "cash", at: at("2026-10-21") }] };
    expect(walletBalance(cash, { expenses: [], transfers: [], wallets, debts: [debt] }, RATE)).toBe(50);
  });
  it("lists the moves newest first with readable names", () => {
    const data = { expenses: [exp({ date: "2026-10-22", createdAt: at("2026-10-22"), rmb: 20, cat: "dining", method: "Cash" })], debts: [], transfers: [], wallets };
    const moves = walletMoves(cash, data, RATE, () => "Food");
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ label: "Food", amt: -20 });
  });
});
