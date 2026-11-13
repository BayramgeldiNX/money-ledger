import { describe, it, expect } from "vitest";
import { pctOf, mealTotal, mealParts, taxMonth, taxYear, taxEntries, isTaxEntry, hasTaxTip, TAX_CAT } from "../src/lib/tip.js";

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

describe("tax year and tax entries", () => {
  const ex = [
    { id: "a", date: "2026-03-10", amount: 1200, usd: 1200, cat: "taxes", reason: "Income tax", createdAt: 1 },
    { id: "b", date: "2026-11-02", amount: 51.55, usd: 51.55, cat: "dining", tax: 3.55, tip: 8, createdAt: 2 },
    { id: "c", date: "2026-11-02", amount: 900, usd: 900, cat: "taxes", reason: "Property tax", createdAt: 3 },
    { id: "d", date: "2026-11-05", amount: 12, usd: 12, cat: "dining", createdAt: 4 },
    { id: "e", date: "2026-11-06", amount: 300, usd: 300, cat: "tax_refund", kind: "income", type: "income", createdAt: 5 },
    { id: "f", date: "2025-12-30", amount: 50, usd: 50, cat: "taxes", reason: "Income tax", createdAt: 6 }
  ];
  it("adds up the whole year", () => {
    expect(taxYear(ex, 2026)).toEqual({ total: 2103.55, byReason: [{ reason: "Income tax", amount: 1200 }, { reason: "Property tax", amount: 900 }], meals: 3.55, tips: 8 });
    expect(taxYear(ex, "2025").total).toBe(50);
  });
  it("still works per month", () => {
    expect(taxMonth(ex, "2026-11").total).toBe(903.55);
  });
  it("lists Taxes payments and meals with tax, newest first, no income or plain meals", () => {
    expect(taxEntries(ex, "2026-11").map((e) => e.id)).toEqual(["c", "b"]);
    expect(taxEntries(ex, "2026").map((e) => e.id)).toEqual(["c", "b", "a"]);
    expect(isTaxEntry(ex[3])).toBe(false);
  });
});
