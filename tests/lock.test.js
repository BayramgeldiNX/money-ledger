import { describe, it, expect } from "vitest";
import { isIOS, shouldRelock, toB64, fromB64, makePassRecord, checkPassword, waitAfterFails, RELOCK_AFTER_MS } from "../src/lib/lock.js";

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
