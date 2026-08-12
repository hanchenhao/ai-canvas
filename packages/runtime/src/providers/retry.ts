/**
 * Bounded exponential-backoff retry for provider HTTP requests.
 *
 * Retries transient failures: network errors, 429 (rate limit), and 5xx.
 * Does NOT retry 4xx (except 429) — those are permanent (bad key, bad prompt).
 *
 * Honours Retry-After when the server sends one (seconds or HTTP-date).
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Jitter fraction (0..1); default 0.2 adds ±20% randomness. */
  jitter?: number;
}

const DEFAULTS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitter: 0.2
};

/** True if the error/response is worth retrying. */
const isRetryableStatus = (status: number): boolean =>
  status === 429 || (status >= 500 && status <= 599);

const isRetryableError = (err: unknown): boolean => {
  if (err instanceof TypeError) return true; // fetch network failure
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
   return msg.includes("timeout") || msg.includes("econnreset") || msg.includes("fetch failed");
  }
  return false;
};

/** Parse Retry-After header (seconds or HTTP-date). Returns ms, or null. */
const parseRetryAfter = (value: string | null): number | null => {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  return null;
};

const computeDelay = (
  attempt: number,
  retryAfterMs: number | null,
  opts: Required<RetryOptions>
): number => {
  if (retryAfterMs !== null) return Math.min(retryAfterMs, opts.maxDelayMs);
  const exponential = opts.baseDelayMs * Math.pow(2, attempt);
  const jitterAmount = exponential * opts.jitter;
  const jittered = exponential - jitterAmount + Math.random() * jitterAmount * 2;
  return Math.min(jittered, opts.maxDelayMs);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrap a fetch-like function with bounded exponential backoff.
 *
 * The factory returns the same Response/throw shape as the original `fn`, so
 * callers can drop it in without changing their error handling.
 */
export async function fetchWithRetry(
  fn: () => Promise<Response>,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...DEFAULTS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fn();
      if (!isRetryableStatus(response.status)) {
        return response;
      }
      // Retryable HTTP status — but only if we have retries left.
      if (attempt >= opts.maxRetries) {
        return response;
      }
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      const delay = computeDelay(attempt, retryAfter, opts);
      await sleep(delay);
      continue;
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt >= opts.maxRetries) {
        throw err;
      }
      const delay = computeDelay(attempt, null, opts);
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("Retry loop exhausted");
}
