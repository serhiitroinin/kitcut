/**
 * `@kitcut/recorder` — headless capture and the Input port.
 *
 * Capture is a port: a `CaptureProvider` knows how to acquire a `MediaStream`
 * for a given kind (camera, screen, paired phone). Hosts can supply their own
 * providers (e.g. a phone-pairing transport) without forking core.
 */

export type CaptureKind = "camera" | "screen" | "phone";

export interface CaptureConstraints {
  readonly kind: CaptureKind;
  readonly width?: number;
  readonly height?: number;
  readonly frameRate?: number;
  readonly audio?: boolean;
}

export interface CaptureSource {
  readonly kind: CaptureKind;
  readonly stream: MediaStream;
  stop(): void;
}

/** Knows how to acquire a stream for one capture kind. */
export interface CaptureProvider {
  readonly kind: CaptureKind;
  acquire(constraints: CaptureConstraints): Promise<CaptureSource>;
}

function stopAll(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

/** Camera/microphone capture via `getUserMedia`. */
export function createCameraProvider(): CaptureProvider {
  return {
    kind: "camera",
    async acquire(c) {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error(
          "@kitcut/recorder: getUserMedia is unavailable in this environment.",
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: c.width,
          height: c.height,
          frameRate: c.frameRate,
        },
        audio: c.audio ?? true,
      });
      return { kind: "camera", stream, stop: () => stopAll(stream) };
    },
  };
}

/** Screen/tab capture via `getDisplayMedia`. */
export function createScreenProvider(): CaptureProvider {
  return {
    kind: "screen",
    async acquire(c) {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error(
          "@kitcut/recorder: getDisplayMedia is unavailable in this environment.",
        );
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: c.frameRate },
        audio: c.audio ?? false,
      });
      return { kind: "screen", stream, stop: () => stopAll(stream) };
    },
  };
}

/**
 * Phone-as-webcam pairing transport. The signalling/transport implementation
 * lands during the `recorder` extraction block; this stub keeps the contract
 * importable so hosts can register the provider ahead of time.
 */
export function createPhoneProvider(): CaptureProvider {
  return {
    kind: "phone",
    async acquire() {
      throw new Error(
        "@kitcut/recorder: phone pairing is not implemented yet. " +
          "Register your own CaptureProvider for kind 'phone' until the recorder block lands.",
      );
    },
  };
}
