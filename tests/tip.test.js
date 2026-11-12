import { describe, it, expect } from "vitest";
import { pctOf, mealTotal, mealParts, taxMonth, hasTaxTip, TAX_CAT } from "../src/lib/tip.js";

describe("tax and tip maths", () => {
  it("pctOf", () => {
    expect(pctOf(40, 8.875)).toBe(3.55);
    expect(pctOf(40, 18)).toBe(7.2);
    expect(pctOf("", 18)).toBe(0);
  });
  it("mealTotal", () => {
    expect(mealTotal(40, 3.55, 8)).toBe(51.55);
    expect(mealTotal(12.8, 0, 0)).toBe(12.8);
  });
  it("mealParts", () => {
    expect(mealParts({ amount: 51.55, tax: 3.55, tip: 8 })).toEqual({ bill: 40, tax: 3.55, tip: 8 });
    expect(mealParts({ amount: 12.8 })).toEqual({ bill: 12.8, tax: 0, tip: 0 });
  });
  it("hasTaxTip", () => {
    expect(hasTaxTip("dining")).toBe(true);
    expect(hasTaxTip("coffee")).toBe(true);
    expect(hasTaxTip("groceries")).toBe(false);
  });
});

describe("taxMonth", () => {
  const ex = [
    { date: "2026-11-02", cat: TAX_CAT, reason: "Income tax", amount: 100, usd: 100 },
    { date: "2026-11-03", cat: TAX_CAT, reason: "Property tax", amount: 300, usd: 300 },
    { date: "2026-11-04", cat: TAX_CAT, reason: "", amount: 20, usd: 20 },
    { date: "2026-11-05", cat: "dining", amount: 51.55, usd: 51.55, tax: 3.55, tip: 8 },
    { date: "2026-11-06", cat: "coffee", amount: 335, currency: "RMB", usd: 50, tax: 67, tip: 33.5 },
    { date: "2026-10-05", cat: TAX_CAT, reason: "Income tax", amount: 999, usd: 999 },
    { date: "2026-11-07", cat: "tax_refund", type: "income", kind: "income", amount: 500, usd: 500, tax: 5 }
  ];
  it("adds taxes and meal tax, ignores other months and income", () => {
    const t = taxMonth(ex, "2026-11");
    expect(t.meals).toBe(13.55);
    expect(t.total).toBe(433.55);
    expect(t.tips).toBe(13);
    expect(t.byReason).toEqual([
      { reason: "Property tax", amount: 300 },
      { reason: "Income tax", amount: 100 },
      { reason: "Other tax", amount: 20 }
    ]);
  });
  it("empty month is zeros", () => {
    expect(taxMonth(ex, "2026-09")).toEqual({ total: 0, byReason: [], meals: 0, tips: 0 });
  });
});
