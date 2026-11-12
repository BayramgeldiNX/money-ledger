import { describe, it, expect, afterEach } from "vitest";
import { firstEntryDate, daysSoFar, pctChange, isSamePct, monthPace, weekStats } from "../src/lib/report.js";
import { statsOf } from "../src/lib/ledger.js";
import { setMainCur } from "../src/lib/format.js";

afterEach(() => setMainCur("RMB"));
const e = (id, date, cat, rmb, extra = {}) => ({ id, date, cat, rmb, usd: rmb / 6.7, kind: "need", ...extra });

describe("report helpers", () => {
  it("first entry ever", () => {
    expect(firstEntryDate([])).toBe("");
    expect(firstEntryDate([e("a", "2026-03-05", "x", 1), e("b", "2026-01-09", "x", 1), { id: "c", rmb: 1 }])).toBe("2026-01-09");
  });
  it("days of a month so far: the whole month when past, up to today for the current one", () => {
    expect(daysSoFar("2026-10", "2026-11-12")).toBe(31);
    expect(daysSoFar("2026-02", "2026-11-12")).toBe(28);
    expect(daysSoFar("2026-11", "2026-11-12")).toBe(12);
  });
  it("percent change, with 'about the same' inside 3%", () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(80, 100)).toBe(-20);
    expect(pctChange(5, 0)).toBeNull();
    expect(isSamePct(pctChange(102, 100))).toBe(true);
    expect(isSamePct(pctChange(103, 100))).toBe(false);
    expect(isSamePct(pctChange(97, 100))).toBe(false);
    expect(isSamePct(pctChange(98, 100))).toBe(true);
  });
});

describe("month pace and projection", () => {
  it("projects the month end from flexible spending so far", () => {
    // 12 days into November, started tracking earlier: 1200 flexible so far = 100 a day, 18 days left
    const p = monthPace({ expenses: [e("a", "2026-10-02", "x", 1)], key: "2026-11", today: "2026-11-12", flexSoFar: 1200, spent: 2000 });
    expect(p).toMatchObject({ daysElapsed: 12, perDay: 100, daysLeft: 18, projected: 2000 + 100 * 18 });
  });
  it("does not divide by days before the first entry ever", () => {
    const p = monthPace({ expenses: [e("a", "2026-11-09", "x", 1)], key: "2026-11", today: "2026-11-12", flexSoFar: 400, spent: 400 });
    expect(p.daysElapsed).toBe(4); // 9th, 10th, 11th, 12th
    expect(p.perDay).toBe(100);
  });
  it("a finished month has no projection", () => {
    const p = monthPace({ expenses: [e("a", "2026-09-01", "x", 1)], key: "2026-10", today: "2026-11-12", flexSoFar: 3100, spent: 4000 });
    expect(p).toMatchObject({ daysElapsed: 31, daysLeft: 0, projected: null });
  });
  it("never divides by zero", () => {
    const p = monthPace({ expenses: [], key: "2026-11", today: "2026-11-01", flexSoFar: 0, spent: 0 });
    expect(p.daysElapsed).toBe(1);
    expect(p.perDay).toBe(0);
  });
});

describe("week and day stats", () => {
  const list = [
    e("1", "2026-11-09", "dining", 50), e("2", "2026-11-09", "coffee", 20), e("3", "2026-11-11", "dining", 30),
    e("4", "2026-11-12", "salary", 1000, { type: "income" }), e("5", "2026-11-12", "savings", 200, { kind: "save" }),
    e("6", "2026-11-16", "dining", 999), e("7", "2026-11-08", "dining", 999)
  ];
  it("sums one Monday-to-Sunday week: spent, income, saved, by section and by day", () => {
    const w = weekStats(list, "2026-11-09");
    expect(w.days).toHaveLength(7);
    expect(w).toMatchObject({ spent: 100, inc: 1000, saved: 200, count: 5 });
    expect(w.byCat.dining).toMatchObject({ rmb: 80, count: 2 });
    expect(w.byDay).toEqual({ "2026-11-09": 70, "2026-11-11": 30 });
    expect(w.list.map((x) => x.id)).toEqual(["1", "2", "3"]);
  });
  it("one day is a run of length 1", () => {
    expect(weekStats(list, "2026-11-09", 1)).toMatchObject({ spent: 70, count: 2 });
  });
  it("agrees with statsOf for the same entries (one rule for spent / income / saved)", () => {
    const inWeek = list.filter((x) => x.date >= "2026-11-09" && x.date <= "2026-11-15").map((x) => ({ ...x, date: x.date }));
    const s = statsOf(inWeek, "2026-11");
    const w = weekStats(list, "2026-11-09");
    expect([w.spent, w.inc, w.saved]).toEqual([s.rmb, s.inc, s.saved]);
  });
  it("measures in main money: dollars in International", () => {
    setMainCur("USD");
    expect(weekStats(list, "2026-11-09", 1).spent).toBeCloseTo(70 / 6.7);
  });
});
