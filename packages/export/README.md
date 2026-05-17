# @kitcut/export

The render/output port for kitcut. The host decides *how* a timeline becomes a
file — an in-browser renderer, a server render service, an ffmpeg.wasm worker.

```ts
import { type ExportAdapter, createClientRenderer } from "@kitcut/export";

// Default: bundled in-browser renderer (stub until the export block lands).
const renderer = createClientRenderer();

// Or inject your own — e.g. a server-render adapter:
const serverRender: ExportAdapter = {
  id: "server",
  async export(request, options) {
    // POST request to your render service, stream progress …
    return { url: "https://…/out.mp4", durationMs: 0 };
  },
};
```

## License

MIT © Serhii Troinin
