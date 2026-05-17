import { describe, expect, it } from "vitest";
import {
  areClipsEqual,
  clipAt,
  computeTotalDuration,
  nonSilentSegments,
  recomputeTimeline,
  removeSilenceFromClipPure,
  snapToFrame,
  splitClipsAt,
  trimClipSide,
} from "./timeline";
import type { TimelineClip } from "./types";

const clip = (over: Partial<TimelineClip> = {}): TimelineClip => ({
  id: over.id ?? "a",
  recordingId: over.recordingId ?? "r1",
  sourceStartMs: over.sourceStartMs ?? 0,
  sourceEndMs: over.sourceEndMs ?? 1000,
  originalDurationMs: over.originalDurationMs ?? 1000,
  timelineStartMs: over.timelineStartMs ?? 0,
  eyeContactMode: over.eyeContactMode,
});

describe("snapToFrame", () => {
  it("passes through without a frame rate", () => {
    expect(snapToFrame(123, null)).toBe(123);
    expect(snapToFrame(123, 0)).toBe(123);
  });
  it("quantizes to the nearest frame at 25fps (40ms)", () => {
    expect(snapToFrame(58, 25)).toBe(40);
    expect(snapToFrame(61, 25)).toBe(80);
  });
});

describe("recomputeTimeline", () => {
  it("lays clips end-to-end by trimmed duration", () => {
    const out = recomputeTimeline([
      clip({ id: "a", sourceStartMs: 100, sourceEndMs: 400 }),
      clip({ id: "b", sourceStartMs: 0, sourceEndMs: 500 }),
    ]);
    expect(out[0]!.timelineStartMs).toBe(0);
    expect(out[1]!.timelineStartMs).toBe(300);
    expect(computeTotalDuration(out)).toBe(800);
  });
  it("is zero for an empty timeline", () => {
    expect(computeTotalDuration([])).toBe(0);
  });
});

describe("areClipsEqual", () => {
  it("detects field-level changes", () => {
    const a = [clip({ id: "x" })];
    expect(areClipsEqual(a, a)).toBe(true);
    expect(areClipsEqual(a, [clip({ id: "x", sourceEndMs: 999 })])).toBe(false);
    expect(areClipsEqual(a, [clip({ id: "x" }), clip({ id: "y" })])).toBe(false);
  });
});

describe("clipAt", () => {
  const clips = recomputeTimeline([
    clip({ id: "a", sourceEndMs: 1000 }),
    clip({ id: "b", sourceEndMs: 1000 }),
  ]);
  it("resolves the clip under the playhead", () => {
    expect(clipAt(clips, 500)?.id).toBe("a");
    expect(clipAt(clips, 1000)?.id).toBe("b");
    expect(clipAt(clips, 5000)).toBeNull();
  });
});

describe("trimClipSide", () => {
  it("clamps start below end", () => {
    expect(trimClipSide(clip({ sourceEndMs: 500 }), "start", 900, null).sourceStartMs).toBe(499);
  });
  it("clamps end within original duration", () => {
    const c = clip({ sourceStartMs: 100, sourceEndMs: 400, originalDurationMs: 600 });
    expect(trimClipSide(c, "end", 9999, null).sourceEndMs).toBe(600);
  });
});

describe("splitClipsAt", () => {
  it("splits a clip into two at a timeline position", () => {
    const clips = recomputeTimeline([clip({ id: "a", sourceEndMs: 1000 })]);
    const out = splitClipsAt(clips, "a", 400);
    expect(out).toHaveLength(2);
    expect(out[0]!.sourceEndMs).toBe(400);
    expect(out[1]!.sourceStartMs).toBe(400);
  });
  it("ignores cuts on the edge", () => {
    const clips = recomputeTimeline([clip({ id: "a", sourceEndMs: 1000 })]);
    expect(splitClipsAt(clips, "a", 0)).toHaveLength(1);
  });
});

describe("silence", () => {
  it("computes non-silent segments", () => {
    const segs = nonSilentSegments(clip({ sourceEndMs: 1000 }), [
      { startMs: 200, endMs: 300 },
      { startMs: 600, endMs: 700 },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 200 },
      { start: 300, end: 600 },
      { start: 700, end: 1000 },
    ]);
  });
  it("replaces a clip with its surviving segments", () => {
    const clips = recomputeTimeline([clip({ id: "a", sourceEndMs: 1000 })]);
    const out = removeSilenceFromClipPure(clips, "a", [{ startMs: 400, endMs: 600 }]);
    expect(out).toHaveLength(2);
    expect(out.map((c) => [c.sourceStartMs, c.sourceEndMs])).toEqual([
      [0, 400],
      [600, 1000],
    ]);
  });
});
