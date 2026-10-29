# Money Ledger

Where your money went and why, in yuan and dollars. An installable web app (PWA) for iPhone and Windows that works offline.

- Spending by section, with the reason, on **Alipay** by default
- Income, savings, and "Money left" across your wallets (Cash, WeChat, Alipay, bank cards, dollar cards)
- Debts with people, part payments and reminders
- Daily food limit, plus your own weekly or monthly limits with a waiting list
- Day / Week / Month / Year reports, a calendar, and a monthly PDF statement
- Backup and restore

## Run it

```
npm install
npm run dev      # http://localhost:5173
npm test         # money rules
npm run build    # production build in dist/ (with offline support)
```

Live: https://bayramgeldinx.github.io/money-ledger/ . Sign in under Settings to sync; signed out, data stays on the device (localStorage). See `CLAUDE.md` for the layout and next steps.
