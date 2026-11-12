import { describe, it, expect } from "vitest";
import { isAndroid, osOf, isIOS } from "../src/lib/os.js";
import { shouldRelock, toB64, fromB64, makePassRecord, checkPassword, pinLengthOf, waitAfterFails, PIN_LENGTH, RELOCK_AFTER_MS } from "../src/lib/lock.js";

describe("isIOS", () => {
  it("knows iPhone and iPad", () => {
    expect(isIOS({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" })).toBe(true);
    expect(isIOS({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
  });
  it("leaves out Windows and a real Mac", () => {
    expect(isIOS({ userAgent: "Mozilla/5.0 (Windows NT 10.0)", platform: "Win32" })).toBe(false);
    expect(isIOS({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
  });
});

describe("shouldRelock", () => {
  it("stays open for a short trip away", () => {
    expect(shouldRelock(1000, 1000 + RELOCK_AFTER_MS - 1)).toBe(false);
  });
  it("locks after a minute, or when the time is unknown", () => {
    expect(shouldRelock(1000, 1000 + RELOCK_AFTER_MS)).toBe(true);
    expect(shouldRelock(0, 5000)).toBe(true);
  });
});

describe("base64", () => {
  it("round-trips a credential id", () => {
    const id = new Uint8Array([0, 1, 127, 128, 255]);
    expect(Array.from(fromB64(toB64(id)))).toEqual(Array.from(id));
  });
});

describe("app password", () => {
  it("accepts the right password and refuses others", async () => {
    const record = await makePassRecord("4821", 1000);
    expect(await checkPassword("4821", record)).toBe(true);
    expect(await checkPassword("4822", record)).toBe(false);
    expect(await checkPassword("", record)).toBe(false);
  });
  it("does not store the password", async () => {
    const record = await makePassRecord("4821", 1000);
    expect(JSON.stringify(record)).not.toContain("4821");
  });
  it("gives the same password a different hash each time", async () => {
    const [a, b] = await Promise.all([makePassRecord("4821", 1000), makePassRecord("4821", 1000)]);
    expect(a.hash).not.toBe(b.hash);
  });
  it("new passcodes are 4 digits; one saved earlier without a length stays 6", async () => {
    expect(PIN_LENGTH).toBe(4);
    expect(pinLengthOf(await makePassRecord("4821", 1000))).toBe(4);
    expect(pinLengthOf({ salt: "x", hash: "y", iterations: 1 })).toBe(6);
  });
  it("refuses when there is no saved password", async () => {
    expect(await checkPassword("4821", null)).toBe(false);
  });
});

describe("waitAfterFails", () => {
  it("gives five free tries", () => {
    expect(waitAfterFails(4)).toBe(0);
    expect(waitAfterFails(5)).toBe(30000);
  });
  it("doubles, up to 15 minutes", () => {
    expect(waitAfterFails(6)).toBe(60000);
    expect(waitAfterFails(50)).toBe(15 * 60 * 1000);
  });
});

describe("isAndroid / osOf", () => {
  const samsung = "Mozilla/5.0 (Linux; Android 16; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
  const samsungInternet = "Mozilla/5.0 (Linux; Android 16; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/140.0.0.0 Mobile Safari/537.36";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
  const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36";
  it("knows Samsung Chrome and Samsung Internet", () => {
    expect(isAndroid({ userAgent: samsung })).toBe(true);
    expect(isAndroid({ userAgent: samsungInternet })).toBe(true);
  });
  it("leaves out iPhone and Windows", () => {
    expect(isAndroid({ userAgent: iphone })).toBe(false);
    expect(isAndroid({ userAgent: windows })).toBe(false);
    expect(isAndroid()).toBe(false);
  });
  it("names the family", () => {
    expect(osOf({ userAgent: samsung })).toBe("android");
    expect(osOf({ userAgent: iphone })).toBe("ios");
    expect(osOf({ userAgent: windows, platform: "Win32" })).toBe("");
  });
});
