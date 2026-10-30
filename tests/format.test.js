import { describe, it, expect } from "vitest";
import { parseAmt, amountInText, rmb0, usd, usd0, rmb, smart, pct, ordinal, listJoin, compactRmb, csvCell } from "../src/lib/format.js";

describe("csvCell", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
  it("stops typed text from running as a formula, but leaves numbers alone", () => {
    expect(csvCell("=SUM(A1)", true)).toBe("'=SUM(A1)");
    expect(csvCell("-5 coffee", true)).toBe("'-5 coffee");
    expect(csvCell(-12.8)).toBe("-12.8");
    expect(csvCell(null, true)).toBe("");
  });
});

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

describe("parseAmt never guesses", () => {
  it("reads Chinese keyboard characters", () => {
    expect(parseAmt("12，8")).toBe(12.8);
    expect(parseAmt("12。8")).toBe(12.8);
    expect(parseAmt("１２.５")).toBe(12.5);
    expect(parseAmt("￥38")).toBe(38);
    expect(parseAmt("38元")).toBe(38);
  });
  it("reads both ways of writing thousands", () => {
    expect(parseAmt("1,250")).toBe(1250);
    expect(parseAmt("12,345.60")).toBe(12345.6);
    expect(parseAmt("1.250,50")).toBe(1250.5);
  });
  it("refuses text that is not a clean number", () => {
    ["12abc", "1.2.3", "1e5", "1,2345", ".", "-"].forEach((s) => expect(parseAmt(s)).toBeNaN());
  });
  it("keeps negative balances and zero", () => {
    expect(parseAmt("-50")).toBe(-50);
    expect(parseAmt("0")).toBe(0);
  });
});

describe("amount inside a note", () => {
  it("does not read a thousands comma as a decimal", () => {
    expect(amountInText("rent 1,250")).toBe(1250);
  });
  it("reads comma decimals", () => {
    expect(amountInText("coffee 12,8 wechat")).toBe(12.8);
  });
  it("prefers the number with a currency mark", () => {
    expect(amountInText("3 cups 午饭 38元")).toBe(38);
    expect(amountInText("100 pages $5")).toBe(5);
  });
  it("takes the largest plain number, not a count", () => {
    expect(amountInText("2 coffees 30")).toBe(30);
  });
  it("gives null when there is no number", () => {
    expect(amountInText("coffee")).toBeNull();
  });
});

describe("money text", () => {
  it("never shows minus zero from a rounding crumb", () => {
    expect(rmb0(0.1 + 0.2 - 0.3 - 0.0000001)).toBe("¥0");
    expect(usd(-0.001)).toBe("$0.00");
  });
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
