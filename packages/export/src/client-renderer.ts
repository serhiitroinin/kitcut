/**
 * A real in-browser {@link ExportAdapter}: plays the timeline clip-by-clip
 * through a canvas and encodes it with `MediaRecorder`.
 *
 * Scope is honest: sequential clips, real-time playback, WebM out. Frame-exact
 * / faster-than-realtime rendering is a WebCodecs follow-up — hosts that need
 * it inject a server adapter instead.
 */
import type {
  ExportAdapter,
  ExportRequest,
  ExportResult,
  ExportOptions,
} from "./index";

const MIME_PREFERENCE = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

export function pickExportMimeType(
  isSupported: (type: string) => boolean = (t) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t),
): string {
  for (const t of MIME_PREFERENCE) if (isSupported(t)) return t;
  return "video/webm";
}

export function totalTimelineDurationMs(req: ExportRequest): number {
  return req.timeline.clips.reduce((sum, c) => sum + (c.outMs - c.inMs), 0);
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error(`@kitcut/export: failed to load ${url}`));
  });
}

function seek(v: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      v.removeEventListener("seeked", done);
      resolve();
    };
    v.addEventListener("seeked", done);
    v.currentTime = timeSec;
  });
}

/** The default bundled client renderer. */
export function createClientRenderer(): ExportAdapter {
  return {
    id: "client-renderer",
    async export(request: ExportRequest, options: ExportOptions = {}): Promise<ExportResult> {
      const { onProgress, signal } = options;
      const { width, height, fps, clips } = request.timeline;
      if (clips.length === 0) throw new Error("@kitcut/export: empty timeline.");

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("@kitcut/export: 2D context unavailable.");

      const mime = pickExportMimeType();
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      const stopped = new Promise<void>((res) => (recorder.onstop = () => res()));

      const total = totalTimelineDurationMs(request);
      let elapsed = 0;
      const startedAt = performance.now();
      recorder.start();
      onProgress?.({ phase: "rendering", progress: 0 });

      try {
        for (const clip of clips) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          const video = await loadVideo(clip.sourceUrl);
          await seek(video, clip.inMs / 1000);
          await video.play();
          const endSec = clip.outMs / 1000;

          await new Promise<void>((resolve, reject) => {
            const tick = () => {
              if (signal?.aborted) {
                reject(new DOMException("Aborted", "AbortError"));
                return;
              }
              if (video.currentTime >= endSec || video.ended) {
                video.pause();
                resolve();
                return;
              }
              ctx.drawImage(video, 0, 0, width, height);
              const clipElapsed = (video.currentTime - clip.inMs / 1000) * 1000;
              onProgress?.({
                phase: "rendering",
                progress: Math.min(1, (elapsed + clipElapsed) / total),
              });
              requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });

          elapsed += clip.outMs - clip.inMs;
          video.src = "";
        }
      } finally {
        recorder.stop();
        await stopped;
      }

      onProgress?.({ phase: "done", progress: 1 });
      const blob = new Blob(chunks, { type: mime });
      return {
        blob,
        url: URL.createObjectURL(blob),
        durationMs: Math.round(performance.now() - startedAt),
      };
    },
  };
}
