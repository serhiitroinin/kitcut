/**
 * `@kitcut/editor-react` — headless editor primitives. Bring your own UI.
 *
 * No styling, no Tailwind, no design system. This package will expose
 * Radix-style slot components and hooks driven by `@kitcut/timeline-core`.
 * The full primitives land during the `editor-react` extraction block; this
 * scaffold pins the two cross-cutting contracts decided up front: the
 * injectable translator and the editor config seam.
 */

import type { PersistenceAdapter, TimelineState } from "@kitcut/timeline-core";

export type { TimelineState, PersistenceAdapter };

/**
 * Injectable translator. kitcut ships an English default; hosts (e.g. Botley)
 * pass their own. Core never depends on an i18n framework.
 */
export type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

/** Minimal English default: returns the key, interpolating `{var}` tokens. */
export const defaultTranslate: Translate = (key, vars) =>
  vars
    ? key.replace(/\{(\w+)\}/g, (_, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      )
    : key;

export interface EditorConfig {
  /** Where the timeline is loaded from / saved to. */
  readonly persistence: PersistenceAdapter;
  /** Optional translator; defaults to English passthrough. */
  readonly t?: Translate;
}

export const EDITOR_REACT_VERSION = "0.0.0";
