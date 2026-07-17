import { ScoringError } from '../utils/scoringError';

export interface RetryOptions {
  maxRetries: number;
  backoffMs: number;
  /** Injected so tests don't actually wait. */
  sleep: (ms: number) => Promise<void>;
}

export type RetryOutcome<T> =
  | { ok: true; result: T; retriesUsed: number }
  | { ok: false; status?: number; message: string; retriesUsed: number };

const isRetriable = (err: unknown): boolean => err instanceof ScoringError && err.retriable;

/**
 * Call `fn`, retrying transient (retriable) ScoringErrors — network, 429, 5xx —
 * with exponential backoff (`backoffMs * 2**attempt`) up to `maxRetries` times.
 * Non-retriable errors fail immediately. Returns the result or a structured
 * failure (status + message), plus how many retries were spent (counted
 * separately from a real failure).
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  { maxRetries, backoffMs, sleep }: RetryOptions
): Promise<RetryOutcome<T>> {
  let retriesUsed = 0;
  for (let attempt = 0; ; attempt++) {
    try {
      const result = await fn();
      return { ok: true, result, retriesUsed };
    } catch (err) {
      if (isRetriable(err) && attempt < maxRetries) {
        retriesUsed++;
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
      return {
        ok: false,
        status: err instanceof ScoringError ? err.status : undefined,
        message: err instanceof Error ? err.message : String(err),
        retriesUsed,
      };
    }
  }
}
