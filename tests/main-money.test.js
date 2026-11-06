import { describe, it, expect, afterEach } from "vitest";
import { setMainCur, mainCur, mainSym, rmb0, rmb, compactRmb, yuan0, yuan, usd0 } from "../src/lib/format.js";
import { R, U, statsOf, walletMoves, wToRmb, moneyOn } from "../src/lib/ledger.js";

afterEach(() => setMainCur("RMB"));

describe("main money formatting", () => {
  it("defaults to yuan; anything but USD means yuan", () => {
    expect(mainCur()).toBe("RMB");
    setMainCur("EUR");
    expect(mainCur()).toBe("RMB");
    setMainCur("USD");
    expect(mainCur()).toBe("USD");
    expect(mainSym()).toBe("$");
  });
  it("rmb0, rmb and compactRmb follow the main symbol", () => {
    expect(rmb0(12.8)).toBe("¥12.80");
    expect(compactRmb(1500)).toBe("¥1.5k");
    setMainCur("USD");
    expect(rmb0(12.8)).toBe("$12.80");
    expect(rmb0(12)).toBe("$12");
    expect(rmb(-3)).toBe("-$3.00");
    expect(compactRmb(1500)).toBe("$1.5k");
    expect(compactRmb(25000)).toBe("$25k");
    expect(compactRmb(50)).toBe("$50");
  });
  it("yuan0 and yuan always print yen, usd0 always dollars", () => {
    setMainCur("USD");
    expect(yuan0(12.8)).toBe("¥12.80");
    expect(yuan0(12)).toBe("¥12");
    expect(yuan(-3)).toBe("-¥3.00");
    expect(usd0(5)).toBe("$5");
  });
});

describe("main money in the ledger", () => {
  const e = { date: "2026-01-05", cat: "food", kind: "need", rmb: 85.76, usd: 12.8, createdAt: 5 };
  it("R and U swap", () => {
    expect([R(e), U(e)]).toEqual([85.76, 12.8]);
    setMainCur("USD");
    expect([R(e), U(e)]).toEqual([12.8, 85.76]);
  });
  it("statsOf sums exactly in dollars", () => {
    setMainCur("USD");
    const s = statsOf([e, { ...e, type: "income", rmb: 670, usd: 100 }], "2026-01");
    expect(s.rmb).toBe(12.8);
    expect(s.inc).toBe(100);
    expect(s.left).toBeCloseTo(87.2, 10);
    expect(s.usd).toBe(85.76);
  });
  const mk = (id, currency, methods) => ({ id, name: id, currency, methods, balance: 100, setAt: 1 });
  const data = (wallets) => ({ expenses: [{ ...e, method: "m" }], debts: [], transfers: [], wallets });
  it("walletMoves uses real fields in both modes", () => {
    for (const main of ["RMB", "USD"]) {
      setMainCur(main);
      expect(walletMoves(mk("y", "RMB", ["m"]), data([mk("y", "RMB", ["m"])]), 6.7)[0].amt).toBe(-85.76);
      expect(walletMoves(mk("d", "USD", ["m"]), data([mk("d", "USD", ["m"])]), 6.7)[0].amt).toBe(-12.8);
    }
  });
  it("wToRmb and moneyOn totals in USD main", () => {
    const yw = mk("y", "RMB", []), dw = mk("d", "USD", []);
    expect(wToRmb(dw, 10, 6.7)).toBe(67);
    expect(wToRmb(yw, 67, 6.7)).toBe(67);
    setMainCur("USD");
    expect(wToRmb(dw, 10, 6.7)).toBe(10);
    expect(wToRmb(yw, 67, 6.7)).toBeCloseTo(10, 10);
    const m = moneyOn([yw, dw], { expenses: [], debts: [], transfers: [] }, 6.7, "2026-12-31");
    expect(m.total).toBeCloseTo(100 / 6.7 + 100, 2);
  });
});
