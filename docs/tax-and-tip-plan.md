# Tax and tip plan (International mode only)

Goal: in International (US, dollars) mode, see **how much tax you pay each month**, and add **tax + tip** when paying at cafes and restaurants.
Chinese mode does not change, and the owner's account (no mode set) is never touched.

## 1. Taxes section
- New spending section **Taxes** (`id: "taxes"`, kind `need`). New income section **Tax refund** (`id: "tax_refund"`).
- Quick reasons when adding a tax payment: Income tax · Property tax · Car tax & registration · Tax help / accountant · Penalties & late fees · Other tax.
- Not here: tax already taken from a paycheck (salary is written as take-home pay), and sales tax at shops (part of the price).
- New International accounts start with both sections (`intlStart` in `src/lib/config.js`). Switching an account to International adds them if missing. Nothing is added in Chinese mode.

## 2. Tax and tip on a meal (Food and Coffee only)
- When the section is Food (`dining`) or Coffee (`coffee`), the add form shows two rows under the amount: **Tax** and **Tip**.
- You type the **bill before tax**, for example $40.
- **Tax** fills in from the saved **Sales tax %** (Settings, International only, e.g. 8.875). You can change it for one meal.
- **Tip** buttons: None · 15% · 18% · 20% · Custom. Worked out from the bill before tax. None is picked at the start.
- The form shows the total: `$40 + $3.55 tax + $8 tip = $51.55`.
- The entry's `amount` is the **total** (what left the wallet). It counts in spending, the Food section and the food limit as one meal.
- The entry also keeps `tax` and `tip` (same currency as `amount`), so the bill is `amount − tax − tip`. Opening the entry again shows all three.
- In the list: `$51.55 · incl. $3.55 tax, $8 tip`.
- Numbers stay exact (two decimals, cents rounded only on the tip/tax % result, never on what you typed).

## 3. Monthly tax view
- Reports gets a **Tax this month** block:
  - Total tax = everything in the Taxes section + the tax part of meals.
  - Broken down: each tax reason (Income tax, Property tax, ...) and **Sales tax at cafes & restaurants**.
  - One more line: **Tips this month**.
- Monthly totals do not change: meal tax stays inside Food, so nothing is counted twice. This view only adds it up for you to see.

## Where the code goes
- `src/lib/tip.js` (new, tested): tax from %, tip from %, meal total, bill back from an entry, monthly tax and tip totals.
- `src/lib/records.js`: `buildEntry` takes optional `tax` and `tip`.
- `src/lib/config.js`: `salesTaxPct` setting (0–30, default 0), Taxes and Tax refund sections in `intlStart`.
- `src/app.js`: tax/tip rows in the add form (only International + Food/Coffee), list text, Settings field, Reports block.
- `index.html`, `src/styles.css`: the new rows and block, following the white minimal look (thin lines, no boxes).
- Tests for all of the above in `tests/`.
