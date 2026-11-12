import { describe, it, expect } from "vitest";
import { normalizeConfig, isBlankAccount, intlStart, DEFAULT_FOOD_LIMIT, DEFAULT_RATE } from "../src/lib/config.js";
import { createOutbox, pendingCount, OUTBOX_KEY } from "../src/lib/outbox.js";

describe("normalizeConfig", () => {
  it("gives the defaults for nothing", () => {
    const c = normalizeConfig(null);
    expect(c.rate).toBe(DEFAULT_RATE);
    expect(c.foodLimit).toBe(DEFAULT_FOOD_LIMIT);
    expect(c.mode).toBeNull();
    expect(c.wallets).toBeNull(); // "never set up" is not the same as "no wallets"
    expect(c.categories.length).toBeGreaterThan(10);
    expect(c.incomeCats.every((x) => x.kind === "income")).toBe(true);
  });
  it("never writes a mode on its own (the owner's account has none)", () => {
    expect(normalizeConfig({ mode: "weird" }).mode).toBeNull();
    expect(normalizeConfig({ mode: "intl" }).mode).toBe("intl");
    expect(normalizeConfig({ mode: "cn" }).mode).toBe("cn");
  });
  it("clamps and cleans values", () => {
    const c = normalizeConfig({ rate: -1, foodLimit: -5, bills: [{ id: "b", amount: 10, day: 99 }, { id: "x", amount: 0 }, null], wallets: [{ id: "w", balance: "12.5" }, { name: "no id" }] });
    expect(c.rate).toBe(DEFAULT_RATE);
    expect(c.foodLimit).toBe(0);
    expect(c.bills).toHaveLength(1);
    expect(c.bills[0].day).toBe(31);
    expect(c.wallets).toHaveLength(1);
    expect(c.wallets[0].balance).toBe(12.5);
  });
  it("keeps decimals", () => {
    expect(normalizeConfig({ rate: 6.73 }).rate).toBe(6.73);
  });
  it("turns an old shopping limit into a limit", () => {
    const c = normalizeConfig({ shopLimit: 500 });
    expect(c.limits).toEqual([{ id: "lim-shop", name: "Shopping", cats: ["shopping", "clothing"], amount: 500, period: "month" }]);
  });
  it("drops limits with no sections or no amount, and keeps week/month", () => {
    const c = normalizeConfig({ limits: [{ id: "a", cats: [], amount: 5 }, { id: "b", cats: ["x"], amount: 0 }, { id: "c", cats: ["x"], amount: 5, period: "week" }, { id: "d", cats: ["x"], amount: 5, period: "year" }] });
    expect(c.limits.map((l) => [l.id, l.period])).toEqual([["c", "week"], ["d", "month"]]);
  });
  it("waiting-list items follow the mode's default payment method", () => {
    expect(normalizeConfig({ mode: "intl", later: [{ id: "l", amount: 5 }] }).later[0].method).toBe("Cash");
    expect(normalizeConfig({ later: [{ id: "l", amount: 5 }] }).later[0].method).toBe("Alipay");
  });
  it("is idempotent", () => {
    const once = normalizeConfig({ rate: 7, shopLimit: 100, wallets: [{ id: "w", balance: 3 }] });
    expect(normalizeConfig(once)).toEqual(once);
  });
});

describe("first-time question rules", () => {
  it("only a completely empty account is asked", () => {
    const blank = normalizeConfig(null);
    expect(isBlankAccount(blank, {})).toBe(true);
    expect(isBlankAccount({ ...blank, mode: "cn" }, {})).toBe(false);
    expect(isBlankAccount({ ...blank, wallets: [] }, {})).toBe(false);
    expect(isBlankAccount(blank, { expenses: [{}] })).toBe(false);
    expect(isBlankAccount(blank, { debts: [{}] })).toBe(false);
    expect(isBlankAccount(blank, { transfers: [{}] })).toBe(false);
  });
  it("International starts with no wallets and a dollar-sized food limit, but keeps one the owner set", () => {
    expect(intlStart({ foodLimit: DEFAULT_FOOD_LIMIT })).toEqual({ wallets: [], foodLimit: 20 });
    expect(intlStart({ foodLimit: 35 })).toEqual({ wallets: [], foodLimit: 35 });
  });
});

describe("outbox", () => {
  const saved = [];
  const make = (init) => createOutbox(init, (items) => saved.push(items.length));
  it("ignores damaged entries and continues numbering", () => {
    const o = make([{ path: "a/1", n: 4 }, { path: "nope" }, null]);
    expect(o.length).toBe(1);
    o.queue("a/2", { x: 1 }, 5);
    expect(o.items().map((x) => x.n)).toEqual([4, 5]);
  });
  it("strips _pending and id from queued data", () => {
    const o = make([]);
    o.queue("expenses/1", { id: "1", _pending: true, amount: 2 }, 1);
    expect(o.items()[0].data).toEqual({ amount: 2 });
  });
  it("sent() drops an entry only if it was not rewritten meanwhile", () => {
    const o = make([]);
    o.queue("a/1", { v: 1 }, 1);
    const first = o.next();
    o.queue("a/1", { v: 2 }, 2);
    o.sent(first);
    expect(o.length).toBe(1);
    o.sent(o.next());
    expect(o.length).toBe(0);
  });
  it("counts what the owner should hear about (bill-run markers only if nothing else)", () => {
    const o = make([]);
    o.queue("billruns/x", { at: 1 }, 1);
    expect(o.visibleCount()).toBe(1);
    o.queue("expenses/e", { a: 1 }, 2);
    expect(o.visibleCount()).toBe(1);
  });
  it("pendingCount reads straight from storage", () => {
    const storage = { read: (k, d) => (k === OUTBOX_KEY ? [{ path: "a/1" }, { path: "bad" }] : d) };
    expect(pendingCount(storage)).toBe(1);
  });
});
