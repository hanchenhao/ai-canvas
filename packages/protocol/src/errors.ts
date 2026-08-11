/**
 * User-facing error codes.
 *
 * Stable string identifiers for errors shown to end users. The backend emits
 * these codes; the frontend looks them up in the `errors` i18n namespace to
 * render a localized message. Adding a code here requires a matching key in
 * `web/src/locales/{en,zh-CN}/errors.json`.
 *
 * Scope note: this list covers the most common error categories. Backend
 * throw-sites migrate to emit these codes incrementally; an unknown code falls
 * back to the caller-provided message (see `translateError`).
 */
export const USER_FACING_ERROR_CODES = [
  "workflow_run_failed",
  "node_invocation_error",
  "asset_not_found",
  "provider_unauthorized",
  "provider_rate_limited",
  "model_not_found",
  "validation_failed",
  "workflow_not_found",
  "permission_denied",
  "internal_error"
] as const;

export type UserFacingErrorCode = (typeof USER_FACING_ERROR_CODES)[number];
