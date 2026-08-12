/**
 * Periodic cleanup of orphaned temp files.
 *
 * Generation pipelines write intermediate artifacts (downloaded provider
 * images, transcoded clips, upload fragments) to a temp directory. Without
 * cleanup the directory grows unbounded on a local desktop install.
 *
 * This module scans the temp directory and removes files older than a
 * configurable retention period. It does NOT touch files in the asset store
 * — those are referenced by projects and must survive cleanup.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export interface CleanupOptions {
  /** Directory to scan (defaults to os.tmpdir() + "/brainvite"). */
  tempDir?: string;
  /** Files older than this (ms) are removed. Default: 24h. */
  maxAgeMs?: number;
  /** Remove this many files max per run (bounds I/O on large dirs). Default: 500. */
  maxFilesPerRun?: number;
}

export interface CleanupResult {
  scanned: number;
  removed: number;
  freedBytes: number;
  errors: string[];
}

const DEFAULT_TEMP_SUBDIR = "brainvite";
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_FILES = 500;

export function getTempDir(override?: string): string {
  if (override) return override;
  return path.join(
    process.env.TMPDIR || "/tmp",
    DEFAULT_TEMP_SUBDIR
  );
}

export async function cleanupTempFiles(
  options?: CleanupOptions
): Promise<CleanupResult> {
  const tempDir = options?.tempDir ?? getTempDir();
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const maxFiles = options?.maxFilesPerRun ?? DEFAULT_MAX_FILES;
  const now = Date.now();
  const result: CleanupResult = { scanned: 0, removed: 0, freedBytes: 0, errors: [] };

  let entries: string[];
  try {
    entries = await fs.readdir(tempDir);
  } catch {
    // Directory doesn't exist — nothing to clean.
    return result;
  }

  for (const entry of entries) {
    if (result.scanned >= maxFiles) break;
    const filePath = path.join(tempDir, entry);
    result.scanned++;

    try {
      const stat = await fs.stat(filePath);
      const ageMs = now - stat.mtimeMs;
      if (ageMs < maxAgeMs) continue;

      const size = stat.size;
      await fs.unlink(filePath);
      result.removed++;
      result.freedBytes += size;
    } catch (err) {
      result.errors.push(
        `${entry}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

/**
 * Run cleanup on a fixed interval. Returns a stop function.
 * Call this from the server startup sequence (not the renderer).
 */
export function startTempCleanup(
  intervalMs: number = 60 * 60 * 1000,
  options?: CleanupOptions
): () => void {
  const timer = setInterval(() => {
    cleanupTempFiles(options).catch(() => {
      // Cleanup errors are non-fatal; log and move on.
    });
  }, intervalMs);
  return () => clearInterval(timer);
}
