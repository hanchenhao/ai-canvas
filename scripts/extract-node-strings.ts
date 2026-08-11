/**
 * Scans all registered node packages and dumps the user-facing strings
 * (title, description, property title, property description) per node type
 * to web/src/locales/en/nodes.json. That file is the source catalog for
 * translators; the zh-CN counterpart is hand-translated.
 *
 * Run: `npm run extract:nodes`
 * (or: `NODE_OPTIONS='--conditions=nodetool-dev' npx tsx scripts/extract-node-strings.ts`)
 *
 * Output is sorted by node_type, then each node's properties are sorted by
 * property name, so repeated runs produce a stable diff (idempotent).
 *
 * NOTE: `bootstrapNodeRegistry` is loaded with a dynamic import() inside main()
 * rather than a top-level static import. A static import pulls
 * `@nodetool-ai/node-sdk` into tsx's esbuild bundle pass, and the dist build
 * of node-sdk uses top-level `await` for lazy node-builtin loading, which
 * esbuild rejects under its CJS output format. Dynamic import keeps the dist
 * chain on Node's native ESM loader (which handles the TLA fine). The
 * `--conditions=nodetool-dev` flag (set by the npm script) makes the websocket
 * package resolve its sub-imports to source the same way `dev:nodetool` does.
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Minimal local shape of the metadata we read. We avoid importing the real
// `NodeMetadata` type from node-sdk at the top level for the same reason we
// avoid `bootstrapNodeRegistry` — it pulls the dist chain into tsx's bundle.
type NodeMetadata = {
  node_type: string;
  title: string;
  description: string;
  properties?: Array<{
    name?: string;
    title?: string | null;
    description?: string | null;
  }>;
};

type NodeRegistryLike = {
  listMetadata(): readonly NodeMetadata[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(
  __dirname,
  "..",
  "web",
  "src",
  "locales",
  "en",
  "nodes.json"
);

type PropertyStrings = {
  title?: string | null;
  description?: string | null;
};

type NodeStrings = {
  title: string;
  description: string;
  properties: Record<string, PropertyStrings>;
};

type NodeStringsCatalog = Record<string, NodeStrings>;

function extract(metadata: readonly NodeMetadata[]): NodeStringsCatalog {
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
  return catalog;
}

async function main(): Promise<void> {
  // Dynamic import keeps node-sdk's dist chain on Node's native ESM loader
  // (top-level await safe) instead of tsx's esbuild bundler (which is not).
  const websocketSetup = await import(
    "../packages/websocket/src/node-registry-setup.ts"
  );
  const registry: NodeRegistryLike = await websocketSetup.bootstrapNodeRegistry();
  const all = registry.listMetadata();
  const extracted = extract(all);

  // Sort top-level keys for a stable diff.
  const sorted: NodeStringsCatalog = {};
  for (const key of Object.keys(extracted).sort()) {
    sorted[key] = extracted[key];
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
  console.log(`Wrote ${Object.keys(sorted).length} nodes to ${OUTPUT_PATH}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
