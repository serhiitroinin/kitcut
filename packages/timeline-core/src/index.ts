/**
 * `@kitcut/timeline-core` — the clip/timeline state engine.
 *
 * Persistence is a port: core never imports a backend. The React state hooks
 * (`useTimeline`, history, silence detection) land here during the
 * `timeline-core` extraction block; this scaffold defines the data model and
 * the `PersistenceAdapter` seam they will sit behind.
 */

export interface TimelineClip {
  readonly id: string;
  readonly sourceUrl: string;
  /** Trim start within the source media, in ms. */
  readonly inMs: number;
  /** Trim end within the source media, in ms. */
  readonly outMs: number;
  /** Position on the timeline, in ms. */
  readonly startMs: number;
}

export interface SilentRegion {
  readonly clipId: string;
  readonly startMs: number;
  readonly endMs: number;
}

export interface TimelineState {
  readonly clips: readonly TimelineClip[];
}

export const EMPTY_TIMELINE: TimelineState = { clips: [] };

/**
 * Host-supplied storage. Botley injects a Convex adapter; the OSS default is
 * in-memory / localStorage. Core depends only on this interface.
 */
export interface PersistenceAdapter {
  load(): Promise<TimelineState | null>;
  save(state: TimelineState): Promise<void>;
}

/** Default in-memory persistence — handy for demos and tests. */
export function createInMemoryPersistence(
  initial: TimelineState | null = null,
): PersistenceAdapter {
  let snapshot = initial;
  return {
    async load() {
      return snapshot;
    },
    async save(state) {
      snapshot = state;
    },
  };
}

/** Total timeline duration in ms (end of the last clip). */
export function timelineDurationMs(state: TimelineState): number {
  return state.clips.reduce((max, clip) => {
    const end = clip.startMs + (clip.outMs - clip.inMs);
    return end > max ? end : max;
  }, 0);
}
