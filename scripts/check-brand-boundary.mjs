import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = [
  "web/src",
  "web/public",
  "web/index.html",
  "web/admin.html",
  "web/app-preview.html",
  "web/demo.html",
  "web/e2e-runner.html",
  "electron/src",
  "scripts",
  "packages"
];
const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".py",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);
const FORBIDDEN = [
  /https?:\/\/([a-z0-9-]+\.)*nodetool\.ai\b/gi,
  /https?:\/\/github\.com\/nodetool-ai\b/gi,
  /https?:\/\/discord\.gg\/WmQTWZRcYE\b/gi
];

// Historical schema IDs are protocol identifiers. Changing them would be a
// compatibility migration, not a product-link cleanup.
const ALLOWED_COMPATIBILITY_FILES = new Set([
  "packages/protocol/scripts/generate-processing-messages-schema.ts",
  "packages/protocol/scripts/generate-sdk-protocol.ts",
  "packages/protocol/schema/sdk-v1.discovery.schema.json",
  "packages/protocol/schema/sdk-v1.lifecycle.schema.json"
]);

function shouldSkip(relativePath, dirent) {
  const parts = relativePath.split(path.sep);
  if (
    parts.includes("node_modules") ||
    parts.includes("dist") ||
    parts.includes("__tests__") ||
    parts.includes("__snapshots__") ||
    parts.includes("demo")
  ) {
    return true;
  }
  if (dirent.isDirectory()) return false;
  if (ALLOWED_COMPATIBILITY_FILES.has(relativePath)) return true;
  if (path.basename(relativePath) === "package.json") return true;
  return (
    relativePath.endsWith(".test.ts") ||
    relativePath.endsWith(".test.tsx") ||
    relativePath.endsWith(".spec.ts") ||
    relativePath.endsWith(".spec.tsx") ||
    !SOURCE_EXTENSIONS.has(path.extname(relativePath))
  );
}

async function collect(relativeDirectory) {
  const absolutePath = path.join(ROOT, relativeDirectory);
  const rootStat = await stat(absolutePath);
  if (rootStat.isFile()) return [relativeDirectory];
  const entries = await readdir(path.join(ROOT, relativeDirectory), {
    withFileTypes: true
  });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (shouldSkip(relativePath, entry)) continue;
    if (entry.isDirectory()) {
      files.push(...(await collect(relativePath)));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

const violations = [];
for (const scanRoot of SCAN_ROOTS) {
  const files = await collect(scanRoot);
  for (const relativePath of files) {
    const content = await readFile(path.join(ROOT, relativePath), "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of FORBIDDEN) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(
    "Upstream product links are not allowed in BrainVite-AI-Canvas runtime code:\n" +
      violations.map((line) => `- ${line}`).join("\n")
  );
  process.exitCode = 1;
} else {
  console.log("BrainVite-AI-Canvas runtime brand boundary is clean.");
}
