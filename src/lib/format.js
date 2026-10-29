// Number and money formatting. Whole numbers show no decimals; anything else shows two.
export const round2 = (n) => Math.round(n * 100) / 100;
export const fmt = (n) => round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt0 = (n) => Math.round(n).toLocaleString("en-US");
export const smart = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt0(Math.abs(n)) : fmt(Math.abs(n)));
export const sign = (n, s) => (n < 0 ? "-" : "") + s;
export const usd = (n) => sign(n, "$") + fmt(Math.abs(n));
export const usd0 = (n) => sign(n, "$") + smart(n);
export const usdS = usd0;
export const rmb = (n) => sign(n, "¥") + fmt(Math.abs(n));
export const rmb0 = (n) => sign(n, "¥") + smart(n);
export const rmbS = rmb0;
export const compactRmb = (v) => (v >= 10000 ? "¥" + Math.round(v / 1000) + "k" : v >= 1000 ? "¥" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "¥" + Math.round(v));

// "12.8", "12,8" (comma keyboards), "1,250" and "¥1,250.50" all read correctly
export const parseAmt = (s) => {
  let t = String(s || "").replace(/[\s¥$]/g, "");
  if (/^-?\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  const n = parseFloat(t.replace(/,/g, ""));
  return isFinite(n) ? n : NaN;
};
export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const ordinal = (d) => d + (d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th");
export const listJoin = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
