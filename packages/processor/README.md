# @kitcut/processor

The pluggable per-frame effect contract for kitcut.

Concrete processors — gaze correction, background replacement, watermarking —
live **outside** kitcut core and are injected by the host. Core never depends
on any ML runtime or concrete effect.

```ts
import { type VideoProcessor, composeProcessors } from "@kitcut/processor";

const watermark: VideoProcessor = {
  id: "watermark",
  name: "Watermark",
  process(frame, ctx) {
    // draw onto frame using ctx.width / ctx.height …
    return frame;
  },
};

const pipeline = composeProcessors([watermark]);
```

## License

MIT © Serhii Troinin
