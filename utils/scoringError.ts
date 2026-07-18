import type { ScoreErrorReason } from './shared/scoreErrors';

/**
 * Error thrown by the scoring clients. Carries the HTTP status (when known) and
 * whether the failure is worth retrying (transient: network, 429, or 5xx).
 *
 * The extension only reads `.message` (unchanged behaviour); the eval harness
 * reads `.status` and `.retriable` to record failures with their cause and to
 * drive throttled retries. The hosted client additionally sets `.reason` (the
 * Worker's typed error) so the panel can switch UI state — e.g. the calm
 * free_tier_exhausted screen — instead of a generic error line.
 */
export class ScoringError extends Error {
  readonly status?: number;
  readonly retriable: boolean;
  readonly reason?: ScoreErrorReason;

  constructor(
    message: string,
    opts: { status?: number; retriable?: boolean; reason?: ScoreErrorReason } = {},
  ) {
    super(message);
    this.name = 'ScoringError';
    this.status = opts.status;
    this.retriable = opts.retriable ?? false;
    this.reason = opts.reason;
  }
}
