import { describe, it, expect } from "vitest";
import { normTheme } from "../src/theme.js";

describe("normTheme", () => {
  it("keeps a real choice", () => {
    expect(normTheme("light")).toBe("light");
    expect(normTheme("dark")).toBe("dark");
  });
  it("falls back to auto for anything else", () => {
    for (const v of ["auto", null, undefined, "", "blue"]) expect(normTheme(v)).toBe("auto");
  });
});
