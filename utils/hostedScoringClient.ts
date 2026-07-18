import type { ScoringClient } from './scorer';
import { validateFitResult, type FitResult } from './shared/scoringContract';
import { INSTALL_TOKEN_HEADER } from './shared/scoreProtocol';
import type { ScoreErrorBody, ScoreErrorReason } from './shared/scoreErrors';
import { WORKER_ORIGIN_DEV, WORKER_ORIGIN_PROD } from './shared/hostedConfig';
import { ScoringError } from './scoringError';

// Build-time switch: dev builds hit the local `wrangler dev` Worker; prod builds
// hit the deployed origin (inert until WORKER_ORIGIN_PROD is filled in).
const WORKER_ORIGIN = import.meta.env.DEV ? WORKER_ORIGIN_DEV : WORKER_ORIGIN_PROD;

async function workerReason(response: Response): Promise<ScoreErrorReason | undefined> {
  try {
    const body = (await response.json()) as ScoreErrorBody;
    return body?.error;
  } catch {
    return undefined;
  }
}

function messageFor(reason: ScoreErrorReason | undefined): string {
  switch (reason) {
    case 'free_tier_exhausted':
      return 'Free scoring is at capacity right now.';
    case 'rate_limited':
      return "You've used today's free checks.";
    case 'invalid_input':
      return 'Scoring request was rejected. Please try again.';
    case 'provider_error':
      return 'Scoring failed upstream. Please try again.';
    default:
      return 'Scoring failed. Please try again.';
  }
}

/**
 * Scores against the hosted Worker (no user key). Sends the per-install token so
 * the Worker can rate-limit; maps the Worker's typed error onto ScoringError so
 * the panel can react (free_tier_exhausted → calm state).
 */
export function createHostedScoringClient({ token }: { token: string }): ScoringClient {
  return {
    async scoreFit(profileText, jdText, meta): Promise<FitResult> {
      let response: Response;
      try {
        response = await fetch(`${WORKER_ORIGIN}/score`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [INSTALL_TOKEN_HEADER]: token,
          },
          body: JSON.stringify({ profileText, jdText, meta }),
        });
      } catch {
        throw new ScoringError('Network error. Please check your connection.', { retriable: true });
      }

      if (!response.ok) {
        const reason = await workerReason(response);
        throw new ScoringError(messageFor(reason), {
          status: response.status,
          retriable: reason === 'provider_error',
          reason,
        });
      }

      return validateFitResult(await response.json());
    },
  };
}
