"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { areClipsEqual, clipAt, computeTotalDuration, recomputeTimeline } from "./timeline";
import { useTimelineClips } from "./use-timeline-clips";
import { useTimelineHistory } from "./use-timeline-history";
import { useTimelinePersistence } from "./use-timeline-persistence";
import { useTimelineSilence } from "./use-timeline-silence";
import type { PersistenceAdapter, SaveStatus, TimelineClip } from "./types";

export interface UseTimelineOptions<R extends string, E extends string> {
  /** Identity of the document being edited. Null disables persistence. */
  documentId: string | null;
  /** Controlled initial clips (e.g. hydrated from the server). */
  initialClips?: TimelineClip<R, E>[];
  /** Where edits are saved. */
  persistence: PersistenceAdapter;
  /** Debounce before a save fires. Default 500ms. */
  debounceMs?: number;
  /** Effect tag stamped onto newly created clips. */
  defaultEffect?: E;
}

/**
 * The headless timeline editing engine: clips, selection, playhead, undo/redo,
 * silence removal, and debounced persistence. UI-agnostic — render it however
 * you like.
 */
export function useTimeline<R extends string = string, E extends string = string>({
  documentId,
  initialClips = [],
  persistence,
  debounceMs = 500,
  defaultEffect,
}: UseTimelineOptions<R, E>) {
  type C = TimelineClip<R, E>;

  const [clips, setClips] = useState<C[]>(initialClips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const clipsRef = useRef<C[]>(clips);
  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  const { persistClips, flushPendingChanges, resetPersistence, hydratedDocumentIdRef } =
    useTimelinePersistence({
      documentId,
      persistence,
      debounceMs,
      setSaveStatus,
      clipsRef,
    });

  const { canUndo, canRedo, undo, redo, pushUndo, resetHistory, syncHistoryState } =
    useTimelineHistory<C>({ clipsRef, setClips, recomputeTimeline, persistClips });

  const updateAndPersist = useCallback(
    (updater: (prev: C[]) => C[]) => {
      setClips((prev) => {
        pushUndo(prev);
        const updated = recomputeTimeline(updater(prev));
        persistClips(updated);
        return updated;
      });
    },
    [persistClips, pushUndo],
  );

  const {
    addClip,
    removeClip: removeClipInternal,
    trimClip,
    splitClip,
    reorderClips,
    duplicateClip,
    setClipEyeContactMode,
    setClipsEyeContactMode,
  } = useTimelineClips<R, E>(updateAndPersist, defaultEffect);

  const removeClip = useCallback(
    (clipId: string) => {
      removeClipInternal(clipId);
      setSelectedClipId((prev) => (prev === clipId ? null : prev));
    },
    [removeClipInternal],
  );

  const { removeSilenceFromClip, removeSilenceFromAll } = useTimelineSilence<C>(
    updateAndPersist,
    setSelectedClipId,
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const documentChanged = hydratedDocumentIdRef.current !== documentId;
    const shouldHydrate =
      documentChanged || !areClipsEqual(initialClips, clipsRef.current);
    if (!shouldHydrate) return;
    resetPersistence(documentId);
    setClips(recomputeTimeline(initialClips));
    setSelectedClipId(null);
    setPlayheadMs(0);
    resetHistory();
  }, [initialClips, documentId, resetPersistence, resetHistory, syncHistoryState, hydratedDocumentIdRef]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totalDurationMs = computeTotalDuration(clips);
  const activeClip = clipAt(clips, playheadMs);

  return {
    clips,
    selectedClipId,
    selectClip: setSelectedClipId,
    playheadMs,
    setPlayheadMs,
    totalDurationMs,
    activeClip,
    saveStatus,
    addClip,
    removeClip,
    trimClip,
    splitClip,
    reorderClips,
    duplicateClip,
    setClipEyeContactMode,
    setClipsEyeContactMode,
    undo,
    redo,
    canUndo,
    canRedo,
    removeSilenceFromClip,
    removeSilenceFromAll,
    flushPendingChanges,
  };
}
