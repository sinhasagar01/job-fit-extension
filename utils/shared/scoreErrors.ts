// The typed error vocabulary of the hosted /score endpoint, shared so the Worker
// and the extension (Task 4.2, which switches UI state on these) use one source.
// Pure types — safe for workerd. HTTP-status mapping is a Worker concern and
// lives in worker/src/errors.ts, not here.
export type ScoreErrorReason =
  | 'invalid_input'
  | 'rate_limited'
  | 'free_tier_exhausted'
  | 'provider_error';

export interface ScoreErrorBody {
  error: ScoreErrorReason;
  message?: string;
}
