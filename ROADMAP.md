# Roadmap

kitcut is being extracted from a production course-creation app and hardened
into standalone building blocks. Packages are scaffolded with their public
contracts first; behavior is filled in per block, in dependency order.

## Status

| Block | Package | State |
|-------|---------|-------|
| 1 | `@kitcut/processor` — plugin port | contract defined |
| 1 | `@kitcut/export` — adapter port | contract defined |
| 2 | `@kitcut/recorder` — capture + Input port | partial (camera/screen real, phone stub) |
| 3 | `@kitcut/timeline-core` — state + Persistence port | data model + port |
| 4 | `@kitcut/editor-react` — headless primitives | i18n + config seam |
| — | `@kitcut/demo` — styled reference app | placeholder |

## Principles

- **Headless.** No styling, no UI framework lock-in beyond React, no backend.
- **Ports, not integrations.** Input, Processor, Persistence, Output are
  interfaces the host implements. Core never imports a codec, an ML runtime,
  or a server client.
- **Contracts before behavior.** Each package ships its public types first so
  adopters can integrate against a stable seam while internals are filled in.

## Order

1. `processor` + `export` ports (interfaces only — unblock the seams)
2. `recorder` (proves Input + Processor end to end)
3. `timeline-core` (state engine behind the Persistence port)
4. `editor-react` (headless primitives, last — depends on the above)
