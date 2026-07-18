import { env, SELF, fetchMock } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hashIp, utcDate } from '../src/rateLimit';
import { INSTALL_TOKEN_HEADER } from '../../utils/shared/scoreProtocol';

// A pre-validation model response (no `overall` — validateFitResult computes it).
const MODEL_JSON = {
  dimensions: { skillsMatch: 8, experienceLevel: 7, domainIndustry: 6, keywordCoverage: 7, educationCerts: 5 },
  strengths: ['Deep React experience', 'Strong TypeScript', 'Ships production features'],
  gaps: ['No Kubernetes', 'Limited backend depth', 'No AWS certification'],
  suggestion: 'Earn an AWS Solutions Architect Associate cert to close the cloud gap named in the JD.',
  actionPlan: ['AWS: earn Solutions Architect Associate', 'Backend: build and deploy a Node service'],
};

const VALID_BODY = {
  profileText: 'Senior frontend engineer with 6 years of React and TypeScript building dashboards. '.repeat(3),
  jdText: 'Seeking a senior frontend engineer strong in React and TypeScript. '.repeat(3),
  meta: { title: 'Senior Frontend Engineer', company: 'Northwind' },
};

const DATE = utcDate(new Date());
const G_KEY = `g:${DATE}`;
const tKey = (token = 'tok-1') => `t:${token}:${DATE}`;
const ipKey = async () => `ip:${await hashIp('noip')}:${DATE}`; // SELF sets no CF-Connecting-IP → 'noip' bucket

const CAP = env.GLOBAL_DAILY_CAP;
const PER_TOKEN = env.DAILY_LIMIT_PER_TOKEN;
const PER_IP = env.DAILY_LIMIT_PER_IP;

beforeEach(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect(); // any un-mocked outbound fetch throws
});
afterEach(() => fetchMock.deactivate());

/** Register a persistent OpenAI interceptor and return a live call counter. */
function mockOpenAI(content: string, statusCode = 200) {
  const counter = { calls: 0 };
  fetchMock
    .get('https://api.openai.com')
    .intercept({ path: '/v1/chat/completions', method: 'POST' })
    .reply(() => {
      counter.calls++;
      return { statusCode, data: JSON.stringify({ choices: [{ message: { content } }] }) };
    });
  // Single-use (no .persist()): consumed by the test that calls the provider;
  // the no-call tests (fail-closed, counters-unchanged) leave theirs unconsumed
  // but run last, so nothing downstream is shadowed.
  return counter;
}

function post(body: unknown, opts: { token?: string | null } = {}) {
  const { token = 'tok-1' } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers[INSTALL_TOKEN_HEADER] = token;
  return SELF.fetch('https://worker.local/score', { method: 'POST', headers, body: JSON.stringify(body) });
}

async function readAll() {
  return {
    g: await env.RATE_LIMIT.get(G_KEY),
    t: await env.RATE_LIMIT.get(tKey()),
    ip: await env.RATE_LIMIT.get(await ipKey()),
  };
}

describe('POST /score — happy path', () => {
  it('scores a valid request → 200 FitResult, provider called once, 3 counters written', async () => {
    const provider = mockOpenAI(JSON.stringify(MODEL_JSON));
    const res = await post(VALID_BODY);

    expect(res.status).toBe(200);
    const fit = await res.json();
    expect(fit).toMatchObject({ overall: expect.any(Number), dimensions: { skillsMatch: 8 } });
    expect(provider.calls).toBe(1);
    expect(await readAll()).toEqual({ g: '1', t: '1', ip: '1' });
  });

  it('recovers a prose-wrapped JSON response via the brace-extraction backstop', async () => {
    mockOpenAI(`Sure, here you go: ${JSON.stringify(MODEL_JSON)} — good luck!`);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    const fit = (await res.json()) as { overall: number };
    expect(fit.overall).toEqual(expect.any(Number));
  });
});

describe('POST /score — typed errors', () => {
  it('oversized body → invalid_input (400)', async () => {
    const res = await post({ ...VALID_BODY, profileText: 'x'.repeat(21_000) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_input' });
  });

  it('missing install token → invalid_input (400)', async () => {
    const res = await post(VALID_BODY, { token: null });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_input' });
  });

  it('malformed JSON body → invalid_input (400)', async () => {
    const res = await SELF.fetch('https://worker.local/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [INSTALL_TOKEN_HEADER]: 'tok-1' },
      body: '{ not valid json',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_input' });
  });

  it('per-install-token limit reached → rate_limited (429)', async () => {
    await env.RATE_LIMIT.put(tKey(), PER_TOKEN);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate_limited' });
  });

  it('per-IP limit reached → rate_limited (429)', async () => {
    await env.RATE_LIMIT.put(await ipKey(), PER_IP);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: 'rate_limited' });
  });

  it('provider non-OK → provider_error (502)', async () => {
    mockOpenAI('{}', 500);
    const res = await post(VALID_BODY);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'provider_error' });
  });

  it('unparseable provider response → provider_error (502)', async () => {
    mockOpenAI('this is not json at all');
    const res = await post(VALID_BODY);
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'provider_error' });
  });
});

describe('POST /score — fail closed on the global cap', () => {
  it('cap exhausted → 503 free_tier_exhausted with ZERO provider calls', async () => {
    const provider = mockOpenAI(JSON.stringify(MODEL_JSON)); // registered, must never fire
    await env.RATE_LIMIT.put(G_KEY, CAP);

    const res = await post(VALID_BODY);

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'free_tier_exhausted' });
    expect(provider.calls).toBe(0); // the whole point: no spend on an exhausted tier
  });
});

describe('POST /score — a rejected request burns no quota (counters unchanged)', () => {
  // Mirror of the fail-closed test: proves rejection at ANY gate leaves all three
  // counters exactly as seeded (read-only path, no writes), pinning the precedence.
  const cases: { name: string; seed: { g: string; t: string; ip: string }; act: () => Promise<Response> }[] = [
    {
      name: 'global cap trip',
      seed: { g: CAP, t: '2', ip: '3' },
      act: () => post(VALID_BODY),
    },
    {
      name: 'per-token trip',
      seed: { g: '10', t: PER_TOKEN, ip: '3' },
      act: () => post(VALID_BODY),
    },
    {
      name: 'per-IP trip',
      seed: { g: '10', t: '2', ip: PER_IP },
      act: () => post(VALID_BODY),
    },
    {
      name: 'invalid_input trip',
      seed: { g: '10', t: '2', ip: '3' },
      act: () => post({ ...VALID_BODY, profileText: 'x'.repeat(21_000) }),
    },
  ];

  for (const c of cases) {
    it(`${c.name}: token/IP/global unchanged, zero provider calls`, async () => {
      const provider = mockOpenAI(JSON.stringify(MODEL_JSON));
      await env.RATE_LIMIT.put(G_KEY, c.seed.g);
      await env.RATE_LIMIT.put(tKey(), c.seed.t);
      await env.RATE_LIMIT.put(await ipKey(), c.seed.ip);

      const res = await c.act();
      expect(res.status).toBeGreaterThanOrEqual(400);

      expect(await readAll()).toEqual(c.seed); // no delta on any counter
      expect(provider.calls).toBe(0); // and no provider call
    });
  }
});
