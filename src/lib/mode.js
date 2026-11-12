// Money mode: "cn" (yuan is main money, dollars under it) or "intl" (dollars only, no yuan shown).
// This module owns which mode the screen is in and everything that depends on it:
//   main money (format.js's setMainCur is called only from here), payment methods, the starting
//   currency and method of a new entry, and how an amount is typed or shown.
// The *For functions take the mode as an argument (pure, easy to test); the short forms use the current mode.
import { setMainCur, usd0, yuan0, round2 } from "./format.js";

export const METHODS = ["Alipay", "WeChat Pay", "Cash", "Bank card", "Credit card", "Bank transfer", "Other"];

let current = "cn";
export const normMode = (m) => (m === "intl" ? "intl" : "cn");
export function setMode(m) { current = normMode(m); setMainCur(current === "intl" ? "USD" : "RMB"); return current; }
export const getMode = () => current;
export const isIntl = () => current === "intl";

// Which mode to draw in. Until the real settings have loaded, the mode last used on this device is kept.
export const modeFor = (config, configLoaded, remembered) => (configLoaded ? normMode(config && config.mode) : normMode(remembered));

// payment methods: Chinese = the standard list plus your own wallets; International = your wallets, then Cash, Credit card, Other
export function methodsFor(mode, wallets) {
  const ws = wallets || [];
  if (mode === "intl") return Array.from(new Set(ws.flatMap((w) => w.methods).concat(["Cash", "Credit card", "Other"])));
  const extra = ws.flatMap((w) => w.methods).filter((m) => !METHODS.includes(m));
  return METHODS.slice(0, -1).concat(extra, ["Other"]);
}
export function defaultMethodFor(mode, wallets) {
  if (mode !== "intl") return "Alipay";
  const w = (wallets || []).find((x) => x.methods && x.methods.length);
  return w ? w.methods[0] : "Cash";
}
export const curDefaultFor = (mode) => (mode === "intl" ? "USD" : "RMB");

// An amount in its own currency as main money: dollars in International (yuan are converted), yuan otherwise.
export const mainOfFor = (mode, n, cur, rate) => (mode === "intl" ? (cur === "USD" ? n : n / rate) : cur === "USD" ? n * rate : n);
// An amount typed in its own currency, shown the way the mode wants it (International never shows yuan)
export const typedTextFor = (mode, amount, cur, rate) => (mode === "intl" ? usd0(cur === "USD" ? amount : amount / rate) : cur === "RMB" ? yuan0(amount) : usd0(amount));
// What goes into the amount box when an existing entry is opened or repeated: in International a yuan entry is
// opened in dollars (what the owner really sees), anything else keeps the amount it was typed in.
export const formAmountFor = (mode, e) => (mode === "intl" && e.currency !== "USD" ? round2(Number(e.usd) || 0) : e.amount);

export const methods = (wallets) => methodsFor(current, wallets);
export const defaultMethod = (wallets) => defaultMethodFor(current, wallets);
export const curDefault = () => curDefaultFor(current);
export const mainOf = (n, cur, rate) => mainOfFor(current, n, cur, rate);
export const typedText = (amount, cur, rate) => typedTextFor(current, amount, cur, rate);
export const formAmount = (e) => formAmountFor(current, e);
