import { describe, it, expect } from "vitest";
import { rollParts } from "../src/motion.js";

const digits = (parts) => parts.filter((p) => p.to !== undefined).map((p) => [p.from, p.to]);

describe("rollParts", () => {
  it("rolls every digit up from 0 when nothing was shown before", () => {
    expect(digits(rollParts("", "¥1,234"))).toEqual([[0, 1], [0, 2], [0, 3], [0, 4]]);
  });
  it("keeps symbols as plain characters, in order", () => {
    expect(rollParts("", "−¥12.80").map((p) => p.ch).join("")).toBe("−¥12.80");
    expect(rollParts("", "−¥12.80").filter((p) => p.to === undefined).map((p) => p.ch)).toEqual(["−", "¥", "."]);
  });
  it("matches digits from the right, so a longer number keeps its last digits in place", () => {
    // ¥999 -> ¥1,002: 2 rolls from 9, 0 from 9, 0 from 9, and the new leading 1 from 0
    expect(digits(rollParts("¥999", "¥1,002"))).toEqual([[0, 1], [9, 0], [9, 0], [9, 2]]);
  });
  it("leaves unchanged digits where they are", () => {
    expect(digits(rollParts("¥1,250", "¥1,238"))).toEqual([[1, 1], [2, 2], [5, 3], [0, 8]]);
  });
  it("never changes the number being shown", () => {
    const text = "¥12,345.60";
    expect(rollParts("¥1", text).map((p) => p.ch).join("")).toBe(text);
  });
});
