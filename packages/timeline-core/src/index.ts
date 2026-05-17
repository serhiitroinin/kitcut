/**
 * `@kitcut/timeline-core` — the headless clip/timeline editing engine.
 *
 * Pure timeline algebra + React hooks. Persistence is a port; core never
 * imports a backend.
 */
export type {
  TimelineClip,
  SilentRegion,
  SaveStatus,
  SerializedClip,
  PersistencePayload,
  PersistenceAdapter,
} from "./types";

export {
  snapToFrame,
  clipDurationMs,
  recomputeTimeline,
  computeTotalDuration,
  areClipsEqual,
  clipAt,
  trimClipSide,
  splitClipsAt,
  nonSilentSegments,
  removeSilenceFromClipPure,
  removeSilenceFromAllPure,
  createClipId,
} from "./timeline";

export { useTimeline, type UseTimelineOptions } from "./use-timeline";
export { createInMemoryPersistence, createLocalStoragePersistence } from "./adapters";
