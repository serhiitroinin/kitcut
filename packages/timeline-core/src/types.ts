/**
 * Core data model. `recordingId` and `eyeContactMode` are generic so hosts can
 * narrow them to branded ids / domain unions without the engine caring.
 */
export interface TimelineClip<
  R extends string = string,
  E extends string = string,
> {
  id: string;
  /** Identifier of the underlying source media. */
  recordingId: R;
  /** Trim start within the source media, in ms. */
  sourceStartMs: number;
  /** Trim end within the source media, in ms. */
  sourceEndMs: number;
  /** Untrimmed source duration, in ms. */
  originalDurationMs: number;
  /** Position on the timeline, in ms (derived — recomputed on every change). */
  timelineStartMs: number;
  /** Opaque per-clip effect tag carried through unchanged by the engine. */
  eyeContactMode?: E;
}

export interface SilentRegion {
  startMs: number;
  endMs: number;
}

export type SaveStatus = "saved" | "saving" | "unsaved";

/** Wire shape handed to a {@link PersistenceAdapter}. Derived, never the source of truth. */
export interface SerializedClip {
  id: string;
  recordingId: string;
  sourceStartMs: number;
  sourceEndMs: number;
  timelineStartMs: number;
  eyeContactMode?: string;
}

export interface PersistencePayload {
  clips: SerializedClip[];
  totalDurationMs: number;
}

/**
 * Host-supplied storage. The engine debounces, tracks revisions, and only ever
 * calls `save`. Implement this against Convex, a REST endpoint, localStorage —
 * core never imports a backend.
 */
export interface PersistenceAdapter {
  save(payload: PersistencePayload): Promise<void>;
  /** Optional eager load when the host does not pass `initialClips`. */
  load?(): Promise<readonly TimelineClip[] | null>;
}
