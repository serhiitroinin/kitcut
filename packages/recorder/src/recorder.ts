/**
 * The recording engine: a {@link CaptureSource} → optional processor pipeline →
 * `MediaRecorder` → `Blob`. Real, browser-grade, with pause/resume and
 * accurate duration accounting.
 */
import { FramePipeline, type VideoProcessor } from "@kitcut/processor";
import type { CaptureSource } from "./index";

const MIME_PREFERENCE = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9",
  "video/webm",
  "video/mp4",
] as const;

/** First supported recording MIME type. `isSupported` is injectable for tests. */
export function pickMimeType(
  isSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
): string {
  for (const type of MIME_PREFERENCE) if (isSupported(type)) return type;
  return "video/webm";
}

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

export interface RecorderOptions {
  source: CaptureSource;
  processors?: readonly VideoProcessor[];
  fps?: number;
  mimeType?: string;
  videoBitsPerSecond?: number;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
}

export class Recorder {
  private readonly opts: RecorderOptions;
  private video: HTMLVideoElement | null = null;
  private pipeline: FramePipeline | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mime = "video/webm";
  private startedAt = 0;
  private accumulatedMs = 0;
  private pausedAt = 0;
  private _state: RecorderState = "idle";

  constructor(opts: RecorderOptions) {
    this.opts = opts;
  }

  get state(): RecorderState {
    return this._state;
  }

  get durationMs(): number {
    if (this._state === "recording") {
      return this.accumulatedMs + (performance.now() - this.startedAt);
    }
    return this.accumulatedMs;
  }

  async start(): Promise<void> {
    if (this._state === "recording") return;
    const { source, processors = [], fps = 30 } = this.opts;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = source.stream;
    await video.play();
    this.video = video;

    const pipeline = new FramePipeline({ source: video, processors, fps });
    await pipeline.start();
    this.pipeline = pipeline;

    const videoTrack = pipeline.captureStream(fps).getVideoTracks()[0];
    const audioTracks = source.stream.getAudioTracks();
    const recordStream = new MediaStream(
      videoTrack ? [videoTrack, ...audioTracks] : audioTracks,
    );

    this.mime = this.opts.mimeType ?? pickMimeType();
    const recorder = new MediaRecorder(recordStream, {
      mimeType: this.mime,
      ...(this.opts.videoBitsPerSecond
        ? { videoBitsPerSecond: this.opts.videoBitsPerSecond }
        : {}),
    });
    this.chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    recorder.start(1000);
    this.recorder = recorder;

    this.accumulatedMs = 0;
    this.startedAt = performance.now();
    this._state = "recording";
  }

  pause(): void {
    if (this._state !== "recording" || !this.recorder) return;
    this.recorder.pause();
    this.accumulatedMs += performance.now() - this.startedAt;
    this.pausedAt = performance.now();
    this._state = "paused";
  }

  resume(): void {
    if (this._state !== "paused" || !this.recorder) return;
    this.recorder.resume();
    this.startedAt = performance.now();
    void this.pausedAt;
    this._state = "recording";
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recorder) throw new Error("@kitcut/recorder: not recording.");
    if (this._state === "recording") {
      this.accumulatedMs += performance.now() - this.startedAt;
    }
    const recorder = this.recorder;
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;
    await this.pipeline?.stop();
    this.video?.pause();
    if (this.video) this.video.srcObject = null;

    const blob = new Blob(this.chunks, { type: this.mime });
    this._state = "stopped";
    return {
      blob,
      url: URL.createObjectURL(blob),
      durationMs: Math.round(this.accumulatedMs),
      mimeType: this.mime,
    };
  }

  /** Stops capture tracks. Call when fully done with the source. */
  dispose(): void {
    this.opts.source.stop();
    this.pipeline = null;
    this.recorder = null;
    this.video = null;
  }
}
