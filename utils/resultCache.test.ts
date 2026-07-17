import { describe, expect, it } from 'vitest';
import {
  cacheKey,
  clearResultCache,
  deleteCachedResult,
  getCachedResult,
  listCachedResults,
  MAX_HISTORY,
  setCachedResult,
} from './resultCache';
import { __seedStorage } from '../test/setup';
import type { FitResult } from './scorer';

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

describe('cacheKey — deterministic and collision-resistant', () => {
  it('is stable for the same inputs (across sessions)', () => {
    expect(cacheKey('profile', 'jd')).toBe(cacheKey('profile', 'jd'));
  });

  it('differs when the JD differs', () => {
    expect(cacheKey('profile', 'jd-A')).not.toBe(cacheKey('profile', 'jd-B'));
  });

  it('differs when the profile differs', () => {
    expect(cacheKey('profile-A', 'jd')).not.toBe(cacheKey('profile-B', 'jd'));
  });

  it('does not collide across the profile/JD boundary', () => {
    // Without a separator, ("ab","c") and ("a","bc") would hash identically.
    expect(cacheKey('ab', 'c')).not.toBe(cacheKey('a', 'bc'));
  });
});

describe('result cache — storage round-trip', () => {
  it('returns null for an uncached pair', async () => {
    expect(await getCachedResult('profile', 'jd')).toBeNull();
  });

  it('stores and retrieves a result that deep-equals the original', async () => {
    await setCachedResult('profile', 'jd', aResult);
    const got = await getCachedResult('profile', 'jd');
    expect(got).toEqual(aResult);
  });

  it('keys entries by (profile, JD) so a different JD misses', async () => {
    await setCachedResult('profile', 'jd-A', aResult);
    expect(await getCachedResult('profile', 'jd-B')).toBeNull();
  });

  it('clearResultCache empties the cache', async () => {
    await setCachedResult('profile', 'jd', aResult);
    await clearResultCache();
    expect(await getCachedResult('profile', 'jd')).toBeNull();
  });
});

describe('result cache — history (Task 5.2)', () => {
  it('stores title/company from meta and lists them', async () => {
    await setCachedResult('p', 'j', aResult, { title: 'Staff Engineer', company: 'Acme' });
    const [entry] = await listCachedResults();
    expect(entry).toMatchObject({ title: 'Staff Engineer', company: 'Acme', result: aResult });
    expect(typeof entry.key).toBe('string');
    // getCachedResult still returns just the result.
    expect(await getCachedResult('p', 'j')).toEqual(aResult);
  });

  it('reads a legacy { result, ts } entry without throwing (title/company → null)', async () => {
    __seedStorage({ resultCache: { legacy: { result: aResult, ts: 1000 } } });
    const list = await listCachedResults();
    expect(list).toEqual([{ key: 'legacy', result: aResult, ts: 1000, title: null, company: null }]);
  });

  it('lists newest first', async () => {
    __seedStorage({
      resultCache: {
        old: { result: aResult, ts: 100, title: 'Old', company: 'X' },
        mid: { result: aResult, ts: 200, title: 'Mid', company: 'Y' },
        new: { result: aResult, ts: 300, title: 'New', company: 'Z' },
      },
    });
    expect((await listCachedResults()).map((e) => e.title)).toEqual(['New', 'Mid', 'Old']);
  });

  it('evicts the oldest entries beyond MAX_HISTORY', async () => {
    // Seed exactly MAX_HISTORY entries with ascending timestamps (k0 oldest).
    const store: Record<string, { result: FitResult; ts: number }> = {};
    for (let i = 0; i < MAX_HISTORY; i++) store[`k${i}`] = { result: aResult, ts: i };
    __seedStorage({ resultCache: store });

    await setCachedResult('brand', 'new', aResult); // one over the cap → evict oldest (k0)

    const list = await listCachedResults();
    expect(list).toHaveLength(MAX_HISTORY);
    expect(list.some((e) => e.key === 'k0')).toBe(false); // oldest gone
    expect(await getCachedResult('brand', 'new')).toEqual(aResult); // newest kept
  });

  it('deleteCachedResult removes a single entry by key', async () => {
    __seedStorage({
      resultCache: {
        a: { result: aResult, ts: 1 },
        b: { result: aResult, ts: 2 },
      },
    });
    await deleteCachedResult('a');
    expect((await listCachedResults()).map((e) => e.key)).toEqual(['b']);
  });
});
