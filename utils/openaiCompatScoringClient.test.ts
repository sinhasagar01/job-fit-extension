import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAICompatClient } from './openaiCompatScoringClient';

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
