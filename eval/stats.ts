import type { FitResult } from '../utils/scorer';

export const DIMENSION_KEYS = [
  'skillsMatch',
  'experienceLevel',
  'domainIndustry',
  'keywordCoverage',
  'educationCerts',
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population variance (÷N) — the spread of the N runs we actually observed. */
export function variance(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

export interface StatSummary {
  mean: number;
  variance: number;
  stddev: number;
  values: number[];
}

export function summarize(values: number[]): StatSummary {
  return { mean: mean(values), variance: variance(values), stddev: stddev(values), values };
}

export interface PairAggregate {
  overall: StatSummary;
  dimensions: Record<DimensionKey, StatSummary>;
}

/** Per-dimension (and overall) mean/variance across N runs of one pair. */
export function aggregateRuns(runs: FitResult[]): PairAggregate {
  const dimensions = Object.fromEntries(
    DIMENSION_KEYS.map((k) => [k, summarize(runs.map((r) => r.dimensions[k]))])
  ) as Record<DimensionKey, StatSummary>;
  return {
    overall: summarize(runs.map((r) => r.overall)),
    dimensions,
  };
}
