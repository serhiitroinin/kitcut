import { describe, expect, it } from "vitest";
import { clampZoom, msToPx, pxToMs, stepZoom, MAX_PX_PER_SEC, MIN_PX_PER_SEC } from "./zoom";
import { defaultTranslate } from "./translate";

describe("zoom math", () => {
  it("round-trips ms <-> px", () => {
    expect(msToPx(2000, 100)).toBe(200);
    expect(pxToMs(200, 100)).toBe(2000);
  });
  it("clamps to bounds", () => {
    expect(clampZoom(1)).toBe(MIN_PX_PER_SEC);
    expect(clampZoom(99999)).toBe(MAX_PX_PER_SEC);
  });
  it("steps multiplicatively within bounds", () => {
    expect(stepZoom(100, 1.25)).toBe(125);
    expect(stepZoom(MAX_PX_PER_SEC, 2)).toBe(MAX_PX_PER_SEC);
  });
});

describe("defaultTranslate", () => {
  it("passes the key through", () => {
    expect(defaultTranslate("editor.play")).toBe("editor.play");
  });
  it("interpolates {tokens}", () => {
    expect(defaultTranslate("Saved {n} clips", { n: 3 })).toBe("Saved 3 clips");
  });
  it("leaves unknown tokens intact", () => {
    expect(defaultTranslate("Hi {who}", {})).toBe("Hi {who}");
  });
});
