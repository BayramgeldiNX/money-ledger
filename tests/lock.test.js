import { describe, it, expect } from "vitest";
import { isIOS, shouldRelock, toB64, fromB64, RELOCK_AFTER_MS } from "../src/lib/lock.js";

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
