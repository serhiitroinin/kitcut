/**
 * `@kitcut/processor` — the pluggable per-frame effect contract.
 *
 * Concrete processors (gaze correction, background replacement, watermark, …)
 * live OUTSIDE kitcut core and are injected by the host. Core never depends on
 * any concrete processor or ML runtime.
 */

/**
 * A source of pixel data for a single video frame. kitcut hands processors
 * whatever the host can cheaply provide; an `ImageBitmap` or canvas is
 * preferred for GPU-friendly pipelines.
 */
export type FrameSource =
  | ImageBitmap
  | OffscreenCanvas
  | HTMLCanvasElement
  | HTMLVideoElement;

export interface FrameContext {
  /** Frame width in pixels. */
  readonly width: number;
  /** Frame height in pixels. */
  readonly height: number;
  /** Presentation timestamp of this frame, in milliseconds. */
  readonly timestampMs: number;
  /** Monotonic frame index since the processor was initialized. */
  readonly frameIndex: number;
}

export interface VideoProcessorInit {
  readonly width: number;
  readonly height: number;
  /** Fired when the host tears the pipeline down. */
  readonly signal?: AbortSignal;
}

/**
 * A pluggable per-frame effect. Returning the input frame unchanged is a valid
 * no-op; implementations may mutate in place or return a new frame source.
 */
export interface VideoProcessor {
  /** Stable identifier, e.g. `"eye-contact"`. */
  readonly id: string;
  /** Human-readable name for UI/debugging. */
  readonly name: string;

  /** Allocate models/buffers. Called once before the first frame. */
  init?(init: VideoProcessorInit): Promise<void> | void;

  /** Transform one frame. */
  process(
    input: FrameSource,
    ctx: FrameContext,
  ): Promise<FrameSource> | FrameSource;

  /** Release resources. Called once on teardown. */
  dispose?(): Promise<void> | void;
}

/** A no-op processor. Default, and a reference for the contract. */
export const passthroughProcessor: VideoProcessor = {
  id: "passthrough",
  name: "Passthrough",
  process: (input) => input,
};

/** Run an ordered list of processors as a single pipeline. */
export function composeProcessors(
  processors: readonly VideoProcessor[],
  meta: { id?: string; name?: string } = {},
): VideoProcessor {
  return {
    id: meta.id ?? "pipeline",
    name: meta.name ?? "Pipeline",
    async init(init) {
      for (const p of processors) await p.init?.(init);
    },
    async process(input, ctx) {
      let frame = input;
      for (const p of processors) frame = await p.process(frame, ctx);
      return frame;
    },
    async dispose() {
      for (const p of processors) await p.dispose?.();
    },
  };
}
