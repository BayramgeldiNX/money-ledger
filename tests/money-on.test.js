import { describe, it, expect } from "vitest";
import { walletBalanceOn, moneyOn, walletBalance } from "../src/lib/ledger.js";

const RATE = 6.7;
const at = (d, h = 12) => new Date(2026, 9, d, h).getTime();
const iso = (d) => "2026-10-" + String(d).padStart(2, "0");
const spend = (d, rmb, method = "Alipay", created = at(d, 15)) => ({ date: iso(d), rmb, usd: rmb / RATE, method, createdAt: created, kind: "need" });

const alipay = { id: "a", name: "Alipay", methods: ["Alipay"], currency: "RMB", balance: 1000, setAt: at(10) };
const cash = { id: "c", name: "Cash", methods: ["Cash"], currency: "RMB", balance: 200, setAt: at(20) };
const dollars = { id: "d", name: "Dollars", methods: ["USD card"], currency: "USD", balance: 100, setAt: at(10) };
const data = (o = {}) => ({ expenses: [], debts: [], transfers: [], wallets: [alipay, cash, dollars], ...o });

describe("money at the end of a day", () => {
  it("counts only what happened up to that day", () => {
    const d = data({ expenses: [spend(12, 12.8), spend(15, 100), spend(18, 50)] });
    expect(walletBalanceOn(alipay, d, RATE, iso(11))).toBe(1000);
    expect(walletBalanceOn(alipay, d, RATE, iso(12))).toBe(987.2);
    expect(walletBalanceOn(alipay, d, RATE, iso(16))).toBe(887.2);
    expect(walletBalanceOn(alipay, d, RATE, iso(18))).toBe(837.2);
  });
  it("never guesses a day before the balance was set", () => {
    expect(walletBalanceOn(alipay, data(), RATE, iso(9))).toBeNull();
  });
  it("on the day it was set, only counts what was added after the balance", () => {
    const d = data({ expenses: [spend(10, 30, "Alipay", at(10, 9)), spend(10, 5, "Alipay", at(10, 18))] });
    expect(walletBalanceOn(alipay, d, RATE, iso(10))).toBe(995);
  });
  it("matches the wallet balance once every move has happened", () => {
    const d = data({ expenses: [spend(12, 12.8), spend(15, 100)] });
    expect(walletBalanceOn(alipay, d, RATE, iso(31))).toBe(walletBalance(alipay, d, RATE));
  });
  it("includes moves between wallets and debts on their own dates", () => {
    const d = data({
      transfers: [{ id: "t", from: "a", to: "c", amount: 40, amountTo: 40, date: iso(21), createdAt: at(21) }],
      debts: [{ id: "x", dir: "owed", person: "Anna", amount: 100, currency: "RMB", rate: RATE, wallet: "a", start: iso(13), createdAt: at(13), walletAt: at(13), payments: [{ date: iso(22), amount: 30, wallet: "a", at: at(22) }] }],
    });
    expect(walletBalanceOn(alipay, d, RATE, iso(12))).toBe(1000);
    expect(walletBalanceOn(alipay, d, RATE, iso(13))).toBe(900);
    expect(walletBalanceOn(alipay, d, RATE, iso(21))).toBe(860);
    expect(walletBalanceOn(alipay, d, RATE, iso(22))).toBe(890);
    expect(walletBalanceOn(cash, d, RATE, iso(21))).toBe(240);
  });
  it("adds wallets in yuan and leaves out ones that started later", () => {
    const m = moneyOn([alipay, cash, dollars], data({ expenses: [spend(12, 12.8)] }), RATE, iso(15));
    expect(m.total).toBe(987.2 + 100 * RATE);
    expect(m.known.map((x) => x.w.id)).toEqual(["a", "d"]);
    expect(m.missing.map((w) => w.id)).toEqual(["c"]);
  });
  it("reports nothing known before any wallet started", () => {
    const m = moneyOn([alipay, cash], data(), RATE, iso(1));
    expect(m.known).toEqual([]);
    expect(m.total).toBe(0);
  });
});
