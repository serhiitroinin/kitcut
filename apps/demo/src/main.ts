/**
 * kitcut reference demo (placeholder).
 *
 * This app is the styled reference implementation of the headless packages:
 * the Tailwind layer extracted from Botley lands here so the BYO-UI packages
 * stay demoable. It is private and never published.
 */
import { passthroughProcessor } from "@kitcut/processor";
import { createInMemoryPersistence } from "@kitcut/timeline-core";

export function bootstrap(): void {
  const persistence = createInMemoryPersistence();
  // eslint-disable-next-line no-console
  console.log(
    `kitcut demo scaffold — processor "${passthroughProcessor.id}" ready,`,
    persistence ? "persistence wired." : "no persistence.",
  );
}
