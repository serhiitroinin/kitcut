/**
 * A real per-frame pipeline: pulls frames off a source `<video>`, draws them
 * to a canvas, runs each {@link VideoProcessor} in order, and exposes the
 * result as a canvas / `MediaStream`. This is what `@kitcut/recorder` and
 * `@kitcut/export` drive.
 */
import type { FrameContext, VideoProcessor } from "./index";

export interface FramePipelineOptions {
  /** Playing/streaming source. */
  source: HTMLVideoElement;
  processors?: readonly VideoProcessor[];
  /** Output frame rate cap. Default 30. */
  fps?: number;
}

export class FramePipeline {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly source: HTMLVideoElement;
  private readonly processors: readonly VideoProcessor[];
  private readonly frameMs: number;
  private running = false;
  private frameIndex = 0;
  private lastDraw = 0;
  private raf = 0;
  private started = false;

  constructor(opts: FramePipelineOptions) {
    this.source = opts.source;
    this.processors = opts.processors ?? [];
    this.frameMs = 1000 / (opts.fps ?? 30);
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("@kitcut/processor: 2D canvas context unavailable.");
    this.ctx = ctx;
  }

  private size(): void {
    const w = this.source.videoWidth || this.canvas.width || 1280;
    const h = this.source.videoHeight || this.canvas.height || 720;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.size();
    if (!this.started) {
      const init = { width: this.canvas.width, height: this.canvas.height };
      for (const p of this.processors) await p.init?.(init);
      this.started = true;
    }
    this.running = true;
    this.lastDraw = 0;
    const loop = (t: number) => {
      if (!this.running) return;
      if (t - this.lastDraw >= this.frameMs) {
        this.lastDraw = t;
        void this.renderFrame(t);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private async renderFrame(timestampMs: number): Promise<void> {
    this.size();
    this.ctx.drawImage(this.source, 0, 0, this.canvas.width, this.canvas.height);
    if (this.processors.length === 0) return;
    const ctx: FrameContext = {
      width: this.canvas.width,
      height: this.canvas.height,
      timestampMs,
      frameIndex: this.frameIndex++,
    };
    for (const p of this.processors) {
      // Processors draw onto / return a frame; we keep one backing canvas.
      await p.process(this.canvas, ctx);
    }
  }

  /** A live `MediaStream` of the processed output. */
  captureStream(fps?: number): MediaStream {
    return this.canvas.captureStream(fps ?? 1000 / this.frameMs);
  }

  async stop(): Promise<void> {
    this.running = false;
    cancelAnimationFrame(this.raf);
    for (const p of this.processors) await p.dispose?.();
    this.started = false;
  }
}
