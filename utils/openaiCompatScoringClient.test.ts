import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAICompatClient } from './openaiCompatScoringClient';
import { ScoringError } from './scoringError';

// Verifies the Task 3.2 experiment knobs (temperature/seed) actually reach the
// request body, and that defaults are unchanged — without spending API calls.

const validPayload = JSON.stringify({
  dimensions: {
    skillsMatch: 8,
    experienceLevel: 7,
    domainIndustry: 6,
    keywordCoverage: 5,
    educationCerts: 4,
  },
  strengths: ['s1', 's2', 's3'],
  gaps: ['g1', 'g2', 'g3'],
  suggestion: 'Tailor your resume.',
  actionPlan: ['Learn X', 'Build Y'],
});

/** Capture the fetch request body; respond with a valid Groq chat completion. */
function stubFetchCapturing(): { bodyOf: () => Record<string, unknown> } {
  const captured: { body?: string } = {};
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    captured.body = init.body as string;
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: validPayload } }] }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { bodyOf: () => JSON.parse(captured.body ?? '{}') };
}

const base = { baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', apiKey: 'k' };

afterEach(() => vi.unstubAllGlobals());

describe('createOpenAICompatClient — request parameters', () => {
  it('defaults to temperature 0.1 and omits seed (shipped behaviour)', async () => {
    const { bodyOf } = stubFetchCapturing();
    await createOpenAICompatClient(base).scoreFit('profile', 'jd');
    const body = bodyOf();
    expect(body.temperature).toBe(0.1);
    expect('seed' in body).toBe(false);
  });

  it('sends the configured temperature and seed', async () => {
    const { bodyOf } = stubFetchCapturing();
    await createOpenAICompatClient({ ...base, temperature: 0, seed: 42 }).scoreFit('profile', 'jd');
    const body = bodyOf();
    expect(body.temperature).toBe(0);
    expect(body.seed).toBe(42);
  });
});

/** Stub fetch to always return a 429 with the given error body. Fake timers
 *  skip the client's internal 2 s retry wait. */
function stubFetch429(errorBody: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false, status: 429, json: async () => errorBody }) as Response)
  );
}

async function scoreExpectingError(): Promise<ScoringError> {
  const promise = createOpenAICompatClient(base).scoreFit('profile', 'jd');
  const settled = promise.then((r) => ({ r }), (e) => ({ e }));
  await vi.runAllTimersAsync(); // advance past the internal 429 retry backoff
  const outcome = (await settled) as { e?: unknown };
  return outcome.e as ScoringError;
}

describe('createOpenAICompatClient — 429 retriable classification', () => {
  it('marks an exhausted-quota 429 non-retriable (fail fast)', async () => {
    vi.useFakeTimers();
    stubFetch429({ error: { message: 'You exceeded your current quota, check billing.' } });
    const err = await scoreExpectingError();
    vi.useRealTimers();

    expect(err).toBeInstanceOf(ScoringError);
    expect(err.status).toBe(429);
    expect(err.retriable).toBe(false);
  });

  it('keeps a transient rate-limit 429 retriable', async () => {
    vi.useFakeTimers();
    stubFetch429({ error: { message: 'Rate limit reached for requests per minute.' } });
    const err = await scoreExpectingError();
    vi.useRealTimers();

    expect(err).toBeInstanceOf(ScoringError);
    expect(err.status).toBe(429);
    expect(err.retriable).toBe(true);
  });
});
