import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectScoringClient, hasUserKey, decrementForConfig, NO_DECREMENT } from './selectScoringClient';
import { WORKER_ORIGIN_DEV } from './shared/hostedConfig';
import { INSTALL_TOKEN_HEADER } from './shared/scoreProtocol';

const FIT = {
  dimensions: { skillsMatch: 8, experienceLevel: 7, domainIndustry: 6, keywordCoverage: 7, educationCerts: 5 },
  strengths: ['a', 'b', 'c'],
  gaps: ['x', 'y', 'z'],
  suggestion: 'do the thing',
  actionPlan: ['one: do', 'two: do'],
};

// Spy fetch; return a body only the hosted client can parse (direct clients will
// throw on the unexpected shape — fine, we only assert which origin was hit).
function fetchSpy() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(FIT), { status: 200 }));
}
afterEach(() => vi.restoreAllMocks());

const urlOf = (spy: ReturnType<typeof fetchSpy>) => String(spy.mock.calls[0][0]);

describe('selectScoringClient — precedence (user key → direct; no key → hosted)', () => {
  it('no key → hosted; scoreFit hits the Worker origin with the install-token header', async () => {
    const spy = fetchSpy();
    await selectScoringClient({}, 'tok-1')().scoreFit('p', 'j');
    expect(urlOf(spy)).toBe(`${WORKER_ORIGIN_DEV}/score`);
    const init = spy.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)[INSTALL_TOKEN_HEADER]).toBe('tok-1');
  });

  it('gemini key → provider direct; Worker origin NEVER fetched', async () => {
    const spy = fetchSpy();
    await selectScoringClient({ fitProvider: 'gemini', fitProviderApiKey: 'k' }, 'tok-1')()
      .scoreFit('p', 'j')
      .catch(() => {}); // direct client can't parse the stub body — we only assert the URL
    expect(urlOf(spy)).toContain('generativelanguage.googleapis.com');
    expect(urlOf(spy)).not.toContain('8787');
  });

  it('groq key → provider direct (groq)', async () => {
    const spy = fetchSpy();
    await selectScoringClient({ fitProvider: 'groq', fitProviderApiKey: 'k' }, 'tok-1')()
      .scoreFit('p', 'j')
      .catch(() => {});
    expect(urlOf(spy)).toContain('api.groq.com');
    expect(urlOf(spy)).not.toContain('8787');
  });

  it('legacy geminiApiKey → gemini direct', async () => {
    const spy = fetchSpy();
    await selectScoringClient({ geminiApiKey: 'legacy' }, 'tok-1')()
      .scoreFit('p', 'j')
      .catch(() => {});
    expect(urlOf(spy)).toContain('generativelanguage.googleapis.com');
  });
});

describe('BYOK is uncapped — decrement gating', () => {
  it('hasUserKey reflects any provider or legacy key', () => {
    expect(hasUserKey({})).toBe(false);
    expect(hasUserKey({ fitProviderApiKey: 'k' })).toBe(true);
    expect(hasUserKey({ geminiApiKey: 'legacy' })).toBe(true);
  });

  it('user key set → the real decrementCheck is never called', async () => {
    const decrement = vi.fn(async () => 4);
    const chosen = decrementForConfig({ fitProviderApiKey: 'k' }, decrement);
    expect(chosen).toBe(NO_DECREMENT);
    await chosen();
    expect(decrement).not.toHaveBeenCalled();
  });

  it('no key → the real decrementCheck is used', async () => {
    const decrement = vi.fn(async () => 4);
    await decrementForConfig({}, decrement)();
    expect(decrement).toHaveBeenCalledOnce();
  });
});
