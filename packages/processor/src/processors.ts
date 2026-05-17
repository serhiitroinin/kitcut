/**
 * Reference processors. Real, usable, and a worked example of the contract —
 * heavy ML processors (gaze, background) live in host code, not here.
 */
import type { FrameContext, FrameSource, VideoProcessor } from "./index";

export type Corner = "tl" | "tr" | "bl" | "br";

export interface WatermarkOptions {
  text: string;
  corner?: Corner;
  /** Fraction of canvas height. Default 0.045. */
  scale?: number;
  color?: string;
  opacity?: number;
  marginPx?: number;
}

function ctx2d(frame: FrameSource): CanvasRenderingContext2D | null {
  if (
    typeof HTMLCanvasElement !== "undefined" &&
    frame instanceof HTMLCanvasElement
  ) {
    return frame.getContext("2d");
  }
  return null;
}

/** Draws a text watermark into a corner of the frame. */
export function createWatermarkProcessor(opts: WatermarkOptions): VideoProcessor {
  const {
    text,
    corner = "br",
    scale = 0.045,
    color = "#ffffff",
    opacity = 0.85,
    marginPx = 24,
  } = opts;

  return {
    id: "watermark",
    name: "Watermark",
    process(frame: FrameSource, c: FrameContext) {
      const ctx = ctx2d(frame);
      if (!ctx) return frame;
      const fontPx = Math.max(12, Math.round(c.height * scale));
      ctx.save();
      ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.shadowBlur = Math.round(fontPx / 4);
      const w = ctx.measureText(text).width;
      const left = corner === "tl" || corner === "bl";
      const top = corner === "tl" || corner === "tr";
      const x = left ? marginPx : c.width - w - marginPx;
      const y = top ? marginPx + fontPx : c.height - marginPx;
      ctx.fillText(text, x, y);
      ctx.restore();
      return frame;
    },
  };
}

/** Mirrors the frame horizontally (selfie-style). */
export function createMirrorProcessor(): VideoProcessor {
  return {
    id: "mirror",
    name: "Mirror",
    process(frame: FrameSource, c: FrameContext) {
      const ctx = ctx2d(frame);
      if (!ctx || !(frame instanceof HTMLCanvasElement)) return frame;
      const tmp = document.createElement("canvas");
      tmp.width = c.width;
      tmp.height = c.height;
      tmp.getContext("2d")?.drawImage(frame, 0, 0);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(tmp, -c.width, 0);
      ctx.restore();
      return frame;
    },
  };
}
