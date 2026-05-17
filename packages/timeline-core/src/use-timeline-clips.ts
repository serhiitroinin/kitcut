"use client";

import { useCallback } from "react";
import { createClipId, splitClipsAt, trimClipSide } from "./timeline";
import type { TimelineClip } from "./types";

type UpdateAndPersist<C> = (updater: (prev: C[]) => C[]) => void;

export function useTimelineClips<R extends string, E extends string>(
  updateAndPersist: UpdateAndPersist<TimelineClip<R, E>>,
  defaultEffect?: E,
) {
  type C = TimelineClip<R, E>;

  const addClip = useCallback(
    (recordingId: R, durationMs: number) => {
      const id = createClipId();
      const clip: C = {
        id,
        recordingId,
        sourceStartMs: 0,
        sourceEndMs: durationMs,
        originalDurationMs: durationMs,
        timelineStartMs: 0,
        ...(defaultEffect ? { eyeContactMode: defaultEffect } : {}),
      };
      updateAndPersist((prev) => [...prev, clip]);
      return id;
    },
    [updateAndPersist, defaultEffect],
  );

  const removeClip = useCallback(
    (clipId: string) => updateAndPersist((prev) => prev.filter((c) => c.id !== clipId)),
    [updateAndPersist],
  );

  const trimClip = useCallback(
    (clipId: string, side: "start" | "end", newMs: number, frameRate?: number | null) =>
      updateAndPersist((prev) =>
        prev.map((c) => (c.id === clipId ? trimClipSide(c, side, newMs, frameRate ?? null) : c)),
      ),
    [updateAndPersist],
  );

  const splitClip = useCallback(
    (clipId: string, splitAtMs: number) =>
      updateAndPersist((prev) => splitClipsAt(prev, clipId, splitAtMs)),
    [updateAndPersist],
  );

  const reorderClips = useCallback(
    (fromIndex: number, toIndex: number) =>
      updateAndPersist((prev) => {
        const next = prev.slice();
        const [moved] = next.splice(fromIndex, 1);
        if (moved) next.splice(toIndex, 0, moved);
        return next;
      }),
    [updateAndPersist],
  );

  const duplicateClip = useCallback(
    (clipId: string) =>
      updateAndPersist((prev) => {
        const idx = prev.findIndex((c) => c.id === clipId);
        if (idx === -1) return prev;
        const clone = { ...prev[idx]!, id: createClipId() };
        const next = prev.slice();
        next.splice(idx + 1, 0, clone);
        return next;
      }),
    [updateAndPersist],
  );

  const setClipEyeContactMode = useCallback(
    (clipId: string, eyeContactMode: E) =>
      updateAndPersist((prev) =>
        prev.map((c) => (c.id === clipId ? { ...c, eyeContactMode } : c)),
      ),
    [updateAndPersist],
  );

  const setClipsEyeContactMode = useCallback(
    (clipIds: string[], eyeContactMode: E) => {
      const set = new Set(clipIds);
      updateAndPersist((prev) =>
        prev.map((c) => (set.has(c.id) ? { ...c, eyeContactMode } : c)),
      );
    },
    [updateAndPersist],
  );

  return {
    addClip,
    removeClip,
    trimClip,
    splitClip,
    reorderClips,
    duplicateClip,
    setClipEyeContactMode,
    setClipsEyeContactMode,
  };
}
