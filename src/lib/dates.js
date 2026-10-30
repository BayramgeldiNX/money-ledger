// Calendar helpers. Dates travel as "YYYY-MM-DD" text in local time; months as "YYYY-MM".
export const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const shiftMonth = (key, by) => { const [y, m] = key.split("-").map(Number); const d = new Date(y, m - 1 + by, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
export const daysIn = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const mondayOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); return isoOf(dt); };
// A real calendar day in a believable year. Typing "26" for the year gives 0026-10-30, which would hide the entry for good.
export const saneDate = (iso) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
  const [y, m, d] = iso.split("-").map(Number), t = new Date(y, m - 1, d);
  return y >= 2000 && y <= 2100 && t.getMonth() === m - 1 && t.getDate() === d;
};
export const addDays =(iso, n) => { const [y, m, d] = iso.split("-").map(Number); return isoOf(new Date(y, m - 1, d + n)); };
