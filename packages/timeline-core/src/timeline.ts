/**
 * Pure timeline algebra. No React, no I/O — every function here is
 * deterministic and unit-tested. The hooks are thin wrappers over these.
 */
import type { SilentRegion, TimelineClip } from "./types";

/** Quantize a millisecond value to the nearest frame boundary. */
export function snapToFrame(ms: number, frameRate: number | null): number {
  if (!frameRate || frameRate <= 0) return ms;
  const frameMs = 1000 / frameRate;
  return Math.round(ms / frameMs) * frameMs;
}

/** A clip's effective (trimmed) duration on the timeline. */
export function clipDurationMs(clip: TimelineClip): number {
  return clip.sourceEndMs - clip.sourceStartMs;
}

/** Reflow `timelineStartMs` so clips are laid end-to-end in array order. */
export function recomputeTimeline<C extends TimelineClip>(clips: readonly C[]): C[] {
  let cursor = 0;
  return clips.map((clip) => {
    const updated = { ...clip, timelineStartMs: cursor };
    cursor += clip.sourceEndMs - clip.sourceStartMs;
    return updated;
  });
}

export function computeTotalDuration(clips: readonly TimelineClip[]): number {
  if (clips.length === 0) return 0;
  const last = clips[clips.length - 1]!;
  return last.timelineStartMs + (last.sourceEndMs - last.sourceStartMs);
}

/** Structural equality over the fields that matter for hydration/persistence. */
export function areClipsEqual(
  a: readonly TimelineClip[],
  b: readonly TimelineClip[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const l = a[i]!;
    const r = b[i]!;
    if (
      l.id !== r.id ||
      l.recordingId !== r.recordingId ||
      l.sourceStartMs !== r.sourceStartMs ||
      l.sourceEndMs !== r.sourceEndMs ||
      l.timelineStartMs !== r.timelineStartMs ||
      l.eyeContactMode !== r.eyeContactMode
    ) {
      return false;
    }
  }
  return true;
}

/** The clip the playhead sits inside, or null. */
export function clipAt<C extends TimelineClip>(
  clips: readonly C[],
  playheadMs: number,
): C | null {
  return (
    clips.find(
      (c) =>
        playheadMs >= c.timelineStartMs &&
        playheadMs < c.timelineStartMs + (c.sourceEndMs - c.sourceStartMs),
    ) ?? null
  );
}

/** Clamp a trim edit to valid source bounds. Returns the updated clip. */
export function trimClipSide<C extends TimelineClip>(
  clip: C,
  side: "start" | "end",
  newMs: number,
  frameRate: number | null,
): C {
  const snapped = snapToFrame(newMs, frameRate);
  if (side === "start") {
    return { ...clip, sourceStartMs: Math.max(0, Math.min(snapped, clip.sourceEndMs - 1)) };
  }
  const maxEnd = clip.originalDurationMs || clip.sourceEndMs;
  return {
    ...clip,
    sourceEndMs: Math.max(clip.sourceStartMs + 1, Math.min(snapped, maxEnd)),
  };
}

const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/**
 * Split the clip containing `splitAtMs` (timeline coordinates) into two. Returns
 * the input unchanged if the cut falls outside a clip or on its edge.
 */
export function splitClipsAt<C extends TimelineClip>(
  clips: readonly C[],
  clipId: string,
  splitAtMs: number,
): C[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return clips.slice();
  const clip = clips[idx]!;
  const sourceSplitMs = clip.sourceStartMs + (splitAtMs - clip.timelineStartMs);
  if (sourceSplitMs <= clip.sourceStartMs || sourceSplitMs >= clip.sourceEndMs) {
    return clips.slice();
  }
  const a = { ...clip, id: uid(), sourceEndMs: sourceSplitMs, timelineStartMs: 0 };
  const b = { ...clip, id: uid(), sourceStartMs: sourceSplitMs, timelineStartMs: 0 };
  const next = clips.slice();
  next.splice(idx, 1, a, b);
  return next;
}

/** Source-space segments of a clip that survive after cutting `regions`. */
export function nonSilentSegments(
  clip: TimelineClip,
  regions: readonly SilentRegion[],
): { start: number; end: number }[] {
  const overlapping = regions
    .filter((r) => r.startMs < clip.sourceEndMs && r.endMs > clip.sourceStartMs)
    .map((r) => ({
      startMs: Math.max(r.startMs, clip.sourceStartMs),
      endMs: Math.min(r.endMs, clip.sourceEndMs),
    }))
    .sort((x, y) => x.startMs - y.startMs);

  if (overlapping.length === 0) return [];

  const segments: { start: number; end: number }[] = [];
  let cursor = clip.sourceStartMs;
  for (const region of overlapping) {
    if (cursor < region.startMs) segments.push({ start: cursor, end: region.startMs });
    cursor = region.endMs;
  }
  if (cursor < clip.sourceEndMs) segments.push({ start: cursor, end: clip.sourceEndMs });
  return segments;
}

/** Replace one clip with its non-silent segments. */
export function removeSilenceFromClipPure<C extends TimelineClip>(
  clips: readonly C[],
  clipId: string,
  regions: readonly SilentRegion[],
): C[] {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx === -1) return clips.slice();
  const clip = clips[idx]!;
  const segments = nonSilentSegments(clip, regions);
  if (segments.length === 0) return clips.slice();
  const made = segments.map(
    (seg) => ({ ...clip, id: uid(), sourceStartMs: seg.start, sourceEndMs: seg.end, timelineStartMs: 0 }) as C,
  );
  const next = clips.slice();
  next.splice(idx, 1, ...made);
  return next;
}

/** Cut silence across every clip, keyed by `recordingId`. */
export function removeSilenceFromAllPure<C extends TimelineClip>(
  clips: readonly C[],
  regionsByRecordingId: Map<string, readonly SilentRegion[]>,
): C[] {
  const next: C[] = [];
  for (const clip of clips) {
    const regions = regionsByRecordingId.get(clip.recordingId);
    if (!regions || regions.length === 0) {
      next.push(clip);
      continue;
    }
    const segments = nonSilentSegments(clip, regions);
    if (segments.length === 0) {
      next.push(clip);
      continue;
    }
    for (const seg of segments) {
      next.push({
        ...clip,
        id: uid(),
        sourceStartMs: seg.start,
        sourceEndMs: seg.end,
        timelineStartMs: 0,
      });
    }
  }
  return next;
}

export { uid as createClipId };
