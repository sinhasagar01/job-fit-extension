import type { ScoringClient } from './scorer';
import { createOpenAICompatClient } from './openaiCompatScoringClient';
import { createRealScoringClient } from './realScoringClient';
import { createHostedScoringClient } from './hostedScoringClient';

export interface ScoringConfig {
  fitProvider?: string;
  fitProviderModel?: string;
  fitProviderApiKey?: string;
  geminiApiKey?: string;
}

/** A user has their own key (BYOK) — current provider key or the legacy Gemini one. */
export function hasUserKey(cfg: ScoringConfig): boolean {
  return Boolean(cfg.fitProviderApiKey) || Boolean(cfg.geminiApiKey);
}

/**
 * Pick the scoring client. Precedence, load-bearing for privacy (4.3):
 *   - a user key → THEIR provider, direct (Gemini/Groq) — never through the Worker.
 *   - no key → the hosted Worker (createHostedScoringClient).
 * A BYOK user's résumé/JD never touch our server. Returns a lazy factory (the
 * cache layer only constructs a client on a miss).
 */
export function selectScoringClient(cfg: ScoringConfig, token: string): () => ScoringClient {
  const apiKey = cfg.fitProviderApiKey;
  const provider = cfg.fitProvider;
  const model = cfg.fitProviderModel || 'llama-3.3-70b-versatile';
  return () =>
    apiKey && provider === 'groq'
      ? createOpenAICompatClient({ baseUrl: 'https://api.groq.com/openai/v1', model, apiKey })
      : apiKey && provider === 'gemini'
        ? createRealScoringClient(apiKey)
        : cfg.geminiApiKey
          ? createRealScoringClient(cfg.geminiApiKey)
          : createHostedScoringClient({ token });
}

/** No-op decrement for BYOK: the free-check limiter is a hosted-tier cost control only. */
export const NO_DECREMENT = async (): Promise<number> => Number.POSITIVE_INFINITY;

/**
 * The decrement to pass to the scoring flow. BYOK users are uncapped, so the
 * real `decrementCheck` is never called for them — "use your own key" is a
 * genuine unlimited escape, not a false promise.
 */
export function decrementForConfig(
  cfg: ScoringConfig,
  decrement: () => Promise<number>,
): () => Promise<number> {
  return hasUserKey(cfg) ? NO_DECREMENT : decrement;
}
