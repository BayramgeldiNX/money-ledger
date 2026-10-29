import { describe, it, expect } from "vitest";
import { parseAmt, rmb0, usd0, rmb, smart, pct, ordinal, listJoin, compactRmb } from "../src/lib/format.js";

describe("parseAmt", () => {
  it("reads dot and comma decimals", () => {
    expect(parseAmt("12.8")).toBe(12.8);
    expect(parseAmt("12,8")).toBe(12.8);
    expect(parseAmt("28,5")).toBe(28.5);
  });
  it("reads thousands separators and currency signs", () => {
    expect(parseAmt("1,250")).toBe(1250);
    expect(parseAmt("¥1,250.50")).toBe(1250.5);
    expect(parseAmt("$ 75")).toBe(75);
  });
  it("gives NaN for nonsense", () => {
    expect(parseAmt("abc")).toBeNaN();
    expect(parseAmt("")).toBeNaN();
  });
});

describe("money text", () => {
  it("never rounds your decimals away (12.8 stays 12.80)", () => {
    expect(rmb0(12.8)).toBe("¥12.80");
    expect(rmb0(13)).toBe("¥13");
    expect(smart(0.45)).toBe("0.45");
  });
  it("puts the minus sign before the symbol", () => {
    expect(rmb0(-288.23)).toBe("-¥288.23");
    expect(usd0(-5)).toBe("-$5");
    expect(rmb(1000)).toBe("¥1,000.00");
  });
  it("shortens big numbers for charts", () => {
    expect(compactRmb(950)).toBe("¥950");
    expect(compactRmb(1500)).toBe("¥1.5k");
    expect(compactRmb(12400)).toBe("¥12k");
  });
});

describe("small helpers", () => {
  it("percent of a total", () => {
    expect(pct(25, 100)).toBe(25);
    expect(pct(5, 0)).toBe(0);
  });
  it("ordinal days", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
  it("joins names", () => {
    expect(listJoin([])).toBe("");
    expect(listJoin(["Food"])).toBe("Food");
    expect(listJoin(["Groceries", "Food", "Coffee"])).toBe("Groceries, Food and Coffee");
  });
});
