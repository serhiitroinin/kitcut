import { describe, expect, it } from "vitest";
import { pickExportMimeType, totalTimelineDurationMs } from "./client-renderer";
import type { ExportRequest } from "./index";

const req = (clips: { inMs: number; outMs: number }[]): ExportRequest => ({
  format: "webm",
  timeline: {
    width: 1280,
    height: 720,
    fps: 30,
    clips: clips.map((c) => ({ sourceUrl: "blob:x", ...c })),
  },
});

describe("totalTimelineDurationMs", () => {
  it("sums trimmed clip durations", () => {
    expect(
      totalTimelineDurationMs(req([{ inMs: 0, outMs: 1000 }, { inMs: 500, outMs: 2000 }])),
    ).toBe(2500);
  });
  it("is zero for an empty timeline", () => {
    expect(totalTimelineDurationMs(req([]))).toBe(0);
  });
});

describe("pickExportMimeType", () => {
  it("prefers vp9/opus", () => {
    expect(pickExportMimeType(() => true)).toBe("video/webm;codecs=vp9,opus");
  });
  it("defaults to webm", () => {
    expect(pickExportMimeType(() => false)).toBe("video/webm");
  });
});
