import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";
import useMetadataStore from "../stores/MetadataStore";
import {
  useTranslatedNodeMetadata,
  useAllTranslatedMetadata
} from "./useTranslatedNodeMetadata";
import type { NodeMetadata } from "../stores/ApiTypes";

/**
 * Read a catalog entry straight from the i18n resource bundle so the test
 * asserts against the same data the hook reads, without duplicating strings.
 * Importing the JSON directly breaks ts-jest's transform for this file.
 */
function catalogEntry(
  lng: string,
  nodeType: string
): { title: string; description: string } | undefined {
  const bundle = i18n.getResourceBundle(lng, "nodes");
  return bundle?.[nodeType];
}

/**
 * Two sample node types drive the assertions:
 *
 *  - `nodetool.text.Concat` — present in BOTH the en and zh-CN node catalogs
 *    (Task 8 seed batch). Its `properties` object is empty in both catalogs,
 *    so property-level lookups exercise the fallback path while title and
 *    description come from the active catalog.
 *
 *  - `test.synthetic.Node` — not present in any catalog. Every field falls
 *    back to the SAMPLE_META value under every language, which is the
 *    contract render sites rely on when a node ships without translations.
 *
 * Cast through `unknown` because `NodeMetadata` carries many required fields
 * the hook never reads; the fixture only shapes the fields under test.
 */
const SAMPLE_META = {
  "nodetool.text.Concat": {
    node_type: "nodetool.text.Concat",
    title: "Concat",
    description: "Concatenate text",
    namespace: "text",
    properties: [
      { name: "a", title: "A", description: "First text" },
      { name: "b", title: "B", description: "Second text" }
    ],
    outputs: []
  },
  "test.synthetic.Node": {
    node_type: "test.synthetic.Node",
    title: "Synthetic",
    description: "A synthetic node not in any catalog.",
    namespace: "test",
    properties: [{ name: "x", title: "X", description: "X value" }],
    outputs: []
  }
} as unknown as Record<string, NodeMetadata>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

describe("useTranslatedNodeMetadata", () => {
  beforeEach(async () => {
    useMetadataStore.getState().setMetadata(SAMPLE_META);
    await i18n.changeLanguage("en");
  });

  it("returns catalog English title/description when language is en", () => {
    const { result } = renderHook(
      () => useTranslatedNodeMetadata("nodetool.text.Concat"),
      { wrapper }
    );
    // en catalog has the title; SAMPLE_META's description is overridden by the
    // catalog's description. Property `a` is absent from the catalog, so the
    // SAMPLE_META value passes through.
    expect(result.current?.title).toBe("Concat");
    expect(result.current?.description).toBe(
      catalogEntry("en", "nodetool.text.Concat")!.description
    );
    expect(result.current?.properties[0].title).toBe("A");
    expect(result.current?.properties[0].description).toBe("First text");
  });

  it("returns translated title/description when language is zh-CN and translation exists", async () => {
    await i18n.changeLanguage("zh-CN");
    const { result } = renderHook(
      () => useTranslatedNodeMetadata("nodetool.text.Concat"),
      { wrapper }
    );
    expect(result.current?.title).toBe(
      catalogEntry("zh-CN", "nodetool.text.Concat")!.title
    );
    expect(result.current?.description).toBe(
      catalogEntry("zh-CN", "nodetool.text.Concat")!.description
    );
    // Concat ships no property translations in either catalog; SAMPLE_META wins.
    expect(result.current?.properties[0].title).toBe("A");
    expect(result.current?.properties[0].description).toBe("First text");
  });

  it("falls back to the store's original values when the node is absent from every catalog", async () => {
    await i18n.changeLanguage("zh-CN");
    const { result } = renderHook(
      () => useTranslatedNodeMetadata("test.synthetic.Node"),
      { wrapper }
    );
    expect(result.current?.title).toBe("Synthetic");
    expect(result.current?.description).toBe("A synthetic node not in any catalog.");
    expect(result.current?.properties[0].title).toBe("X");
    expect(result.current?.properties[0].description).toBe("X value");
  });

  it("returns undefined for an unknown node type", () => {
    const { result } = renderHook(
      () => useTranslatedNodeMetadata("nonexistent.Node"),
      { wrapper }
    );
    expect(result.current).toBeUndefined();
  });

  it("returns undefined for an undefined node type", () => {
    const { result } = renderHook(
      () => useTranslatedNodeMetadata(undefined),
      { wrapper }
    );
    expect(result.current).toBeUndefined();
  });

  it("does not mutate the store's metadata", async () => {
    await i18n.changeLanguage("zh-CN");
    renderHook(() => useTranslatedNodeMetadata("nodetool.text.Concat"), {
      wrapper
    });
    const stored = useMetadataStore.getState().metadata["nodetool.text.Concat"];
    expect(stored.title).toBe("Concat");
    expect(stored.description).toBe("Concatenate text");
    expect(stored.properties[0].title).toBe("A");
  });

  it("useAllTranslatedMetadata returns an array of all metadata", () => {
    const { result } = renderHook(() => useAllTranslatedMetadata(), {
      wrapper
    });
    expect(result.current).toHaveLength(2);
    const byType = Object.fromEntries(
      result.current.map((m) => [m.node_type, m])
    );
    expect(byType["nodetool.text.Concat"]).toBeDefined();
    expect(byType["test.synthetic.Node"]).toBeDefined();
  });

  it("useAllTranslatedMetadata returns translated titles under zh-CN and falls back for untranslated nodes", async () => {
    await i18n.changeLanguage("zh-CN");
    const { result } = renderHook(() => useAllTranslatedMetadata(), {
      wrapper
    });
    expect(result.current).toHaveLength(2);
    const byType = Object.fromEntries(
      result.current.map((m) => [m.node_type, m])
    );
    expect(byType["nodetool.text.Concat"].title).toBe(
      catalogEntry("zh-CN", "nodetool.text.Concat")!.title
    );
    // Untranslated node falls back to the store's original title.
    expect(byType["test.synthetic.Node"].title).toBe("Synthetic");
  });
});
