import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHostedScoringClient } from './hostedScoringClient';
import { ScoringError } from './scoringError';
import { INSTALL_TOKEN_HEADER } from './shared/scoreProtocol';
import { WORKER_ORIGIN_DEV } from './shared/hostedConfig';

// A pre-validation FitResult (no `overall` — validateFitResult computes it).
const FIT = {
  dimensions: { skillsMatch: 8, experienceLevel: 7, domainIndustry: 6, keywordCoverage: 7, educationCerts: 5 },
  strengths: ['a', 'b', 'c'],
  gaps: ['x', 'y', 'z'],
  suggestion: 'do the thing',
  actionPlan: ['one: do', 'two: do'],
};

function mockFetch(res: Response | Error) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (res instanceof Error) throw res;
    return res;
  });
}
afterEach(() => vi.restoreAllMocks());

describe('createHostedScoringClient', () => {
  it('POSTs /score with the install token header and returns a FitResult on 200', async () => {
    const spy = mockFetch(new Response(JSON.stringify(FIT), { status: 200 }));
    const result = await createHostedScoringClient({ token: 'tok-1' }).scoreFit('profile', 'jd', {
      title: 'Eng',
      company: 'Acme',
    });
    expect(result.overall).toEqual(expect.any(Number));

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe(`${WORKER_ORIGIN_DEV}/score`);
    expect((init!.headers as Record<string, string>)[INSTALL_TOKEN_HEADER]).toBe('tok-1');
    expect(init!.method).toBe('POST');
  });

  it('maps a 503 free_tier_exhausted to ScoringError.reason', async () => {
    mockFetch(new Response(JSON.stringify({ error: 'free_tier_exhausted' }), { status: 503 }));
    const err = await createHostedScoringClient({ token: 't' })
      .scoreFit('p', 'j')
      .catch((e) => e);
    expect(err).toBeInstanceOf(ScoringError);
    expect(err.reason).toBe('free_tier_exhausted');
    expect(err.status).toBe(503);
  });

  it.each([
    ['invalid_input', 400],
    ['rate_limited', 429],
    ['provider_error', 502],
  ] as const)('maps %s (%d) to ScoringError.reason', async (reason, status) => {
    mockFetch(new Response(JSON.stringify({ error: reason }), { status }));
    await expect(createHostedScoringClient({ token: 't' }).scoreFit('p', 'j')).rejects.toMatchObject({
      reason,
    });
  });

  it('a network throw is a retriable ScoringError', async () => {
    mockFetch(new Error('boom'));
    await expect(createHostedScoringClient({ token: 't' }).scoreFit('p', 'j')).rejects.toMatchObject({
      retriable: true,
    });
  });
});
