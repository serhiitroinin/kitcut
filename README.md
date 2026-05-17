# kitcut

Headless, unstyled React building blocks for **in-browser record → edit →
export**. Bring your own UI.

kitcut is a set of fine-grained packages you compose into a video creator
studio: capture sources, a timeline editing engine, a pluggable per-frame
effect pipeline, and a swappable export backend. No styling, no backend, no
vendor lock-in — every external concern is a port you implement.

**→ [serhiitroinin.github.io/kitcut](https://serhiitroinin.github.io/kitcut/)**

## Architecture — three ports, one core

| Port | Package | You implement |
|------|---------|---------------|
| **Input** | `@kitcut/recorder` | capture sources (camera, screen, paired phone) |
| **Processor** | `@kitcut/processor` | per-frame effects (gaze correction, background, watermark) |
| **Persistence** | `@kitcut/timeline-core` | load/save the timeline |
| **Output** | `@kitcut/export` | render the timeline to a file |

Everything else — clip/timeline state, history, silence detection, the headless
editor primitives — is framework-coupled (React) but free of any backend, UI
framework, or ML dependency.

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| [`@kitcut/processor`](./packages/processor) | scaffold | `VideoProcessor` plugin contract |
| [`@kitcut/export`](./packages/export) | scaffold | `ExportAdapter` port + client renderer |
| [`@kitcut/timeline-core`](./packages/timeline-core) | scaffold | timeline state + `PersistenceAdapter` |
| [`@kitcut/recorder`](./packages/recorder) | scaffold | headless capture + Input port |
| [`@kitcut/editor-react`](./packages/editor-react) | scaffold | headless editor primitives (BYO UI) |

`apps/demo` is a styled reference implementation. It is **not published** — it
exists so the headless packages are demoable.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
```

Requires Node >= 22 and pnpm 9.

## License

MIT © Serhii Troinin
