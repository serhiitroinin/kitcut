"use client";

import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { computeTotalDuration } from "./timeline";
import type { PersistenceAdapter, SaveStatus, SerializedClip, TimelineClip } from "./types";

function serialize(clips: readonly TimelineClip[], includeEffect: boolean): SerializedClip[] {
  return clips.map((clip) => ({
    id: clip.id,
    recordingId: clip.recordingId,
    sourceStartMs: clip.sourceStartMs,
    sourceEndMs: clip.sourceEndMs,
    timelineStartMs: clip.timelineStartMs,
    ...(includeEffect && clip.eyeContactMode ? { eyeContactMode: clip.eyeContactMode } : {}),
  }));
}

interface Options<C extends TimelineClip> {
  documentId: string | null;
  persistence: PersistenceAdapter;
  debounceMs: number;
  setSaveStatus: Dispatch<SetStateAction<SaveStatus>>;
  clipsRef: MutableRefObject<C[]>;
}

/**
 * Debounced, revision-tracked persistence. Survives rapid edits and document
 * switches without races — ported from a production editor, generalised so the
 * only host dependency is a {@link PersistenceAdapter}.
 */
export function useTimelinePersistence<C extends TimelineClip>({
  documentId,
  persistence,
  debounceMs,
  setSaveStatus,
  clipsRef,
}: Options<C>) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const persistPromiseRef = useRef<{
    documentId: string;
    revision: number;
    promise: Promise<void>;
  } | null>(null);
  const latestLocalRevisionRef = useRef(0);
  const lastCompletedPersistRevisionRef = useRef(0);
  const hydratedDocumentIdRef = useRef<string | null>(null);
  const supportsEffectRef = useRef(true);

  const persistNow = useCallback(
    async (newClips: C[]) => {
      if (!documentId) return;
      const target = documentId;
      setSaveStatus("saving");
      const totalDurationMs = computeTotalDuration(newClips);
      const save = (includeEffect: boolean) =>
        persistence.save({ clips: serialize(newClips, includeEffect), totalDurationMs });

      try {
        await save(supportsEffectRef.current).catch((error: unknown) => {
          if (
            supportsEffectRef.current &&
            error instanceof Error &&
            error.message.includes("eyeContactMode")
          ) {
            supportsEffectRef.current = false;
            return save(false);
          }
          throw error;
        });
        if (hydratedDocumentIdRef.current === target) setSaveStatus("saved");
      } catch (error) {
        if (hydratedDocumentIdRef.current === target) setSaveStatus("unsaved");
        throw error;
      }
    },
    [documentId, persistence, setSaveStatus],
  );

  const runPersist = useCallback(
    (newClips: C[], revision: number) => {
      if (!documentId) return Promise.resolve();
      const promise = persistNow(newClips).finally(() => {
        if (persistPromiseRef.current?.promise === promise) persistPromiseRef.current = null;
      });
      persistPromiseRef.current = { documentId, revision, promise };
      return promise.then(() => {
        if (hydratedDocumentIdRef.current === documentId) {
          lastCompletedPersistRevisionRef.current = Math.max(
            lastCompletedPersistRevisionRef.current,
            revision,
          );
        }
      });
    },
    [documentId, persistNow],
  );

  const persistClips = useCallback(
    (newClips: C[]) => {
      if (!documentId) return;
      setSaveStatus("unsaved");
      const revision = latestLocalRevisionRef.current + 1;
      latestLocalRevisionRef.current = revision;
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void runPersist(newClips, revision);
      }, debounceMs);
    },
    [documentId, debounceMs, runPersist, setSaveStatus],
  );

  const flushPendingChanges = useCallback(async () => {
    clearTimeout(saveTimerRef.current);
    if (!documentId) return;
    const targetRevision = latestLocalRevisionRef.current;
    if (targetRevision === 0 || lastCompletedPersistRevisionRef.current >= targetRevision) return;
    const active = persistPromiseRef.current;
    if (active?.documentId === documentId) {
      await active.promise;
      if (
        active.revision === targetRevision ||
        lastCompletedPersistRevisionRef.current >= targetRevision
      ) {
        return;
      }
    }
    await runPersist(clipsRef.current, targetRevision);
  }, [clipsRef, documentId, runPersist]);

  const resetPersistence = useCallback(
    (newDocumentId: string | null) => {
      hydratedDocumentIdRef.current = newDocumentId;
      clearTimeout(saveTimerRef.current);
      persistPromiseRef.current = null;
      latestLocalRevisionRef.current = 0;
      lastCompletedPersistRevisionRef.current = 0;
      setSaveStatus("saved");
    },
    [setSaveStatus],
  );

  return {
    persistClips,
    flushPendingChanges,
    resetPersistence,
    hydratedDocumentIdRef,
  };
}
