import { describe, expect, it, vi } from "vitest";
import { composeProcessors, passthroughProcessor, type VideoProcessor } from "./index";

const ctx = { width: 2, height: 2, timestampMs: 0, frameIndex: 0 };

function tagProcessor(id: string, log: string[]): VideoProcessor {
  return {
    id,
    name: id,
    init: vi.fn(),
    dispose: vi.fn(),
    process: (frame) => {
      log.push(id);
      return frame;
    },
  };
}

describe("passthroughProcessor", () => {
  it("returns the input frame unchanged", () => {
    const frame = {} as never;
    expect(passthroughProcessor.process(frame, ctx)).toBe(frame);
  });
});

describe("composeProcessors", () => {
  it("runs processors in order and threads the frame", async () => {
    const log: string[] = [];
    const pipe = composeProcessors([
      tagProcessor("a", log),
      tagProcessor("b", log),
      tagProcessor("c", log),
    ]);
    const frame = { id: 1 } as never;
    const out = await pipe.process(frame, ctx);
    expect(log).toEqual(["a", "b", "c"]);
    expect(out).toBe(frame);
  });

  it("propagates init and dispose to every processor", async () => {
    const a = tagProcessor("a", []);
    const b = tagProcessor("b", []);
    const pipe = composeProcessors([a, b], { id: "p", name: "P" });
    await pipe.init?.({ width: 10, height: 10 });
    await pipe.dispose?.();
    expect(a.init).toHaveBeenCalledOnce();
    expect(b.dispose).toHaveBeenCalledOnce();
    expect(pipe.id).toBe("p");
  });
});
