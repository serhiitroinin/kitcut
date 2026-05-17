# @kitcut/recorder

Headless capture and the Input port. A `CaptureProvider` acquires a
`MediaStream` for one kind — camera, screen, or paired phone.

```ts
import {
  createCameraProvider,
  createScreenProvider,
} from "@kitcut/recorder";

const camera = createCameraProvider();
const source = await camera.acquire({ kind: "camera", width: 1280, height: 720 });
// source.stream → preview / record; source.stop() when done
```

Phone pairing is a registerable provider — the signalling transport lands
during the `recorder` extraction block.

## License

MIT © Serhii Troinin
