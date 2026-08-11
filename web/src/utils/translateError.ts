import i18n from "../i18n";

/**
 * Translate a user-facing error code into a localized message.
 *
 * Looks up `errors:<code>` in the current i18n language. If the code is
 * unknown (i18n returns the key unchanged), returns the caller-provided
 * `fallback` message instead of surfacing the raw key.
 *
 * @param code     Stable error code (see `USER_FACING_ERROR_CODES`).
 * @param fallback Message shown when the code has no translation.
 * @param params   Optional interpolation values for the message template.
 */
export function translateError(
  code: string,
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
