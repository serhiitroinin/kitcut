"use client";

import {
  useState,
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { TimelineClip } from "./types";

const UNDO_STACK_LIMIT = 50;

interface Options<C extends TimelineClip> {
  clipsRef: MutableRefObject<C[]>;
  setClips: Dispatch<SetStateAction<C[]>>;
  recomputeTimeline: (clips: readonly C[]) => C[];
  persistClips: (clips: C[]) => void;
}

export function useTimelineHistory<C extends TimelineClip>({
  clipsRef,
  setClips,
  recomputeTimeline,
  persistClips,
}: Options<C>) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoStackRef = useRef<C[][]>([]);
  const redoStackRef = useRef<C[][]>([]);

  const syncHistoryState = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const resetHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryState();
  }, [syncHistoryState]);

  const pushUndo = useCallback(
    (currentClips: C[]) => {
      undoStackRef.current = [
        ...undoStackRef.current.slice(-(UNDO_STACK_LIMIT - 1)),
        currentClips,
      ];
      redoStackRef.current = [];
      syncHistoryState();
    },
    [syncHistoryState],
  );

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const prev = stack[stack.length - 1]!;
    undoStackRef.current = stack.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, clipsRef.current];
    syncHistoryState();
    const recomputed = recomputeTimeline(prev);
    setClips(recomputed);
    persistClips(recomputed);
  }, [clipsRef, persistClips, recomputeTimeline, setClips, syncHistoryState]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const next = stack[stack.length - 1]!;
    redoStackRef.current = stack.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, clipsRef.current];
    syncHistoryState();
    const recomputed = recomputeTimeline(next);
    setClips(recomputed);
    persistClips(recomputed);
  }, [clipsRef, persistClips, recomputeTimeline, setClips, syncHistoryState]);

  return { canUndo, canRedo, undo, redo, pushUndo, resetHistory, syncHistoryState };
}
