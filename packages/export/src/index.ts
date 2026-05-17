/**
 * `@kitcut/export` — the render/output port.
 *
 * The host decides *how* a timeline becomes a file: an in-browser renderer, a
 * server render service, an ffmpeg.wasm worker. kitcut only defines the
 * `ExportAdapter` contract and ships a bundled client renderer as the default.
 */

export interface ExportClip {
  readonly sourceUrl: string;
  /** Trim start within the source media, in ms. */
  readonly inMs: number;
  /** Trim end within the source media, in ms. */
  readonly outMs: number;
}

export interface ExportTimeline {
  readonly clips: readonly ExportClip[];
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

export interface ExportRequest {
  readonly timeline: ExportTimeline;
  readonly format: "mp4" | "webm";
}

export type ExportPhase =
  | "queued"
  | "rendering"
  | "muxing"
  | "uploading"
  | "done";

export interface ExportProgress {
  readonly phase: ExportPhase;
  /** 0..1 progress within the current phase. */
  readonly progress: number;
}

export interface ExportResult {
  readonly blob?: Blob;
  readonly url?: string;
  readonly durationMs: number;
}

export interface ExportOptions {
  readonly onProgress?: (progress: ExportProgress) => void;
  readonly signal?: AbortSignal;
}

/** Host-supplied render backend. Core never imports a codec or a server. */
export interface ExportAdapter {
  readonly id: string;
  export(
    request: ExportRequest,
    options?: ExportOptions,
  ): Promise<ExportResult>;
}

export {
  createClientRenderer,
  pickExportMimeType,
  totalTimelineDurationMs,
} from "./client-renderer";
