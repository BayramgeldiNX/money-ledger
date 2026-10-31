import { describe, it, expect } from "vitest";
import { statsOf, cleanExpenses, cleanDebts, cleanTransfers, backupProblem, walletBalance, settingsToSave, withRealRate } from "../src/lib/ledger.js";
import { saneDate } from "../src/lib/dates.js";
import { parseRate, nOf } from "../src/lib/format.js";

describe("damaged saved data never stops the app", () => {
  it("anything that is not a list becomes an empty list", () => {
    for (const bad of [{}, "x", 5, null, undefined]) {
      expect(cleanExpenses(bad)).toEqual([]);
      expect(cleanDebts(bad)).toEqual([]);
      expect(cleanTransfers(bad)).toEqual([]);
    }
  });
  it("drops rows that are not objects and keeps the good ones whole", () => {
    const good = { id: "a", date: "2026-10-30", reason: "Lunch", note: "", method: "Alipay", cat: "dining", amount: 12.8, rmb: 12.8, usd: 1.91, currency: "RMB", createdAt: 5, bill: true };
    expect(cleanExpenses([null, 5, "x", [], good])).toEqual([good]);
  });
  it("turns odd field types into text and numbers", () => {
    const [e] = cleanExpenses([{ id: "b", reason: 5, note: null, date: 20261030, amount: "abc" }]);
    expect(e).toMatchObject({ reason: "5", note: "", date: "20261030", amount: 0, method: "", cat: "" });
  });
  it("gives a debt everything its screen reads", () => {
    const [d] = cleanDebts([{ id: "d", createdAt: new Date(2026, 9, 5, 12).getTime(), payments: "x" }]);
    expect(d).toMatchObject({ dir: "owed", person: "", amount: 0, start: "2026-10-05", payments: [] });
    expect(cleanDebts([{ id: "e", payments: [null, { amount: "30" }] }])[0].payments).toEqual([{ amount: 30, date: "" }]);
  });
  it("a wallet still adds up with damaged rows around it", () => {
    const w = { id: "a", name: "Alipay", methods: ["Alipay"], currency: "RMB", balance: 100, setAt: 1 };
    const data = { expenses: cleanExpenses([null, { id: "x", date: "2026-10-30", rmb: 10, usd: 1.5, method: "Alipay", createdAt: 2 }]), debts: cleanDebts([null]), transfers: cleanTransfers([null]), wallets: [w] };
    expect(walletBalance(w, data, 6.7)).toBe(90);
  });
});

describe("words that are also built-in names", () => {
  it("a section called constructor is counted like any other", () => {
    const s = statsOf([{ date: "2026-10-01", rmb: 5, usd: 1, cat: "constructor", kind: "need" }, { date: "2026-10-01", rmb: 5, usd: 1, cat: "__proto__", kind: "need", type: "income" }], "2026-10");
    expect(s.byCat.constructor.rmb).toBe(5);
    expect(s.byInc.__proto__.rmb).toBe(5);
    expect({}.rmb).toBeUndefined();
  });
});

describe("backups are checked before anything changes", () => {
  const ok = { app: "money-ledger", expenses: [{ id: "a", date: "2026-10-30" }], debts: [{ id: "d" }], transfers: [{ id: "t" }], config: { rate: 6.7 } };
  it("accepts a good one, and one from before debts and moves existed", () => {
    expect(backupProblem(ok)).toBe("");
    expect(backupProblem({ app: "money-ledger", expenses: [] })).toBe("");
  });
  it("refuses a file that is not a backup", () => {
    for (const bad of [null, "x", [], {}, { app: "other", expenses: [] }, { app: "money-ledger" }, { app: "money-ledger", expenses: {} }]) expect(backupProblem(bad)).toMatch(/not a Money Ledger backup/);
  });
  it("refuses a damaged one", () => {
    const damaged = [{ debts: {} }, { transfers: 5 }, { config: "x" }, { config: [] }, { expenses: [null] }, { expenses: [{ date: "2026-10-30" }] }, { expenses: [{ id: "a/b", date: "2026-10-30" }] }, { expenses: [{ id: "a" }] }, { debts: [{}] }];
    for (const change of damaged) expect(backupProblem({ ...ok, ...change })).toMatch(/damaged/);
  });
});

