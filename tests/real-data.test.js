// Checks the app's numbers against your own data. The data file is private (gitignored):
// export it with the debug tools and save it as tests/fixtures/real.json. Without it these tests skip.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { statsOf, walletBalance } from "../src/lib/ledger.js";

const file = new URL("./fixtures/real.json", import.meta.url);
const has = fs.existsSync(file);

describe.skipIf(!has)("your real data (as of 2026-10-25)", () => {
  const seed = has ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const pick = (c) => Object.entries(seed).filter(([k]) => k.startsWith(c + "/")).map(([k, v]) => ({ id: k.slice(c.length + 1), ...v }));
  const data = { expenses: pick("expenses"), debts: pick("debts"), transfers: pick("transfers"), wallets: (seed["config/main"] || {}).wallets || [] };
  const rate = (seed["config/main"] || {}).rate || 6.7;

  it("October totals", () => {
    const s = statsOf(data.expenses, "2026-10");
    expect(Math.round(s.rmb * 100) / 100).toBe(1699.63);
    expect(s.inc).toBe(2028);
    expect(Math.round(s.left * 100) / 100).toBe(328.37);
  });
  it("wallet balances", () => {
    const bal = Object.fromEntries(data.wallets.map((w) => [w.name, walletBalance(w, data, rate)]));
    expect(bal.Cash).toBe(123);
    expect(bal.WeChat).toBe(8.2);
    expect(bal.Alipay).toBe(1091.3);
    expect(bal["VIZA CARD"]).toBe(15);
  });
});
