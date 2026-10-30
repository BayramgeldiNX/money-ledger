// Number and money formatting. Whole numbers show no decimals; anything else shows two.
export const round2 = (n) => Math.round(n * 100) / 100;
export const fmt = (n) => round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmt0 = (n) => Math.round(n).toLocaleString("en-US");
export const smart = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt0(Math.abs(n)) : fmt(Math.abs(n)));
// a rounding crumb like -0.0000001 is zero, not "-¥0"
export const sign = (n, s) => (round2(n) < 0 ? "-" : "") + s;
export const usd = (n) => sign(n, "$") + fmt(Math.abs(n));
export const usd0 = (n) => sign(n, "$") + smart(n);
export const usdS = usd0;
export const rmb = (n) => sign(n, "¥") + fmt(Math.abs(n));
export const rmb0 = (n) => sign(n, "¥") + smart(n);
export const rmbS = rmb0;
export const compactRmb = (v) => (v >= 10000 ? "¥" + Math.round(v / 1000) + "k" : v >= 1000 ? "¥" + (v / 1000).toFixed(1).replace(/\.0$/, "") + "k" : "¥" + Math.round(v));

// Chinese keyboards can type full-width digits and punctuation: "１２，８", "12。8", "¥12"
export const normNum = (s) => String(s == null ? "" : s).normalize("NFKC").replace(/。/g, ".").replace(/−/g, "-");
// "12.8", "12,8" (comma keyboards), "1,250", "1.250,50" and "¥1,250.50" all read correctly.
// Anything else is NaN: "12abc" or "1.2.3" must never be saved as a number the owner did not mean.
export const parseAmt = (s) => {
  let t = normNum(s).replace(/[\s¥$元块]|rmb|cny|usd/gi, "");
  const comma = t.lastIndexOf(","), dot = t.lastIndexOf(".");
  if (comma >= 0 && dot > comma) t = t.replace(/,/g, "");
  else if (comma >= 0 && dot >= 0) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d{1,2}$/.test(t)) t = t.replace(",", ".");
  else if (/^-?\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, "");
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
};
// The amount inside a short note: "lunch 38 wechat", "rent 1,250", "午饭 38元", "2 coffees 30".
// A number with a currency mark wins; otherwise the largest number (the small one is usually a count).
const NUM = "\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?";
export const NUM_RE = () => new RegExp("(?:" + NUM + ")\\s*(?:块钱|块|元)?", "g");
export const amountInText = (text) => {
  const t = normNum(text);
  const marked = t.match(new RegExp("[¥$]\\s*(" + NUM + ")")) || t.match(new RegExp("(" + NUM + ")\\s*(?:块|元|rmb|cny|yuan|kuai|usd|dollar)", "i"));
  if (marked) return parseAmt(marked[1]);
  const all = (t.match(new RegExp(NUM, "g")) || []).map(parseAmt).filter((n) => isFinite(n));
  return all.length ? Math.max(...all) : null;
};
// One CSV cell. Text that starts with = + - @ would run as a formula in Excel, so it gets a ' in front.
export const csvCell = (v, text) => {
  let s = String(v == null ? "" : v);
  if (text && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
export const ordinal = (d) => d + (d % 10 === 1 && d !== 11 ? "st" : d % 10 === 2 && d !== 12 ? "nd" : d % 10 === 3 && d !== 13 ? "rd" : "th");
export const listJoin = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
