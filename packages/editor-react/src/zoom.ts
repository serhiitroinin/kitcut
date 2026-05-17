/** Pure timeline zoom math. Pixels-per-second is the single source of truth. */

export const MIN_PX_PER_SEC = 8;
export const MAX_PX_PER_SEC = 600;

export function clampZoom(pxPerSec: number): number {
  return Math.min(MAX_PX_PER_SEC, Math.max(MIN_PX_PER_SEC, pxPerSec));
}

export function msToPx(ms: number, pxPerSec: number): number {
  return (ms / 1000) * pxPerSec;
}

export function pxToMs(px: number, pxPerSec: number): number {
  return (px / pxPerSec) * 1000;
}

/** Multiplicative zoom step (e.g. factor 1.25 to zoom in). */
export function stepZoom(pxPerSec: number, factor: number): number {
  return clampZoom(pxPerSec * factor);
}
