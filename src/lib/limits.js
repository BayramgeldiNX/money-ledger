// Limits (a spending cap for some sections, per week or per month) and the daily food limit.
// One verdict for every screen that shows it: the Home dot, the limit card, the warning on the add form, the Report.
// Money is main money (R). Everything is a function of the entries and the date it is asked on.
import { R, isSpend } from "./ledger.js";
import { pad, daysIn, mondayOf, addDays } from "./dates.js";

export const NEAR_AT = 0.8; // "close": 80% of the limit
export const HOT_AT = 0.9;  // the bar turns red past 90%

// a limit covers one week (Mon-Sun) or one month around a date
export function limRange(l, date) {
  if (l.period === "week") { const m = mondayOf(date); return { start: m, end: addDays(m, 6) }; }
  const k = date.slice(0, 7);
  return { start: k + "-01", end: k + "-" + pad(daysIn(k)) };
}
export function limEntries(l, date, expenses, exceptId) {
  const r = limRange(l, date);
  return expenses.filter((e) => isSpend(e) && l.cats.includes(e.cat) && e.date >= r.start && e.date <= r.end && e.id !== exceptId);
}
export const limSpent = (l, date, expenses, exceptId) => limEntries(l, date, expenses, exceptId).reduce((a, e) => a + R(e), 0);

const levelOf = (spent, amount) => (spent > amount ? "over" : spent >= amount * HOT_AT ? "hot" : spent >= amount * NEAR_AT ? "near" : "ok");
// where a limit stands on a date; level: ok | near (80%) | hot (90%) | over (past the limit)
export function limStatus(l, date, expenses) {
  const range = limRange(l, date), spent = limSpent(l, date, expenses), level = levelOf(spent, l.amount);
  return { range, spent, level, over: level === "over", hot: level === "hot", near: level === "near" || level === "hot", left: l.amount - spent };
}
export const anyOver = (limits, date, expenses) => (limits || []).some((l) => limSpent(l, date, expenses) > l.amount);

// a waiting-list item is due once its month has come
export const laterDue = (later, monthKey) => (later || []).some((x) => x.forMonth && x.forMonth <= monthKey);

// What the add form warns about. `amt` is the entry's main-money amount, `date` its date, `cat` its section.
// `editing` is the entry being edited (it stops counting against itself, and an unchanged edit is left alone).
// Returns the limit the entry pushes furthest, or null.
export function entryWarning(limits, { cat, date, amt, expenses, editing = null }) {
  const lims = (limits || []).filter((l) => cat && l.cats.includes(cat));
  const rows = lims.map((l) => {
    const before = limSpent(l, date, expenses, editing && editing.id), r = limRange(l, date);
    const same = !!editing && l.cats.includes(editing.cat) && editing.date >= r.start && editing.date <= r.end && amt <= R(editing) + 0.005;
    return { l, before, after: before + amt, same, range: r };
  }).filter((x) => !x.same).sort((a, b) => b.after / b.l.amount - a.after / a.l.amount);
  const w = rows[0];
  if (!w) return null;
  const level = w.after > w.l.amount ? "over" : w.after >= w.l.amount * NEAR_AT ? "near" : "ok";
  return { ...w, level, alreadyOver: w.before > w.l.amount };
}

// ---- daily food limit ----
export const foodOn = (expenses, iso, foodCats) => expenses.filter((e) => e.date === iso && foodCats.includes(e.cat) && isSpend(e)).reduce((a, e) => a + R(e), 0);
// on how many of the days that have any entry (days 1..lastDay of the month `key`) the food stayed within the limit
export function foodKept(expenses, key, lastDay, foodCats, limit) {
  const logged = new Set(expenses.map((e) => e.date));
  let ok = 0, tracked = 0;
  for (let d = 1; d <= lastDay; d++) {
    const iso = key + "-" + pad(d);
    if (logged.has(iso)) { tracked++; if (foodOn(expenses, iso, foodCats) <= limit) ok++; }
  }
  return { ok, tracked };
}
