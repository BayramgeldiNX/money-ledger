# International mode — plan and worker tasks

## Goal
The app gets two modes, saved as `config.mode`:
- **Chinese** (`"cn"`): the app exactly as it is today. Yuan is the big number, dollars under it, Alipay/WeChat Pay, the 4 starting wallets.
- **International** (`"intl"`): **dollars only** (no yuan shown anywhere), no Alipay/WeChat Pay, **no starting wallets** (the person adds their own), and a **$ logo**.

Decisions from the owner:
1. International shows no yuan at all.
2. The mode can be switched later in Settings.
3. Picking Yuan on the first screen gives the full Chinese setup (as today).

**The owner's account must not change.** A config with no `mode` is Chinese. Never write `mode` into an existing account automatically.

## Design: "main money"
Today the code treats the `rmb` field / `rmb0()` as "the big number". We keep that code and make "main money" switchable:
- Main currency = `"RMB"` in Chinese, `"USD"` in International. Set once at start and on every mode change with `setMainCur()`.
- `rmb`, `rmb0`, `rmbS`, `compactRmb` in `src/lib/format.js` print the **main** money (¥ or $). `usd`, `usd0`, `usdS` always print $ (the small second line, hidden in International).
- New `yuan`, `yuan0` always print ¥ (for the few places that mean real yuan, e.g. a ¥ wallet).
- `R(e)` in `src/lib/ledger.js` = an entry's amount in main money (`e.rmb` in Chinese, `e.usd` in International); `U(e)` = the other one. So `statsOf` totals (`s.rmb`, `s.inc`, `s.saved`, `s.left`, `byCat[].rmb`) are all **main money** with no other change.
- Entries are still stored with both real fields (`amount, currency, rate, usd, rmb`), so switching modes never changes saved data. No migration.
- Wallet math keeps real currencies: `walletMoves` uses the real `e.usd` / `e.rmb` by the wallet's currency (not R/U). `wToRmb(w, n, rate)` returns main money (USD main: $ wallet → n, ¥ wallet → n / rate). `moneyOn().total` is main money.

## International details
- Every new entry, bill, debt, limit, waiting-list item and wallet is in **USD**. The ¥/$ switch on forms is hidden. The rate card in Settings is hidden (the rate is kept).
- Payment methods: the wallets' own methods + `Cash`, `Credit card`, `Other` (no duplicates). When a wallet is added in International, its own name becomes its payment method (wallet "Chase" → method "Chase"). Default method for a new entry: the first wallet's first method, else `Cash`.
- Wallets screen with no wallets: an empty state "Add your first wallet" with the add button (not the Chinese 4-wallet setup).
- Every small dollar line (`.usd`, `.usd-line`, `.total-alt`) is hidden; amounts show once, in $.
- China-only words go: "Paste it in WeChat" → "Reminder copied", the wallet hints that name WeChat/Alipay, the quick-entry example "coffee 28 wechat" → "coffee 4.50 card".
- Logo: the $ icon in the header, the browser tab, the iPhone Home Screen icon (only if chosen before adding it to the Home Screen) and the Android install icon.

## First-time question
Shown once, full screen, after sign-in or on first open signed-out, **only when** all are true:
- the config is really loaded (from the server when signed in, not an empty cache),
- the config has no `mode`, no wallets (`wallets == null`), and there are no entries.

Two choices: **¥ Yuan** (Chinese) and **$ Dollar** (International). Saving changes only `mode` (and for International `wallets: []`), merged into the latest config.

## Workers
Sonnet workers share one folder, so each owns its own files and must not edit any other file. Nobody commits.

| Worker | Phase | Owns |
|---|---|---|
| W1 Money math | 1 | `src/lib/format.js`, `src/lib/ledger.js`, `tests/format.test.js`, `tests/ledger.test.js`, new `tests/main-money.test.js` |
| W2 Logo | 1 | `design/*`, `scripts/gen-icons.mjs`, `public/*`, `vite.config.js`, new `src/mode-icon.js`, `src/main.js` |
| W3 Choice screen | 1 | new `src/views/mode-choice.js`, a new "Mode choice" section in `src/styles.css` placed just before the first Motion section |
| W4 App wiring | 2 (after W1–W3 are approved) | `src/app.js`, `index.html`, `src/sync/account.js`, `src/styles.css` (only the International hide rules) |

### W1 API (others build on it)
- `format.js`: `setMainCur(c)`, `mainCur()`, `mainSym()`, `yuan(n)`, `yuan0(n)`; `rmb*` / `compactRmb` use `mainSym()`.
- `ledger.js`: `R`, `U`, `wToRmb`, `moneyOn` follow the main currency; `walletMoves` uses real fields.
- All existing tests pass unchanged (default main is RMB). New tests cover USD main, and reset to RMB after each test.

### W2 API
- Dollar artwork: `design/money-ledger-icon-usd.png`, `design/money-ledger-iphone-usd.png` (same style, a $ instead of ¥).
- Public files: `icon-usd-192.png`, `icon-usd-512.png`, `icon-usd-maskable-512.png`, `apple-touch-icon-usd.png`, `favicon-usd.png`, `manifest-intl.webmanifest` (same as the built manifest but $ icons). All precached.
- `src/mode-icon.js`: `applyModeIcon(mode)` swaps the tab icon, apple-touch-icon, manifest link and the header logo SVG; remembers the mode in `localStorage["ml.mode"]`; `main.js` calls it at start with the remembered mode so the logo is right before data loads.

### W3 API
- `askMode()` → `Promise<"cn" | "intl">`: the full-screen first-time question.
- `mountModeCard(el, { mode, onChange })`: Settings card with Chinese / International; asks "Switch to International? Amounts will show in dollars. Your entries are not changed." before calling `onChange(newMode)`.

## Rules for every worker
Read `CLAUDE.md` first and follow it (design, colours, numbers, privacy). Read only the files you need. Run `npm test` before finishing. Report: files changed, what you did, anything you were unsure about.

## Done when
- `npm test` and `npm run build` pass.
- A new account (local emulator) can choose International, sees only dollars, adds a wallet, adds spending, and sees the $ logo.
- Choosing Yuan gives today's app. The owner's account looks the same as before.
- Switching mode in Settings works both ways without changing entries.
