# @kitcut/editor-react

Headless React editor primitives. **Bring your own UI** — no styling, no
Tailwind, no design system. Radix-style slot components + hooks driven by
`@kitcut/timeline-core`.

```ts
import { type EditorConfig, defaultTranslate } from "@kitcut/editor-react";
import { createInMemoryPersistence } from "@kitcut/timeline-core";

const config: EditorConfig = {
  persistence: createInMemoryPersistence(),
  t: defaultTranslate, // or your own translator
};
```

The full primitive set lands during the `editor-react` extraction block. See
`apps/demo` for a styled reference implementation.

## License

MIT © Serhii Troinin
