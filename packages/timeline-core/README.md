# @kitcut/timeline-core

The clip/timeline state engine. Persistence is a port — core never imports a
backend.

```ts
import {
  type PersistenceAdapter,
  createInMemoryPersistence,
  timelineDurationMs,
} from "@kitcut/timeline-core";

const persistence: PersistenceAdapter = createInMemoryPersistence();
```

The React state hooks (`useTimeline`, history, silence detection) land during
the `timeline-core` extraction block and will sit behind this
`PersistenceAdapter` seam.

## License

MIT © Serhii Troinin
