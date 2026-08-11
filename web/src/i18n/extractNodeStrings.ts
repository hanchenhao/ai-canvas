/**
 * Pure transformation from NodeMetadata[] to a sorted, serializable catalog
 * of user-facing strings (title, description, property title/description).
 *
 * Extracted from scripts/extract-node-strings.ts so it can be unit-tested in
 * web's jest scope — the script handles I/O and registry setup, this function
 * handles the shape. Run `npm run extract:nodes` to regenerate
 * web/src/locales/en/nodes.json from a live NodeRegistry.
 */
import type { NodeMetadata } from "../stores/ApiTypes";

export type PropertyStrings = {
  title?: string;
  description?: string;
};

export type NodeStrings = {
  title: string;
  description: string;
  properties: Record<string, PropertyStrings>;
};

export type NodeStringsCatalog = Record<string, NodeStrings>;

export function extractNodeStrings(
  metadata: readonly Pick<NodeMetadata, "node_type" | "title" | "description" | "properties">[]
): NodeStringsCatalog {
  const catalog: NodeStringsCatalog = {};
  for (const meta of metadata) {
    const props: Record<string, PropertyStrings> = {};
    const propNames = (meta.properties ?? [])
      .map((p) => p.name)
      .filter((n): n is string => Boolean(n))
      .sort();
    for (const name of propNames) {
      const p = meta.properties!.find((prop) => prop.name === name)!;
      props[name] = {
        title: p.title ?? undefined,
        description: p.description ?? undefined
      };
    }
    catalog[meta.node_type] = {
      title: meta.title,
      description: meta.description,
      properties: props
    };
  }
  const sorted: NodeStringsCatalog = {};
  for (const key of Object.keys(catalog).sort()) {
    sorted[key] = catalog[key];
  }
  return sorted;
}
