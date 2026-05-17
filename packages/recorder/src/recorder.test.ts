import { describe, expect, it } from "vitest";
import { pickMimeType } from "./recorder";

describe("pickMimeType", () => {
  it("prefers vp9/opus webm when supported", () => {
    expect(pickMimeType(() => true)).toBe("video/webm;codecs=vp9,opus");
  });
  it("falls back through the preference list", () => {
    const only = (t: string) => t === "video/mp4";
    expect(pickMimeType(only)).toBe("video/mp4");
  });
  it("defaults to plain webm when nothing matches", () => {
    expect(pickMimeType(() => false)).toBe("video/webm");
  });
});
