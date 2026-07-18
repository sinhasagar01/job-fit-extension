import type { ScoreErrorReason } from '../../utils/shared/scoreErrors';

// HTTP-status mapping for the shared typed errors (Worker-side only). The
// extension switches UI state on the `error` token, not the status, but the
// status keeps the endpoint HTTP-correct.
const STATUS: Record<ScoreErrorReason, number> = {
  invalid_input: 400,
  rate_limited: 429,
  free_tier_exhausted: 503,
  provider_error: 502,
};

/**
 * Build a typed error Response. The body is `{ error, message? }`. `message` is
 * optional and MUST stay generic — never echo request content or provider text
 * (zero-retention).
 */
export function errorResponse(reason: ScoreErrorReason, message?: string): Response {
  return Response.json(
    message ? { error: reason, message } : { error: reason },
    { status: STATUS[reason] },
  );
}
