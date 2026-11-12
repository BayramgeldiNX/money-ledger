# Glossary

Words this project uses, so code, tests and conversations name the same thing.

- **Main money** — the currency shown big: yuan in Chinese mode, dollars in International mode. Owned by `src/lib/mode.js`. The old names `rmb`, `rmb0`, `R(e)` mean "in main money".
- **Mode** — `cn` or `intl`. No mode saved means Chinese (the owner's account has none; never write one for it).
- **Store** — where data is saved (`src/store.js`). Two adapters: **account** (Firestore, offline-first) and **device** (localStorage, when signed out).
- **Outbox** — changes saved on this device and waiting to be sent to the account; one entry per path, the last write wins (`src/lib/outbox.js`).
- **Pending** — a row shown from the outbox that the account has not confirmed yet.
- **Rate guess** — an entry or debt saved before the real exchange rate had loaded; marked, then corrected once settings arrive.
- **Left** — income − spent − saved. Savings count as saved, not spent. Debts never touch it.
- **Set-at moment** — when a wallet's balance was set (`setAt`); only things dated after it move the wallet.
- **Limit status** — one verdict per limit: ok, near (80%), hot (90%), over (past the limit) (`src/lib/limits.js`).
- **Waiting list** — things the owner chose to buy next month instead (`config.later`).
- **Settled** — a debt whose payments cover its amount (`isSettled` in `src/lib/records.js`; one rule everywhere).
