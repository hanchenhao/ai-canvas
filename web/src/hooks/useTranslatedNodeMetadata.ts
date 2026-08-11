import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useMetadataStore from "../stores/MetadataStore";
import type { NodeMetadata, Property } from "../stores/ApiTypes";

/**
 * The `nodes` i18n namespace holds catalog translations keyed by node type
 * (e.g. `nodetool.text.Concat.title`). See `web/src/locales/{en,zh-CN}/nodes.json`.
 */
const NODES_NAMESPACE = "nodes";

/**
 * Call `t` for a node-scoped key and return `{ value, hit }`, where `hit` is
 * false when i18next could not resolve the key in the active language or the
 * fallback language. In that case `value` is the raw key (with the `nodes:`
 * namespace prefix stripped, per i18next's missing-key behaviour) and the
 * caller should fall back to the original English value.
 *
 * We cannot use `t.exists(key)` directly because the `t` from
 * `useTranslation()` does not expose it; instead we detect the missing-key
 * return value by comparing against both the full key and the key with the
 * `nodes:` prefix removed (i18next strips the namespace separator from the
 * returned missing-key string).
 */
function lookup(
  t: (key: string) => string,
  suffix: string,
  nodeType: string,
  propName?: string
): { value: string; hit: boolean } {
  const key =
    propName === undefined
      ? `${NODES_NAMESPACE}:${nodeType}.${suffix}`
      : `${NODES_NAMESPACE}:${nodeType}.properties.${propName}.${suffix}`;
  const value = t(key);
  // i18next strips the `ns:` prefix from the missing-key return value, so
  // compare against both shapes.
  const stripped = key.slice(`${NODES_NAMESPACE}:`.length);
  const hit = value !== key && value !== stripped;
  return { value, hit };
}

/**
 * Translate a single property's title/description for the given node type,
 * falling back to the original English value when no translation exists.
 * Returns a shallow copy; the input property is not mutated.
 */
function translateProperty(
  prop: Property,
  t: (key: string) => string,
  nodeType: string
): Property {
  if (!prop.name) return prop;
  const title = lookup(t, "title", nodeType, prop.name);
  const desc = lookup(t, "description", nodeType, prop.name);
  return {
    ...prop,
    title: title.hit ? title.value : prop.title,
    description: desc.hit ? desc.value : prop.description
  };
}

/**
 * Translate a NodeMetadata's title, description, and property
 * titles/descriptions per the active i18n language. Falls back to the original
 * values when a translation is missing. Returns a shallow copy; the input
 * metadata is not mutated.
 */
function translateNode(
  meta: NodeMetadata,
  t: (key: string) => string
): NodeMetadata {
  const title = lookup(t, "title", meta.node_type);
  const desc = lookup(t, "description", meta.node_type);
  const properties = meta.properties?.map((p) =>
    translateProperty(p, t, meta.node_type)
  );
  return {
    ...meta,
    title: title.hit ? title.value : meta.title,
    description: desc.hit ? desc.value : meta.description,
    properties
  };
}

/**
 * Look up a single node's metadata and return a shallow copy with its
 * title/description and property titles/descriptions translated per the active
 * i18n language. Returns `undefined` when `nodeType` is falsy or absent from
 * the store. Original English values are kept when a translation is missing.
 *
 * The store's metadata is never mutated — every field that changes is
 * shallow-copied.
 */
export function useTranslatedNodeMetadata(
  nodeType: string | undefined
): NodeMetadata | undefined {
  const metadata = useMetadataStore((s) => s.metadata);
  const { t } = useTranslation();

  return useMemo(() => {
    if (!nodeType) return undefined;
    const meta = metadata[nodeType];
    if (!meta) return undefined;
    return translateNode(meta, t);
  }, [nodeType, metadata, t]);
}

/**
 * Return every node's metadata as an array, each entry a translated shallow
 * copy per the active i18n language. Original English values are kept when a
 * translation is missing.
 *
 * Multiple components can call this hook; the translated array is computed
 * once per (metadata identity, language) pair and shared across callers via
 * a module-level cache — translating ~3000 nodes per render adds up when
 * several panels do it independently.
 */
let cachedAllMetadata: Record<string, NodeMetadata> | null = null;
let cachedAllLanguage: string | null = null;
let cachedAllResult: NodeMetadata[] = [];

export function useAllTranslatedMetadata(): NodeMetadata[] {
  const metadata = useMetadataStore((s) => s.metadata);
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return useMemo(() => {
    if (cachedAllMetadata === metadata && cachedAllLanguage === lang) {
      return cachedAllResult;
    }
    cachedAllMetadata = metadata;
    cachedAllLanguage = lang;
    cachedAllResult = Object.values(metadata).map((m) => translateNode(m, t));
    return cachedAllResult;
  }, [metadata, t, lang]);
}
