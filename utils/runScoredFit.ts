import type { FitResult, ScoringClient } from './scorer';

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
