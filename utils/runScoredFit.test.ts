import { describe, expect, it, vi } from 'vitest';
import { runCachedFit, runScoredFit } from './runScoredFit';
import type { FitResult, ScoringClient } from './scorer';

// Task 1.1: a usage check must be consumed only when scoring succeeds. A
// failed scoreFit (API error, malformed JSON, rate limit) must not cost the
// user a check. These assertions describe that intended contract and guard
// against a future refactor reintroducing the decrement-before-scoreFit bug.

const aResult: FitResult = {
  overall: 7,
  dimensions: {
    skillsMatch: 8,
    experienceLevel: 7,
    domainIndustry: 6,
    keywordCoverage: 5,
    educationCerts: 4,
  },
  strengths: ['s1', 's2', 's3'],
  gaps: ['g1', 'g2', 'g3'],
  suggestion: 'Highlight your Kubernetes experience.',
  actionPlan: ['Learn X', 'Build Y'],
};

const meta = { title: 'Staff Engineer', company: 'Acme' };

const clientResolving = (result: FitResult): ScoringClient => ({
  scoreFit: vi.fn(async () => result),
});

const clientRejecting = (error: unknown): ScoringClient => ({
  scoreFit: vi.fn(async () => {
    throw error;
  }),
});

describe('runScoredFit — decrement only after scoreFit succeeds', () => {
  it('decrements exactly once on success and returns the result + remaining', async () => {
    const decrement = vi.fn(async () => 4);
    const client = clientResolving(aResult);

    const out = await runScoredFit(client, 'profile', 'jd', meta, decrement);

    expect(client.scoreFit).toHaveBeenCalledOnce();
    expect(decrement).toHaveBeenCalledOnce();
    expect(out).toEqual({ result: aResult, remaining: 4 });
  });

  it('passes the profile, jd, and meta straight through to scoreFit', async () => {
    const decrement = vi.fn(async () => 4);
    const client = clientResolving(aResult);

    await runScoredFit(client, 'profile-text', 'jd-text', meta, decrement);

    expect(client.scoreFit).toHaveBeenCalledWith('profile-text', 'jd-text', meta);
  });

  // The failure modes Task 1.1 calls out — each must leave the counter untouched.
  const failures: Array<[string, unknown]> = [
    ['API error', new Error('Scoring failed (HTTP 500). Please try again.')],
    ['invalid API key', new Error('Invalid API key. Check your key in Settings.')],
    ['malformed JSON', new Error('Scoring failed: unexpected response format. Please try again.')],
    ['rate limit', new Error('Rate limit reached. Please wait a moment and try again.')],
  ];

  for (const [label, error] of failures) {
    it(`does not decrement when scoreFit rejects (${label})`, async () => {
      const decrement = vi.fn(async () => 4);
      const client = clientRejecting(error);

      await expect(runScoredFit(client, 'profile', 'jd', meta, decrement)).rejects.toBe(error);

      expect(client.scoreFit).toHaveBeenCalledOnce();
      expect(decrement).not.toHaveBeenCalled();
    });
  }
});

// Task 1.2: the same resume + JD returns the identical result, makes no second
// network call, selects no client, and does not decrement. Cache is backed by
// the mocked browser.storage.local (reset between tests in test/setup.ts).
describe('runCachedFit — result caching', () => {
  /** A client whose scoreFit calls `fetchSpy` — a stand-in for the network. */
  const spyingClient = (fetchSpy: () => void, result: FitResult): ScoringClient => ({
    scoreFit: vi.fn(async () => {
      fetchSpy();
      return result;
    }),
  });

  it('(a,b,d) re-scoring the same profile+JD: one fetch, no decrement, identical result', async () => {
    const fetchSpy = vi.fn();
    const client = spyingClient(fetchSpy, aResult);
    const getClient = vi.fn(() => client);
    const decrement = vi.fn(async () => 4);

    const first = await runCachedFit(getClient, 'profile', 'jd', meta, decrement);
    const second = await runCachedFit(getClient, 'profile', 'jd', meta, decrement);

    expect(fetchSpy).toHaveBeenCalledOnce(); // (a) exactly one network call
    expect(decrement).toHaveBeenCalledOnce(); // (b) second (cache) hit doesn't decrement
    expect(getClient).toHaveBeenCalledOnce(); // client not even selected on a hit
    expect(second.fromCache).toBe(true);
    expect(second.result).toEqual(first.result); // (d) deep-equals the original
    expect(second.result).toEqual(aResult);
  });

  it('(c) a different JD is a cache miss and triggers a second call', async () => {
    const fetchSpy = vi.fn();
    const client = spyingClient(fetchSpy, aResult);
    const decrement = vi.fn(async () => 4);

    await runCachedFit(() => client, 'profile', 'jd-A', meta, decrement);
    await runCachedFit(() => client, 'profile', 'jd-B', meta, decrement);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(decrement).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed score (a retry still calls the client)', async () => {
    const decrement = vi.fn(async () => 4);
    const failing: ScoringClient = {
      scoreFit: vi.fn(async () => {
        throw new Error('rate limit');
      }),
    };
    await expect(runCachedFit(() => failing, 'p', 'j', meta, decrement)).rejects.toThrow('rate limit');
    expect(decrement).not.toHaveBeenCalled();

    // Nothing was cached, so a second attempt re-scores.
    const ok = spyingClient(vi.fn(), aResult);
    const out = await runCachedFit(() => ok, 'p', 'j', meta, decrement);
    expect(ok.scoreFit).toHaveBeenCalledOnce();
    expect(decrement).toHaveBeenCalledOnce();
    expect(out.fromCache).toBe(false);
  });
});
