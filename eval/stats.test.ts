import { describe, expect, it } from 'vitest';
import { aggregateRuns, mean, stddev, summarize, variance } from './stats';
import type { FitResult } from '../utils/scorer';

// The harness must be stable before it can judge the model: its aggregation
// math is deterministic and exact, so any variance a baseline reports reflects
// the model, not the harness. These assertions pin that math.

describe('mean / variance / stddev', () => {
  it('computes the mean', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('computes population variance (÷N)', () => {
    // ((2-4)^2 + (4-4)^2 + (6-4)^2) / 3 = 8/3
    expect(variance([2, 4, 6])).toBeCloseTo(8 / 3, 10);
  });

  it('reports zero variance and stddev for identical values', () => {
    expect(variance([5, 5, 5])).toBe(0);
    expect(stddev([5, 5, 5])).toBe(0);
  });

  it('stddev is the square root of variance', () => {
    expect(stddev([2, 4, 6])).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });

  it('is stable: same input yields identical stats on repeat calls', () => {
    const xs = [3, 7, 7, 9, 1];
    expect(summarize(xs)).toEqual(summarize(xs));
  });

  it('returns NaN for an empty sample rather than 0', () => {
    expect(mean([])).toBeNaN();
    expect(variance([])).toBeNaN();
  });
});

function fitResult(overall: number, dims: number[]): FitResult {
  const [skillsMatch, experienceLevel, domainIndustry, keywordCoverage, educationCerts] = dims;
  return {
    overall,
    dimensions: { skillsMatch, experienceLevel, domainIndustry, keywordCoverage, educationCerts },
    strengths: ['a', 'b', 'c'],
    gaps: ['x', 'y', 'z'],
    suggestion: 'do the thing',
    actionPlan: ['one', 'two'],
  };
}

describe('aggregateRuns', () => {
  it('summarizes overall and every dimension across runs', () => {
    const runs = [
      fitResult(6, [8, 6, 4, 6, 2]),
      fitResult(8, [10, 8, 6, 8, 4]),
    ];
    const agg = aggregateRuns(runs);

    expect(agg.overall.mean).toBe(7);
    expect(agg.overall.values).toEqual([6, 8]);
    expect(agg.dimensions.skillsMatch.mean).toBe(9); // (8+10)/2
    expect(agg.dimensions.educationCerts.mean).toBe(3); // (2+4)/2
    // variance of [8,10] = ((8-9)^2 + (10-9)^2)/2 = 1
    expect(agg.dimensions.skillsMatch.variance).toBe(1);
  });

  it('reports zero variance when the model is perfectly consistent', () => {
    const runs = [fitResult(7, [8, 7, 6, 5, 4]), fitResult(7, [8, 7, 6, 5, 4])];
    const agg = aggregateRuns(runs);
    expect(agg.overall.variance).toBe(0);
    for (const k of ['skillsMatch', 'experienceLevel', 'domainIndustry', 'keywordCoverage', 'educationCerts'] as const) {
      expect(agg.dimensions[k].variance).toBe(0);
    }
  });
});
