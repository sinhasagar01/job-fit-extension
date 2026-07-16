import { describe, expect, it } from 'vitest';
import { compareBaselines, type BaselineLike } from './compare';

// Minimal baseline builder — only the stddev fields compareBaselines reads.
function baseline(pairId: string, overall: number, dims: number[]): BaselineLike {
  const [skillsMatch, experienceLevel, domainIndustry, keywordCoverage, educationCerts] = dims;
  return {
    pairs: [
      {
        id: pairId,
        aggregate: {
          overall: { stddev: overall },
          dimensions: {
            skillsMatch: { stddev: skillsMatch },
            experienceLevel: { stddev: experienceLevel },
            domainIndustry: { stddev: domainIndustry },
            keywordCoverage: { stddev: keywordCoverage },
            educationCerts: { stddev: educationCerts },
          },
        },
      },
    ],
  };
}

describe('compareBaselines', () => {
  it('reports per-dimension deltas (after − before)', () => {
    const before = baseline('p', 2.0, [2, 2, 2, 2, 2]);
    const after = baseline('p', 1.0, [1, 1, 1, 1, 1]);
    const result = compareBaselines(before, after);

    const skills = result.pairs[0].deltas.find((d) => d.dimension === 'skillsMatch')!;
    expect(skills).toEqual({ dimension: 'skillsMatch', before: 2, after: 1, delta: -1 });
    expect(result.meanStddevBefore).toBe(2);
    expect(result.meanStddevAfter).toBe(1);
    expect(result.maxStddevAfter).toBe(1);
  });

  it('passes the bound when every dimension is at or under it', () => {
    const before = baseline('p', 3, [3, 3, 3, 3, 3]);
    const after = baseline('p', 0.8, [1.0, 0.9, 0.8, 1.0, 0.7]);
    const result = compareBaselines(before, after, 1.0);
    expect(result.maxStddevAfter).toBe(1.0);
    expect(result.withinBound).toBe(true);
  });

  it('fails the bound when any dimension exceeds it', () => {
    const before = baseline('p', 3, [3, 3, 3, 3, 3]);
    const after = baseline('p', 1.2, [1.4, 0.5, 0.5, 0.5, 0.5]);
    const result = compareBaselines(before, after, 1.0);
    expect(result.maxStddevAfter).toBeCloseTo(1.4, 10);
    expect(result.withinBound).toBe(false);
  });

  it('skips pairs missing or failed in either baseline', () => {
    const before = baseline('present', 1, [1, 1, 1, 1, 1]);
    const after: BaselineLike = {
      pairs: [
        ...baseline('present', 1, [1, 1, 1, 1, 1]).pairs,
        { id: 'failed-run', aggregate: null },
        { id: 'not-in-before', aggregate: baseline('x', 1, [1, 1, 1, 1, 1]).pairs[0].aggregate },
      ],
    };
    const result = compareBaselines(before, after);
    expect(result.pairs.map((p) => p.id)).toEqual(['present']);
  });
});
