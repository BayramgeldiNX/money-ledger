import { describe, it, expect, afterEach } from "vitest";
import { setMode, getMode, isIntl, modeFor, methodsFor, defaultMethodFor, curDefaultFor, mainOfFor, typedTextFor, formAmountFor, typedText, mainOf, normMode } from "../src/lib/mode.js";
import { mainCur, rmb0 } from "../src/lib/format.js";
import { R } from "../src/lib/ledger.js";

afterEach(() => setMode("cn"));
const wallets = [{ methods: ["Chase", "Visa"] }, { methods: [] }];

describe("mode owns main money", () => {
  it("setMode switches the mode and main money together", () => {
    setMode("intl");
    expect(getMode()).toBe("intl"); expect(isIntl()).toBe(true); expect(mainCur()).toBe("USD");
    expect(rmb0(12.8)).toBe("$12.80");
    expect(R({ usd: 3, rmb: 20 })).toBe(3);
    setMode("cn");
    expect(isIntl()).toBe(false); expect(mainCur()).toBe("RMB");
    expect(R({ usd: 3, rmb: 20 })).toBe(20);
  });
  it("anything but intl is cn", () => {
    expect(normMode("weird")).toBe("cn");
    expect(normMode(undefined)).toBe("cn");
    expect(setMode("x")).toBe("cn");
  });
  it("uses the remembered mode until the settings load, then the saved one", () => {
    expect(modeFor({ mode: "cn" }, false, "intl")).toBe("intl");
    expect(modeFor({ mode: "cn" }, true, "intl")).toBe("cn");
    expect(modeFor({ mode: null }, true, "intl")).toBe("cn"); // no mode = Chinese (the owner's account)
    expect(modeFor({ mode: "intl" }, true, "cn")).toBe("intl");
  });
});

describe("payment methods and starting values", () => {
  it("Chinese: standard list with own wallets before Other", () => {
    const m = methodsFor("cn", wallets);
    expect(m[0]).toBe("Alipay"); expect(m).toContain("WeChat Pay");
    expect(m.slice(-3)).toEqual(["Chase", "Visa", "Other"]);
    expect(m.filter((x) => x === "Other")).toHaveLength(1);
  });
  it("International: own wallets first, then Cash, Credit card, Other; no Alipay or WeChat Pay", () => {
    const m = methodsFor("intl", wallets);
    expect(m).toEqual(["Chase", "Visa", "Cash", "Credit card", "Other"]);
    expect(m).not.toContain("Alipay");
    expect(methodsFor("intl", [])).toEqual(["Cash", "Credit card", "Other"]);
    expect(methodsFor("intl", null)).toEqual(["Cash", "Credit card", "Other"]);
  });
  it("new entries start on Alipay and yuan; International on the first wallet method (or Cash) and dollars", () => {
    expect(defaultMethodFor("cn", wallets)).toBe("Alipay");
    expect(curDefaultFor("cn")).toBe("RMB");
    expect(defaultMethodFor("intl", wallets)).toBe("Chase");
    expect(defaultMethodFor("intl", [])).toBe("Cash");
    expect(curDefaultFor("intl")).toBe("USD");
  });
});

describe("amounts", () => {
  it("main money of an amount in its own currency", () => {
    expect(mainOfFor("cn", 67, "RMB", 6.7)).toBe(67);
    expect(mainOfFor("cn", 10, "USD", 6.7)).toBeCloseTo(67);
    expect(mainOfFor("intl", 10, "USD", 6.7)).toBe(10);
    expect(mainOfFor("intl", 67, "RMB", 6.7)).toBeCloseTo(10);
  });
  it("typed text never shows yuan in International and keeps decimals", () => {
    expect(typedTextFor("cn", 12.8, "RMB", 6.7)).toBe("¥12.80");
    expect(typedTextFor("cn", 5, "USD", 6.7)).toBe("$5");
    expect(typedTextFor("intl", 67, "RMB", 6.7)).toBe("$10");
    expect(typedTextFor("intl", 4.5, "USD", 6.7)).toBe("$4.50");
  });
  it("the form opens a yuan entry in dollars in International, otherwise keeps what was typed", () => {
    const yuanEntry = { amount: 67, currency: "RMB", usd: 10, rmb: 67 };
    const usdEntry = { amount: 12.8, currency: "USD", usd: 12.8, rmb: 85.76 };
    expect(formAmountFor("intl", yuanEntry)).toBe(10); // measured with main money = dollars
    expect(formAmountFor("cn", yuanEntry)).toBe(67);
    expect(formAmountFor("intl", usdEntry)).toBe(12.8);
    expect(formAmountFor("cn", usdEntry)).toBe(12.8);
  });
  it("the current-mode forms follow setMode", () => {
    expect(mainOf(10, "USD", 6.7)).toBeCloseTo(67);
    setMode("intl");
    expect(mainOf(67, "RMB", 6.7)).toBeCloseTo(10);
    expect(typedText(67, "RMB", 6.7)).toBe("$10");
  });
  it("switching mode never changes stored data (entries keep both usd and rmb)", () => {
    const e = { usd: 10, rmb: 67 };
    setMode("intl"); const asIntl = [R(e), e.usd, e.rmb];
    setMode("cn"); const asCn = [R(e), e.usd, e.rmb];
    expect(asIntl).toEqual([10, 10, 67]);
    expect(asCn).toEqual([67, 10, 67]);
  });
});