describe("Settings saved on one device keep what another device changed", () => {
  const cats = [{ id: "a", name: "Food" }];
  const drawn = { rate: 7.1, foodLimit: 50, categories: cats, incomeCats: [] };
  const latest = { rate: 7.5, rateSetAt: 9, foodLimit: 50, categories: cats, incomeCats: [], wallets: ["w"], bills: ["b"] };
  it("an edit to the food limit does not bring the old rate back", () => {
    const c = settingsToSave(latest, drawn, { ...drawn, foodLimit: 88 }, 100);
    expect(c).toMatchObject({ rate: 7.5, rateSetAt: 9, foodLimit: 88, wallets: ["w"], bills: ["b"] });
  });
  it("a rate really changed here is saved and dated now", () => {
    expect(settingsToSave(latest, drawn, { ...drawn, rate: 6.9 }, 100)).toMatchObject({ rate: 6.9, rateSetAt: 100 });
  });
  it("sections edited here are saved, and left alone otherwise", () => {
    const remote = { ...latest, categories: [{ id: "a", name: "Meals" }] };
    expect(settingsToSave(remote, drawn, drawn, 100).categories).toEqual(remote.categories);
    const mine = [{ id: "a", name: "Eating" }];
    expect(settingsToSave(remote, drawn, { ...drawn, categories: mine }, 100).categories).toEqual(mine);
  });
  it("a first rate gets a date even when unchanged", () => {
    expect(settingsToSave({ ...latest, rateSetAt: 0 }, drawn, drawn, 100).rateSetAt).toBe(100);
  });
});

describe("entries saved before the real rate was known", () => {
  it("a yuan entry keeps its yuan and gets the right dollars", () => {
    const e = withRealRate({ id: "a", amount: 12.8, currency: "RMB", rate: 6.7, rmb: 12.8, usd: 1.91, rateGuess: true, reason: "Lunch" }, 7.1);
    expect(e).toEqual({ id: "a", amount: 12.8, currency: "RMB", rate: 7.1, rmb: 12.8, usd: 1.8, reason: "Lunch" });
  });
  it("a dollar entry keeps its dollars and gets the right yuan", () => {
    expect(withRealRate({ amount: 10, currency: "USD", rate: 6.7, rmb: 67, usd: 10, rateGuess: true }, 7.1)).toEqual({ amount: 10, currency: "USD", rate: 7.1, rmb: 71, usd: 10 });
  });
});

describe("dates", () => {
  it("accepts real days in believable years", () => {
    for (const d of ["2026-10-30", "2028-02-29", "2000-01-01", "2100-12-31"]) expect(saneDate(d)).toBe(true);
  });
  it("refuses a two-digit year, impossible days and other text", () => {
    for (const d of ["0026-10-30", "1000-01-01", "2999-01-01", "2027-02-29", "2026-13-01", "2026-04-31", "", "abc", null, undefined, 20261030]) expect(saneDate(d)).toBe(false);
  });
});

describe("small text and number helpers", () => {
  it("a rate's comma is always its decimal point", () => {
    expect(parseRate("6,7123")).toBe(6.7123);
    expect(parseRate("6,7")).toBe(6.7);
    expect(parseRate("6.7123")).toBe(6.7123);
    expect(parseRate("６，７")).toBe(6.7);
    expect(parseRate("abc")).toBeNaN();
  });
  it("one entry, two entries", () => {
    expect(nOf(1, "entry", "entries")).toBe("1 entry");
    expect(nOf(0, "entry", "entries")).toBe("0 entries");
    expect(nOf(2, "debt", "debts")).toBe("2 debts");
  });
});
