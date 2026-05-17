# Contributing

## Setup

```bash
pnpm install
pnpm build
```

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/).
  Use a package scope, e.g. `feat(export): add WebCodecs renderer`,
  `fix(timeline-core): clamp clip trim to source bounds`.
- **Packages are headless**: no styling, no UI framework lock-in beyond React,
  no backend. External concerns are ports — keep them that way.
- **Public API changes** require a changeset and a typecheck-clean build:
  `pnpm typecheck && pnpm build`.

## Project layout

```
packages/
  processor/      VideoProcessor plugin port
  export/         ExportAdapter port + client renderer
  timeline-core/  timeline state + PersistenceAdapter port
  recorder/       headless capture + Input port
  editor-react/   headless editor primitives
apps/
  demo/           styled reference app (not published)
```
