/**
 * Reference {@link PersistenceAdapter} implementations. Hosts typically write
 * their own (Convex, REST, IndexedDB); these cover demos and tests.
 */
import type { PersistenceAdapter, PersistencePayload, TimelineClip } from "./types";

/** Volatile, in-process. Useful for tests and ephemeral demos. */
export function createInMemoryPersistence(
  initial: readonly TimelineClip[] | null = null,
): PersistenceAdapter & { snapshot(): PersistencePayload | null } {
  let payload: PersistencePayload | null = null;
  let seed = initial;
  return {
    async save(next) {
      payload = next;
      seed = null;
    },
    async load() {
      return seed;
    },
    snapshot() {
      return payload;
    },
  };
}

/** Persists to `localStorage` under `key`. No-ops outside the browser. */
export function createLocalStoragePersistence(key: string): PersistenceAdapter {
  const available = typeof localStorage !== "undefined";
  return {
    async save(payload) {
      if (available) localStorage.setItem(key, JSON.stringify(payload));
    },
    async load() {
      if (!available) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as PersistencePayload;
        return parsed.clips.map((c) => ({
          ...c,
          originalDurationMs: c.sourceEndMs - c.sourceStartMs,
        })) as TimelineClip[];
      } catch {
        return null;
      }
    },
  };
}
