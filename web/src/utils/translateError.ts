import i18n from "../i18n";
import type { ApiErrorCode } from "@nodetool-ai/protocol/api-schemas";

/**
 * Translate a user-facing ApiErrorCode into a localized message.
 *
 * Backend throws ApiErrorCode via `throwApiError` (see
 * `packages/websocket/src/trpc/error-formatter.ts`); tRPC's error formatter
 * surfaces it on `err.data.apiCode`. This helper looks up
 * `errors:<code>` in the current i18n language and falls back to the
 * caller-provided message if the code has no translation.
 *
 * @param code     Stable ApiErrorCode (see `@nodetool-ai/protocol/api-schemas`).
 * @param fallback Message shown when the code has no translation.
 * @param params   Optional interpolation values for the message template.
 */
export function translateError(
  code: ApiErrorCode | string,
  fallback: string,
  params?: Record<string, string | number>
): string {
  const key = `errors:${code}`;
  // i18n.exists is the authoritative missing-key check; i18n.t returns the
  // final key segment (not the full namespaced key) for unknown codes, so a
  // string equality check on the return value is unreliable.
  if (!i18n.exists(key)) {
    return fallback;
  }
  return i18n.t(key, params ?? {});
}
