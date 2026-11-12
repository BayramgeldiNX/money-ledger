// The numbers behind the Report screens, free of HTML so they can be tested.
// The screens in app.js only format what this returns. Money is main money (R / U).
import { R, U, isInc, isSave } from "./ledger.js";
import { daysIn, addDays } from "./dates.js";

// the first day anything was logged ("" when nothing was)
export const firstEntryDate = (expenses) => expenses.reduce((a, e) => (e.date && (!a || e.date < a) ? e.date : a), "");

// how many days of month `key` count so far: all of them for a past month, up to today for the current one
export const daysSoFar = (key, today) => (key === today.slice(0, 7) ? Number(today.slice(8, 10)) : daysIn(key));

// Change against before, as a whole percent (null when there is nothing to compare with).
// Within 3% counts as "about the same".
export const SAME_PCT = 3;
export const pctChange = (now, before) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
export const isSamePct = (pct) => Math.abs(pct) < SAME_PCT;

// Flexible spending pace and where the month is heading. Days before the first entry ever are not counted
// (a month started mid-way is not divided by days before tracking began).
export function monthPace({ expenses, key, today, flexSoFar, spent }) {
  const first = firstEntryDate(expenses);
  const firstDay = first.slice(0, 7) === key ? Number(first.slice(8, 10)) : 1;
  const daysElapsed = Math.max(1, daysSoFar(key, today) - firstDay + 1);
  const perDay = flexSoFar / daysElapsed;
  const daysLeft = key === today.slice(0, 7) ? daysIn(key) - Number(today.slice(8, 10)) : 0;
  return { daysElapsed, perDay, daysLeft, projected: daysLeft > 0 ? spent + perDay * daysLeft : null };
}

// Totals for a run of days from `start` (a week, or one day when len is 1): spent, income, saved, per section and per day.
export function weekStats(expenses, start, len) {
  const days = Array.from({ length: len || 7 }, (_, i) => addDays(start, i)), set = new Set(days);
  const st = { days, spent: 0, spentU: 0, inc: 0, saved: 0, byCat: Object.create(null), byDay: {}, list: [], count: 0 };
  expenses.forEach((e) => {
    if (!set.has(e.date)) return;
    st.count++;
    if (isInc(e)) { st.inc += R(e); return; }
    if (isSave(e)) { st.saved += R(e); return; }
    st.spent += R(e); st.spentU += U(e); st.list.push(e);
    const c = (st.byCat[e.cat] = st.byCat[e.cat] || { rmb: 0, usd: 0, count: 0, items: [] });
    c.rmb += R(e); c.usd += U(e); c.count++; c.items.push(e);
    st.byDay[e.date] = (st.byDay[e.date] || 0) + R(e);
  });
  return st;
}
