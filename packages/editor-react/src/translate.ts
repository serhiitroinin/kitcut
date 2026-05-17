/**
 * Injectable translator. kitcut ships an English passthrough; hosts pass their
 * own. Core never depends on an i18n framework.
 */
export type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

/** Returns the key, interpolating `{var}` tokens against `vars`. */
export const defaultTranslate: Translate = (key, vars) =>
  vars
    ? key.replace(/\{(\w+)\}/g, (_, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      )
    : key;
