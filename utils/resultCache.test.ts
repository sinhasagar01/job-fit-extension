import { describe, expect, it } from 'vitest';
import { cacheKey, clearResultCache, getCachedResult, setCachedResult } from './resultCache';
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
