// Calendar helpers. Dates travel as "YYYY-MM-DD" text in local time; months as "YYYY-MM".
export const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const shiftMonth = (key, by) => { const [y, m] = key.split("-").map(Number); const d = new Date(y, m - 1 + by, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); };
export const daysIn = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m, 0).getDate(); };
export const mondayOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); return isoOf(dt); };
export const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return isoOf(new Date(y, m - 1, d + n)); };
