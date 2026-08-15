import i18n from "i18next";

interface ExampleEntry {
  name?: string;
  description?: string;
}

/**
 * Look up a shipped example workflow's locale entry. Entries live in the
 * `examples` namespace keyed by the raw English name as a single flat key
 * (keySeparator off), each holding `{name, description}`; anything without a
 * translation falls back to the original English strings.
 */
const lookup = (name: string): ExampleEntry | null =>
  i18n.t(name, {
    ns: "examples",
    keySeparator: false,
    returnObjects: true,
    defaultValue: null
  }) as unknown as ExampleEntry | null;

/** Localized display name for a shipped example workflow. */
export const translateExample = (name: string): string =>
  lookup(name)?.name ?? name;

/** Localized description for a shipped example workflow, keyed by its name. */
export const translateExampleDescription = (
  name: string,
  description: string
): string => {
  if (!description) {
    return description;
  }
  return lookup(name)?.description ?? description;
};
