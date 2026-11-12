# Tax and tip: build steps (for the builders)

What to build is in `docs/tax-and-tip-plan.md`. Read it first, then `CLAUDE.md` (rules: design, numbers, modes, privacy).
This file says **how** and **who does what**. Two builders work one after another; each touches only its own files.

General rules
- International mode only (`isIntl()` / `config.mode === "intl"`). Chinese mode and an account with no mode must look and work exactly as before.
- Numbers exact: use `round2` from `src/lib/format.js`; accept comma decimals with `parseAmt`. Never round what the owner typed.
- Pure logic goes in `src/lib/` with Vitest tests. `npm test` and `npm run build` must pass at the end of each step.
- Do not commit, push, or change anything outside this folder. Do not touch `tests/fixtures/` or `backup/`.
- Read only the parts of `src/app.js` you need (it is large): use grep, then read around the hits.

---

## Step 1: money logic (Builder 1)

Files: `src/lib/tip.js` (new), `src/lib/records.js`, `src/lib/config.js`, tests in `tests/` (new `tests/tip.test.js`, add cases to the existing config/records tests).

### `src/lib/tip.js` (new, pure)
```js
export const TIP_CATS = ["dining", "coffee"];          // sections that get Tax + Tip rows
export const hasTaxTip = (cat) => TIP_CATS.includes(cat);
export const TIP_PCTS = [15, 18, 20];                  // buttons; plus None and Custom in the UI
export const TAX_CAT = "taxes";
export const TAX_REASONS = ["Income tax", "Property tax", "Car tax & registration", "Tax help / accountant", "Penalties & late fees", "Other tax"];
export const pctOf = (bill, pct) => round2((Number(bill) || 0) * (Number(pct) || 0) / 100);   // tax or tip from a %
export const mealTotal = (bill, tax, tip) => round2((Number(bill) || 0) + (Number(tax) || 0) + (Number(tip) || 0));
// an entry back into its parts; entries without tax/tip give { bill: amount, tax: 0, tip: 0 }
export function mealParts(e) -> { bill, tax, tip }       // bill = round2(amount - tax - tip), in the entry's own currency
// Tax and tips in one month, in dollars (main money in International). key = "YYYY-MM", same as statsOf in ledger.js.
// Skip income entries. A part of an entry in dollars = e.usd * part / e.amount (works for any currency).
export function taxMonth(expenses, key) -> {
  total,                         // taxes section + meal tax
  byReason: [{ reason, amount }],// entries in TAX_CAT grouped by reason (empty reason -> "Other tax"), biggest first
  meals,                         // sum of meal tax
  tips                           // sum of meal tips (not part of total)
}
```

### `src/lib/records.js`
- `buildEntry` takes optional `tax` and `tip` (numbers, same currency as `amount`). Store `e.tax` / `e.tip` only when > 0, rounded with `round2`. `amount` stays the total the caller passes (bill + tax + tip).

### `src/lib/config.js`
- `salesTaxPct`: number 0–30, default 0, keep decimals (8.875 stays 8.875). Add it to `normalizeConfig`.
- Export `TAX_SECTION = { id: "taxes", name: "Taxes", color: "#7A5AF8", kind: "need", budget: 0 }` and
  `TAX_REFUND_SECTION = { id: "tax_refund", name: "Tax refund", color: "#0E9384" }`.
- Export `withTaxSections(config) -> { categories, incomeCats }`: the lists with the two sections added (Taxes just before "other", Tax refund just before "income_other") **only if missing**. Never duplicates.
- `intlStart(config)` also returns `...withTaxSections(config)`.
- Do not add the sections to `DEFAULT_CATS` (Chinese accounts must not get them).

### Tests
- `pctOf` (8.875% of 40 = 3.55; 18% of 40 = 7.2), `mealTotal`, `mealParts` (with and without tax/tip, comma-free numbers), `taxMonth` (taxes entries + meals, other months ignored, income ignored, empty month = zeros).
- `buildEntry` with tax/tip, and without (no `tax`/`tip` keys).
- `normalizeConfig` salesTaxPct (missing -> 0, 8.875 kept, -1 -> 0, 50 -> 30). `withTaxSections` adds once and keeps order; `intlStart` includes them.

When done: `npm test` green. Report the exact exported names.

---

## Step 2: screens (Builder 2)

Files: `src/app.js`, `index.html`, `src/styles.css`. Use the Step 1 functions; don't put new math in `app.js`.

1. **Add form, tax + tip rows** (find the add form via `renderCatChips`, the entry save that calls `buildEntry` near the `buildEntry({` hit around line 1082).
   - Show only when `isIntl()`, the entry is spending (not income), and `hasTaxTip(selected cat)`. Hide otherwise, and then save no tax/tip.
   - The amount box is the **bill before tax**. Under it: a **Tax** row (amount input; filled with `pctOf(bill, config.salesTaxPct)` and kept in step while the bill changes, until the owner types their own tax), and a **Tip** row with chips None · 15% · 18% · 20% · Custom (Custom shows a small amount input). None is picked at the start.
   - A total line: `$40 + $3.55 tax + $8 tip = $51.55` (use the existing money formatters). Spending colour rules apply.
   - Save: `amount = mealTotal(bill, tax, tip)`, pass `tax`, `tip` to `buildEntry`. The add-form limit warning should use the total.
   - Editing an entry with tax/tip: open with `mealParts(e)` (bill in the box, tax and tip filled, tip chip = Custom with the amount).
2. **Taxes section reasons**: when the chosen section is `TAX_CAT`, show `TAX_REASONS` as quick chips under the reason box (tap fills the reason). Reuse the existing chip style.
3. **Entry lists**: an entry with tax or tip shows a small grey second line: `incl. $3.55 tax · $8 tip` (only the parts that are there).
4. **Settings**: International only, a **Sales tax %** field (decimal, comma accepted) saved to `config.salesTaxPct` through the store, like the other settings. Small hint: "Fills the tax on cafe and restaurant meals".
5. **Mode switch**: where Settings → Money mode saves `mode: "intl"` (grep `setMode(` / the mode setting save), also save `withTaxSections(config)`. The first-time choice already gets them through `intlStart`.
6. **Reports** (`renderReport`): International only, a **Tax this month** block for the month shown: big total (dollars, black), then rows for each `byReason` item and **Sales tax at cafes & restaurants** (`meals`), then **Tips this month** (`tips`). Empty month: one quiet line "No tax this month". Follow the look of the other report blocks.
7. Style: light mode = white minimal (thin lines, no card boxes, no grey fills); dark keeps cards. New light/dark differences through tokens in both dark blocks. Check at phone width (390 px) and desktop.

When done: `npm test` and `npm run build` pass. Start the dev server only if you need to check something; stop it after. Report which functions and lines you changed.
