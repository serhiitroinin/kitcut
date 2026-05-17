"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useTimeline,
  type PersistenceAdapter,
  type TimelineClip,
} from "@kitcut/timeline-core";
import { clampZoom, msToPx, pxToMs, stepZoom } from "./zoom";

export interface UseEditorOptions<R extends string, E extends string> {
  documentId: string | null;
  persistence: PersistenceAdapter;
  initialClips?: TimelineClip<R, E>[];
  debounceMs?: number;
  defaultEffect?: E;
  /** Initial pixels-per-second zoom. Default 100. */
  pxPerSec?: number;
}

/**
 * The headless editor: the timeline engine + transport (play/pause/seek) +
 * zoom. No DOM, no styling — wire the returned values into any UI.
 */
export function useEditor<R extends string = string, E extends string = string>(
  options: UseEditorOptions<R, E>,
) {
  const timeline = useTimeline<R, E>({
    documentId: options.documentId,
    persistence: options.persistence,
    initialClips: options.initialClips,
    debounceMs: options.debounceMs,
    defaultEffect: options.defaultEffect,
  });

  const { totalDurationMs, playheadMs, setPlayheadMs } = timeline;

  // ── transport ──
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const playheadRef = useRef(playheadMs);
  useEffect(() => {
    playheadRef.current = playheadMs;
  }, [playheadMs]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const play = useCallback(() => {
    if (totalDurationMs <= 0) return;
    if (playheadRef.current >= totalDurationMs) setPlayheadMs(0);
    setIsPlaying(true);
  }, [totalDurationMs, setPlayheadMs]);

  const togglePlay = useCallback(() => {
    isPlaying ? pause() : play();
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (ms: number) => setPlayheadMs(Math.max(0, Math.min(ms, totalDurationMs))),
    [setPlayheadMs, totalDurationMs],
  );

  useEffect(() => {
    if (!isPlaying) return;
    lastTickRef.current = performance.now();
    const tick = (t: number) => {
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;
      const next = playheadRef.current + dt;
      if (next >= totalDurationMs) {
        setPlayheadMs(totalDurationMs);
        setIsPlaying(false);
        return;
      }
      setPlayheadMs(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, totalDurationMs, setPlayheadMs]);

  // ── zoom ──
  const [pxPerSec, setPxPerSecState] = useState(clampZoom(options.pxPerSec ?? 100));
  const setZoom = useCallback((v: number) => setPxPerSecState(clampZoom(v)), []);
  const zoomIn = useCallback(() => setPxPerSecState((v) => stepZoom(v, 1.25)), []);
  const zoomOut = useCallback(() => setPxPerSecState((v) => stepZoom(v, 0.8)), []);

  return {
    ...timeline,
    isPlaying,
    play,
    pause,
    togglePlay,
    seek,
    pxPerSec,
    setZoom,
    zoomIn,
    zoomOut,
    msToPx: useCallback((ms: number) => msToPx(ms, pxPerSec), [pxPerSec]),
    pxToMs: useCallback((px: number) => pxToMs(px, pxPerSec), [pxPerSec]),
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
