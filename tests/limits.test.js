import { describe, it, expect, afterEach } from "vitest";
import { limRange, limEntries, limSpent, limStatus, anyOver, laterDue, entryWarning, foodOn, foodKept } from "../src/lib/limits.js";
import { setMainCur } from "../src/lib/format.js";

afterEach(() => setMainCur("RMB"));
const x = (id, date, cat, rmb, extra = {}) => ({ id, date, cat, rmb, usd: rmb / 6.7, kind: "want", ...extra });
const month = { id: "m", cats: ["shopping", "clothing"], amount: 500, period: "month" };
const week = { id: "w", cats: ["coffee"], amount: 50, period: "week" };

describe("limit periods", () => {
  it("a month runs from the 1st to the last day, leap years included", () => {
    expect(limRange(month, "2026-02-17")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(limRange(month, "2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(limRange(month, "2026-12-31")).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
  it("a week runs Monday to Sunday, across months and years", () => {
    expect(limRange(week, "2026-11-12")).toEqual({ start: "2026-11-09", end: "2026-11-15" }); // Thursday
    expect(limRange(week, "2026-11-15")).toEqual({ start: "2026-11-09", end: "2026-11-15" }); // Sunday
    expect(limRange(week, "2026-11-09")).toEqual({ start: "2026-11-09", end: "2026-11-15" }); // Monday
    expect(limRange(week, "2026-12-31")).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });
});

describe("what counts toward a limit", () => {
  const list = [
    x("1", "2026-11-02", "shopping", 100),
    x("2", "2026-11-20", "clothing", 150),
    x("3", "2026-11-21", "dining", 999),                   // other section
    x("4", "2026-10-31", "shopping", 300),                 // other month
    x("5", "2026-11-05", "shopping", 40, { kind: "save" }), // savings are not spending
    x("6", "2026-11-06", "shopping", 60, { type: "income" })
  ];
  it("counts only spending in its sections and period", () => {
    expect(limEntries(month, "2026-11-12", list).map((e) => e.id)).toEqual(["1", "2"]);
    expect(limSpent(month, "2026-11-12", list)).toBe(250);
  });
  it("can leave one entry out (an edit stops counting against itself)", () => {
    expect(limSpent(month, "2026-11-12", list, "1")).toBe(150);
  });
  it("measures in main money: dollars in International", () => {
    setMainCur("USD");
    expect(limSpent(month, "2026-11-12", list)).toBeCloseTo(250 / 6.7);
  });
});

describe("one verdict", () => {
  const spend = (n) => [x("a", "2026-11-03", "shopping", n)];
  it("ok below 80%, near at 80%, hot at 90%, over only past the limit", () => {
    const lv = (n) => limStatus(month, "2026-11-12", spend(n)).level;
    expect(lv(399)).toBe("ok");
    expect(lv(400)).toBe("near");
    expect(lv(449)).toBe("near");
    expect(lv(450)).toBe("hot");
    expect(lv(500)).toBe("hot"); // exactly at the limit is not over
    expect(lv(500.01)).toBe("over");
  });
  it("near includes hot, and neither is set once over", () => {
    expect(limStatus(month, "2026-11-12", spend(460))).toMatchObject({ near: true, hot: true, over: false });
    expect(limStatus(month, "2026-11-12", spend(600))).toMatchObject({ near: false, hot: false, over: true });
    expect(limStatus(month, "2026-11-12", spend(420))).toMatchObject({ near: true, hot: false, left: 80 });
  });
  it("the Home dot looks at every limit", () => {
    expect(anyOver([month, week], "2026-11-12", spend(600))).toBe(true);
    expect(anyOver([month, week], "2026-11-12", spend(100))).toBe(false);
    expect(anyOver(undefined, "2026-11-12", [])).toBe(false);
  });
  it("a waiting item is due when its month has come", () => {
    expect(laterDue([{ forMonth: "2026-12" }], "2026-11")).toBe(false);
    expect(laterDue([{ forMonth: "2026-12" }], "2026-12")).toBe(true);
    expect(laterDue([{ forMonth: "" }], "2026-12")).toBe(false);
  });
});

describe("add-form warning", () => {
  const spent = [x("a", "2026-11-03", "shopping", 400)];
  const ask = (amt, extra = {}) => entryWarning([month], { cat: "shopping", date: "2026-11-12", amt, expenses: spent, ...extra });
  it("says nothing for a section without a limit", () => {
    expect(entryWarning([month], { cat: "dining", date: "2026-11-12", amt: 999, expenses: spent })).toBeNull();
    expect(entryWarning([month], { cat: null, date: "2026-11-12", amt: 999, expenses: spent })).toBeNull();
  });
  it("near at 80% after this entry, over past the limit", () => {
    expect(ask(10)).toMatchObject({ level: "near", before: 400, after: 410 });
    expect(ask(50)).toMatchObject({ level: "near" });
    expect(ask(101)).toMatchObject({ level: "over", after: 501, alreadyOver: false });
  });
  it("tells when the limit is already used up", () => {
    expect(entryWarning([month], { cat: "shopping", date: "2026-11-12", amt: 5, expenses: [x("a", "2026-11-03", "shopping", 520)] })).toMatchObject({ level: "over", alreadyOver: true });
  });
  it("picks the limit pushed furthest", () => {
    const both = [{ ...month, id: "big", amount: 5000 }, { ...month, id: "tight", amount: 450 }];
    expect(entryWarning(both, { cat: "shopping", date: "2026-11-12", amt: 100, expenses: spent }).l.id).toBe("tight");
  });
  it("an unchanged edit is left alone; raising it warns, and it does not count against itself", () => {
    const orig = spent[0];
    expect(entryWarning([month], { cat: "shopping", date: "2026-11-12", amt: 400, expenses: spent, editing: orig })).toBeNull();
    const raised = entryWarning([month], { cat: "shopping", date: "2026-11-12", amt: 520, expenses: spent, editing: orig });
    expect(raised).toMatchObject({ level: "over", before: 0, after: 520 });
  });
});

describe("daily food limit", () => {
  const cats = ["dining", "coffee"];
  const list = [x("1", "2026-11-01", "dining", 80), x("2", "2026-11-01", "coffee", 30), x("3", "2026-11-02", "dining", 90), x("4", "2026-11-03", "shopping", 500), x("5", "2026-11-04", "dining", 120), x("6", "2026-11-04", "dining", 5, { type: "income" })];
  it("adds the food sections of one day, spending only", () => {
    expect(foodOn(list, "2026-11-01", cats)).toBe(110);
    expect(foodOn(list, "2026-11-04", cats)).toBe(120);
    expect(foodOn(list, "2026-11-03", cats)).toBe(0);
  });
  it("counts the days with entries that stayed at or under the limit (equal is kept)", () => {
    expect(foodKept(list, "2026-11", 30, cats, 100)).toEqual({ ok: 2, tracked: 4 }); // 110 over, 90 ok, 0 ok (shopping day), 120 over
    expect(foodKept(list, "2026-11", 30, cats, 110)).toEqual({ ok: 3, tracked: 4 });
  });
  it("stops at the last day asked for (this month so far)", () => {
    expect(foodKept(list, "2026-11", 2, cats, 100)).toEqual({ ok: 1, tracked: 2 });
  });
});
