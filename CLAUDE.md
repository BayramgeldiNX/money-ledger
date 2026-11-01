# Money Ledger — notes for Claude

A personal money tracker (PWA) for one owner: spending by section with the reason, income, wallets, debts, limits, and reports,
in yuan (main) and dollars. Built first as a claude.ai Artifact, now a standalone app like the owner's `xiezi` project.
Live at https://bayramgeldinx.github.io/money-ledger/ (GitHub Pages; pushing to `main` runs tests, builds and deploys).
Firebase project `money-91f6a` (email/password sign-in, Firestore, rules in `firestore.rules`). Used on iPhone 16 (home-screen app) and Windows. English only.

## Rules (always)
- **Design:** minimalist, premium bank-app feel. Yuan is the main number; dollars sit under it, in black. **Spending is red.**
  No streaks, goals, or gamification. Keep Home simple: Money left + today's food limit only. Detail belongs on other screens.
  Light is the white minimal look: no card boxes, grey fills or rings; thin lines and white space instead (Home food limit is a thin line, not a ring). Dark keeps its cards and rings. New light/dark differences go through tokens, set in both dark blocks (use `initial` where a rule has its own fallback).
- **White colours:** green-white. Fresh green-tinted background `#F4FAF5` (never pure white), vivid green `#0B8457` for main buttons and selected states (`--primary`, `--accent`), black numbers, vivid red spending `#D92D20`. Section and wallet icons keep their own colours, with no boxes.
- **Numbers must be right.** Never round the owner's decimals away (12.8 stays ¥12.80). Accept comma decimals ("12,8").
  Rate: ¥6.70 = $1 (editable in Settings). Whole numbers show no decimals; others show two.
- **Money rules** (in `src/lib/ledger.js`, tested):
  - Left = income − spent − saved. Savings count as saved, not spent. Debts never touch monthly totals.
  - A wallet changes only for things dated after its balance was set (`afterSet`). Dollar wallets keep dollars;
    a move between ¥ and $ wallets stores the amount the owner really received (`amountTo`).
- **Defaults:** new entries start on ¥ and **Alipay**. Every entry starts in yuan.
- **Privacy:** the owner's real data never goes into git. `tests/fixtures/` is gitignored (`real.json` = an export of the data).
  Never put the owner's email, passwords, or Firebase admin or service-account keys in the repo. (The Firebase web config in `src/sync/firebase-config.js` is public by design and is committed, like xiezi.) Never create accounts or type passwords for the owner.
- The owner is in China on a VPN (Clash, proxy `http://127.0.0.1:7897`). Firebase and GitHub need it; set `HTTPS_PROXY`
  for network scripts and use `node --use-env-proxy`. `npm install` worked without it.
- Commits: use the same noreply author as the `xiezi` repo, and end with the `Co-Authored-By` line the session gives. Commit only when asked.
- **Ask before changing anything outside this project** (VPN/Clash node or mode, Windows or other app settings). Diagnose and report, then ask.
  Once a changed Clash node cut off the owner's Claude.
- Token budget is tight: read only the files a task touches; don't re-run full sweeps unless asked.

## Stack and layout
- Vite + vite-plugin-pwa (generateSW, `autoUpdate`), base `/money-ledger/` for builds, `/` in dev. Plain JS, no framework.
- `index.html`: the screens' markup. `src/styles.css`: all CSS (light/dark tokens, iPhone safe areas). `src/main.js` loads everything.
- `src/app.js`: the app (state, rendering, forms, reports). Still one big file, being split into `src/views/` over time.
- `src/lib/`: `format.js` (money text, parseAmt), `dates.js`, `ledger.js` (stats + wallet math). **Pure and tested** — put new math here.
- `src/motion.js`: DOM-only motion helpers (rolling digits, sliding highlight, swipe rows, skeletons, empty-state art, money flying between wallets, theme fade). Pure part `rollParts` is tested. All motion is skipped under `prefers-reduced-motion`; its CSS is the "Motion" section at the end of `styles.css` (tokens `--ease-*`, `--t-*`).
- `src/theme.js`: Appearance switch (Auto / White / Dark), per device in `ml.theme`; never synced or backed up.
- `src/lock.js`: Face ID lock screen and Settings card (iPhone/iPad only, needs sign-in; a passkey is used only to ask for Face ID, stored per device in `ml.lock.cred`; the fallback is a local 4-digit passcode on a number pad (6-digit ones saved earlier keep working), hashed in `ml.lock.pass`, which works offline; the account password is only for a forgotten passcode and turns the lock off).
- `src/platform.js`: stand-in for what the Artifact gave (`window.claude.use("db" | "sample" | "downloads")`).
  - `db` → Firestore under `users/{uid}/` when signed in (`src/sync/firebase.js`); signed out it is `null` and data lives in `localStorage` (`ml.*` keys).
  - `sample` → `null`: the Claude money review and receipt photo reading are off (needs a server + API key).
  - `downloads` → a normal file download; PDF libraries (html2canvas, jsPDF) are bundled and loaded on demand.
- `tests/`: Vitest. `real-data.test.js` runs only if `tests/fixtures/real.json` exists.
- `archive/artifact-version.html`: the last claude.ai Artifact build (v48), kept for reference only.
- `design/`: icon artwork + `make-icons.ps1`. `scripts/gen-icons.mjs` builds `public/` icons from it (`npm run gen:icons`).

## Data model (collections in the Artifact; same shape for Firestore)
- `expenses/{id}`: `{ date, amount, currency, rate, usd, rmb, cat, kind (need|want|save|income), type?: "income", reason, method, note, createdAt, bill?, billId?, rateGuess? }` (`rateGuess`: saved before this device had the settings; `fixGuessedRates` in `app.js` corrects it, also on `debts`, and removes the mark)
- `config/main`: `{ rate, rateSetAt, foodLimit, foodCats, categories[], incomeCats[], wallets[], bills[], limits[], later[], lastBackupAt }`
  - wallet `{ id, name, icon, color, methods[], currency, balance, setAt }`; limit `{ id, name, cats[], amount, period: week|month }`;
    waiting-list item `{ id, reason, amount, currency, cat, method, addedAt, forMonth }`.
- `debts/{id}`, `transfers/{id}`, `billruns/{id}`, `reviews/{key}`.
- Offline: every change goes to a local outbox first and is sent when online (see `initStore` in `app.js`). Firebase's sign-in check on start blocks everything, even cached data, and can hang for a minute with no VPN, so `limitSignInCheck` in `src/sync/firebase.js` caps it at 2.5 seconds.

## Commands
- `npm run dev` (port 5173; the preview config in `.claude/launch.json` uses 5180) · `npm run build` · `npm test` · `npm run gen:icons`

## Next steps
1. ~~Firebase~~ done in code: `src/sync/` (sign-in card in Settings, Firestore under `users/{uid}/`). Needs the owner to create the Firebase project, then `npm run setup:firebase -- <project-id>`. Test locally with `npm run emulators` + `npm run dev:emulator`. Move data over with the app's Backup → Restore.
2. ~~Deploy and data move~~ done (2026-10-30). The owner still adds the iPhone Home Screen icon. `backup/` is gitignored and holds their data; never commit it.
3. Split `app.js` into `src/views/*`; add Playwright screen/sync checks like xiezi.
4. Optional: bring back the Claude review / receipt reading through a small cloud function.
