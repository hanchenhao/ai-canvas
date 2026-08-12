/**
 * Classified storage errors for the local desktop runtime.
 *
 * Wraps raw Node.js errno codes and network failures into actionable
 * categories the frontend can show meaningful messages for.
 */

export type StorageErrorKind =
  | "disk_full"
  | "permission_denied"
  | "network"
  | "not_found"
  | "provider_unavailable"
  | "unknown";

const ENOSPC_CODES = new Set(["ENOSPC"]);
const PERMISSION_CODES = new Set(["EACCES", "EPERM"]);
const NETWORK_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const NETWORK_MESSAGES = [
  "fetch failed",
  "network error",
  "socket hang up",
  "getaddrinfo",
  "connect econnrefused",
  "connect etimedout",
];

/**
 * Classify a raw error from a storage operation.
 */
export function classifyStorageError(err: unknown): StorageErrorKind {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    const msg = err.message.toLowerCase();

    if (code && ENOSPC_CODES.has(code)) return "disk_full";
    if (code && PERMISSION_CODES.has(code)) return "permission_denied";
    if (code && NETWORK_CODES.has(code)) return "network";
    if (NETWORK_MESSAGES.some((p) => msg.includes(p))) return "network";
    if (msg.includes("nospace") || msg.includes("disk full") || msg.includes("quota"))
      return "disk_full";
    if (msg.includes("403") || msg.includes("forbidden"))
      return "permission_denied";
    if (msg.includes("503") || msg.includes("service unavailable"))
      return "provider_unavailable";
    if (msg.includes("no such file") || code === "ENOENT")
      return "not_found";
  }
  return "unknown";
}

/** Human-readable default messages for each error kind. */
const KIND_MESSAGES: Record<StorageErrorKind, string> = {
  disk_full:
    "Not enough disk space to complete the operation. Free up space and try again.",
  permission_denied:
    "Permission denied. Check that the storage directory is writable.",
  network:
    "Network error. Check your internet connection and try again.",
  not_found: "The requested file was not found.",
  provider_unavailable:
    "The storage provider is temporarily unavailable. Try again later.",
  unknown: "An unexpected storage error occurred.",
};

/**
 * Typed storage error with a classified `kind` so callers can branch on the
 * failure mode and the frontend can show a meaningful message.
 */
export class StorageError extends Error {
  readonly kind: StorageErrorKind;
  readonly operation: string;

  constructor(
    operation: string,
    cause: unknown,
    kind?: StorageErrorKind,
  ) {
    const resolvedKind = kind ?? classifyStorageError(cause);
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`${KIND_MESSAGES[resolvedKind]} (${operation}: ${detail})`, {
      cause,
    });
    this.name = "StorageError";
    this.operation = operation;
    this.kind = resolvedKind;
  }

  /** User-facing message without internal details. */
  get userMessage(): string {
    return KIND_MESSAGES[this.kind];
  }
}

/**
 * Wrap an async storage operation so errors are re-thrown as `StorageError`
 * with the appropriate classification.
 */
export async function withStorageError<T>(
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StorageError) throw err;
    throw new StorageError(operation, err);
  }
}
