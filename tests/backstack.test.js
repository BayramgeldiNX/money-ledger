import { describe, it, expect } from "vitest";
import { wantedDepth, planSync, onPop } from "../src/lib/backstack.js";

describe("wantedDepth", () => {
  it("counts open layers", () => {
    expect(wantedDepth([false, false, false])).toBe(0);
    expect(wantedDepth([true, false, true])).toBe(2);
  });
});
describe("planSync", () => {
  it("pushes when a layer opens", () => expect(planSync(0, 1)).toEqual({ push: 1, back: 0 }));
  it("goes back when layers close by tap", () => expect(planSync(2, 0)).toEqual({ push: 0, back: 2 }));
  it("does nothing when equal", () => expect(planSync(1, 1)).toEqual({ push: 0, back: 0 }));
});
describe("onPop", () => {
  it("ignores pops the app caused", () => {
    expect(onPop({ ignore: 1, depth: 0, hasLayer: true, stateIsOurs: true })).toEqual({ ignore: 0, depth: 0, close: false, skip: false });
  });
  it("closes the top layer on a real Back", () => {
    expect(onPop({ ignore: 0, depth: 2, hasLayer: true })).toEqual({ ignore: 0, depth: 1, close: true, skip: false });
  });
  it("lets Back leave from Home with nothing open", () => {
    expect(onPop({ ignore: 0, depth: 0, hasLayer: false, stateIsOurs: false }).skip).toBe(false);
  });
  it("skips a leftover entry from before a reload", () => {
    expect(onPop({ ignore: 0, depth: 0, hasLayer: false, stateIsOurs: true }).skip).toBe(true);
  });
});
