/**
 * Error thrown by the scoring clients. Carries the HTTP status (when known) and
 * whether the failure is worth retrying (transient: network, 429, or 5xx).
 *
 * The extension only reads `.message` (unchanged behaviour); the eval harness
 * reads `.status` and `.retriable` to record failures with their cause and to
 * drive throttled retries.
 */
export class ScoringError extends Error {
  readonly status?: number;
  readonly retriable: boolean;

  constructor(message: string, opts: { status?: number; retriable?: boolean } = {}) {
    super(message);
    this.name = 'ScoringError';
    this.status = opts.status;
    this.retriable = opts.retriable ?? false;
  }
}
