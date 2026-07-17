import type { FitResult, ScoringClient } from './scorer';
import { getCachedResult, setCachedResult } from './resultCache';
import { getRemainingChecks } from './usageCounter';

/**
 * Run a fit score, then consume one usage check — but only when scoring
 * succeeds. If `client.scoreFit` rejects (API error, malformed JSON, rate
 * limit, …) the rejection propagates and `decrement` is never called, so a
 * failed check never costs the user. On success the check is consumed exactly
 * once and the updated remaining count is returned alongside the result.
 *
 * The decrement-only-on-success ordering is the whole point of this seam;
 * runScoredFit.test.ts locks it so a future refactor can't reintroduce the
 * double-charge bug.
 */
export async function runScoredFit(
  client: ScoringClient,
  profileText: string,
  jdText: string,
  meta: { title: string | null; company: string | null },
  decrement: () => Promise<number>
): Promise<{ result: FitResult; remaining: number }> {
  const result = await client.scoreFit(profileText, jdText, meta);
  const remaining = await decrement();
  return { result, remaining };
}

export interface CachedFitOutcome {
  result: FitResult;
  remaining: number;
  fromCache: boolean;
}

/**
 * Cache-aware fit run. On a cache hit (same profile + JD as a previous score),
 * the stored result is returned immediately WITHOUT selecting/constructing a
 * client, making a network call, or consuming a usage check — so re-scoring the
 * same page is instant and free. `getClient` is a factory, called only on a
 * miss, so client selection is skipped entirely on a hit.
 *
 * On a miss, scores via runScoredFit (which decrements only on success), then
 * caches the result. A failed score is not cached and does not decrement.
 */
export async function runCachedFit(
  getClient: () => ScoringClient,
  profileText: string,
  jdText: string,
  meta: { title: string | null; company: string | null },
  decrement: () => Promise<number>
): Promise<CachedFitOutcome> {
  const cached = await getCachedResult(profileText, jdText);
  if (cached) {
    return { result: cached, remaining: await getRemainingChecks(), fromCache: true };
  }

  const { result, remaining } = await runScoredFit(
    getClient(),
    profileText,
    jdText,
    meta,
    decrement
  );
  await setCachedResult(profileText, jdText, result, meta);
  return { result, remaining, fromCache: false };
}

/**
 * Guarded entry to runCachedFit. When `blocked` is true — e.g. the side panel
 * is stale because the active tab no longer matches the page the JD was read
 * from — score NOTHING: no client is selected, no scoreFit runs, and no usage
 * check is consumed. This makes a wrong-page score (and its wasted check)
 * impossible even if a caller reaches this path. Returns null when blocked.
 */
export async function attemptScoredFit(
  blocked: boolean,
  getClient: () => ScoringClient,
  profileText: string,
  jdText: string,
  meta: { title: string | null; company: string | null },
  decrement: () => Promise<number>
): Promise<CachedFitOutcome | null> {
  if (blocked) return null;
  return runCachedFit(getClient, profileText, jdText, meta, decrement);
}
