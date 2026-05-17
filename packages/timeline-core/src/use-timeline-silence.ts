"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { removeSilenceFromAllPure, removeSilenceFromClipPure } from "./timeline";
import type { SilentRegion, TimelineClip } from "./types";

type UpdateAndPersist<C> = (updater: (prev: C[]) => C[]) => void;

export function useTimelineSilence<C extends TimelineClip>(
  updateAndPersist: UpdateAndPersist<C>,
  setSelectedClipId: Dispatch<SetStateAction<string | null>>,
) {
  const removeSilenceFromClip = useCallback(
    (clipId: string, silentRegions: readonly SilentRegion[]) => {
      setSelectedClipId((prev) => (prev === clipId ? null : prev));
      updateAndPersist((prev) => removeSilenceFromClipPure(prev, clipId, silentRegions));
    },
    [updateAndPersist, setSelectedClipId],
  );

  const removeSilenceFromAll = useCallback(
    (silentRegionsByRecordingId: Map<string, readonly SilentRegion[]>) => {
      setSelectedClipId(null);
      updateAndPersist((prev) => removeSilenceFromAllPure(prev, silentRegionsByRecordingId));
    },
    [updateAndPersist, setSelectedClipId],
  );

  return { removeSilenceFromClip, removeSilenceFromAll };
}
