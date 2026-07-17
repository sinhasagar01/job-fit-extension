import { describe, expect, it } from 'vitest';
import { compareBaselines, type BaselineLike, type PairLike } from './compare';

function pair(id: string, overall: number, dims: number[], reliable = true): PairLike {
  const [skillsMatch, experienceLevel, domainIndustry, keywordCoverage, educationCerts] = dims;
  return {
    id,
    reliable,
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
  };
}
const baseline = (pairs: PairLike[], complete = true): BaselineLike => ({ complete, pairs });

describe('compareBaselines — deltas + bound', () => {
  it('reports per-dimension deltas (after − before)', () => {
    const result = compareBaselines(baseline([pair('p', 2, [2, 2, 2, 2, 2])]), baseline([pair('p', 1, [1, 1, 1, 1, 1])]));
    const skills = result.pairs[0].deltas.find((d) => d.dimension === 'skillsMatch')!;
    expect(skills).toEqual({ dimension: 'skillsMatch', before: 2, after: 1, delta: -1 });
    expect(result.meanStddevBefore).toBe(2);
    expect(result.meanStddevAfter).toBe(1);
    expect(result.maxStddevAfter).toBe(1);
    expect(result.refusedPairs).toEqual([]);
  });

  it('passes the bound when every dimension is at or under it', () => {
    const result = compareBaselines(baseline([pair('p', 3, [3, 3, 3, 3, 3])]), baseline([pair('p', 0.8, [1.0, 0.9, 0.8, 1.0, 0.7])]), 1.0);
    expect(result.maxStddevAfter).toBe(1.0);
    expect(result.withinBound).toBe(true);
  });

  it('fails the bound when any dimension exceeds it', () => {
    const result = compareBaselines(baseline([pair('p', 3, [3, 3, 3, 3, 3])]), baseline([pair('p', 1.2, [1.4, 0.5, 0.5, 0.5, 0.5])]), 1.0);
    expect(result.maxStddevAfter).toBeCloseTo(1.4, 10);
    expect(result.withinBound).toBe(false);
  });
});

describe('compareBaselines — validity gate', () => {
  it('throws when the "before" baseline is not complete', () => {
    const before = baseline([pair('p', 1, [1, 1, 1, 1, 1])], false); // complete: false
    const after = baseline([pair('p', 1, [1, 1, 1, 1, 1])]);
    expect(() => compareBaselines(before, after)).toThrow(/"before" baseline is not complete/);
  });

  it('throws when the "after" baseline is not complete', () => {
    const before = baseline([pair('p', 1, [1, 1, 1, 1, 1])]);
    const after = baseline([pair('p', 1, [1, 1, 1, 1, 1])], false);
    expect(() => compareBaselines(before, after)).toThrow(/"after" baseline is not complete/);
  });

  it('refuses (does not compare) a pair that is unreliable in either baseline', () => {
    const before = baseline([pair('p', 1, [1, 1, 1, 1, 1])]);
    const after = baseline([pair('p', 1, [1, 1, 1, 1, 1], /* reliable */ false)]);
    const result = compareBaselines(before, after);
    expect(result.pairs).toEqual([]);
    expect(result.refusedPairs).toEqual([{ id: 'p', reason: 'after unreliable (n<3 or no aggregate)' }]);
  });

  it('refuses a pair whose aggregate is null', () => {
    const before = baseline([pair('p', 1, [1, 1, 1, 1, 1])]);
    const after = baseline([{ id: 'p', reliable: true, aggregate: null }]);
    const result = compareBaselines(before, after);
    expect(result.pairs).toEqual([]);
    expect(result.refusedPairs[0].id).toBe('p');
  });

  it('silently skips a pair absent from the "before" set (not refused)', () => {
    const before = baseline([pair('present', 1, [1, 1, 1, 1, 1])]);
    const after = baseline([pair('present', 1, [1, 1, 1, 1, 1]), pair('extra', 1, [1, 1, 1, 1, 1])]);
    const result = compareBaselines(before, after);
    expect(result.pairs.map((p) => p.id)).toEqual(['present']);
    expect(result.refusedPairs).toEqual([]);
  });
});
