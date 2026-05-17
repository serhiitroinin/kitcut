/**
 * `@kitcut/editor-react` — headless editor hooks. Bring your own UI.
 *
 * No styling, no Tailwind, no design system: the timeline engine + transport +
 * zoom, plus an injectable translator. Wire the values into your own
 * components.
 */
import type { PersistenceAdapter } from "@kitcut/timeline-core";
import type { Translate } from "./translate";

export { useEditor, type UseEditorOptions, type EditorApi } from "./use-editor";
export { EditorProvider, useTranslate, type EditorProviderProps } from "./context";
export { defaultTranslate, type Translate } from "./translate";
export {
  msToPx,
  pxToMs,
  clampZoom,
  stepZoom,
  MIN_PX_PER_SEC,
  MAX_PX_PER_SEC,
} from "./zoom";

export type {
  TimelineClip,
  PersistenceAdapter,
  SaveStatus,
} from "@kitcut/timeline-core";

export interface EditorConfig {
  persistence: PersistenceAdapter;
  t?: Translate;
}
