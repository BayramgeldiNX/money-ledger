import { describe, it, expect } from "vitest";
import { mondayOf, addDays, shiftMonth, daysIn, isoOf } from "../src/lib/dates.js";

describe("dates", () => {
  it("weeks start on Monday", () => {
    expect(mondayOf("2026-10-19")).toBe("2026-10-19"); // a Monday
    expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // the Sunday of that week
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
  });
  it("adds days across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("moves between months", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
  it("counts days in a month", () => {
    expect(daysIn("2026-02")).toBe(28);
    expect(daysIn("2028-02")).toBe(29);
    expect(daysIn("2026-10")).toBe(31);
  });
  it("writes local dates", () => {
    expect(isoOf(new Date(2026, 9, 5))).toBe("2026-10-05");
  });
});
