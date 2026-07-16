import { describe, expect, it, vi } from 'vitest';
import { runScoredFit } from './runScoredFit';
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
