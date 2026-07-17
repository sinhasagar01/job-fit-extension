import { DIMENSION_KEYS } from './stats';

// Quantifies how a config change moved per-dimension variance between two eval
// baselines (Task 3.2: "document what moved the numbers"). Works on the shape
// runEval.ts writes; only the stddev + validity fields are needed here.
//
// Validity gate: this tool decides Task 3.2, so it must never compare invalid
// data. It refuses any baseline that isn't `complete` (every pair n==runs, 0
// failures), and skips any pair flagged `reliable === false` (n<3).

interface StatLike {
  stddev: number;
}
interface AggregateLike {
  overall: StatLike;
  dimensions: Record<string, StatLike>;
}
export interface PairLike {
  id: string;
  reliable?: boolean;
  aggregate: AggregateLike | null;
}
export interface BaselineLike {
  complete?: boolean;
  pairs: PairLike[];
}

export interface DimDelta {
  dimension: string;
  before: number;
  after: number;
  delta: number;
}
export interface PairComparison {
  id: string;
  deltas: DimDelta[];
}
export interface RefusedPair {
  id: string;
  reason: string;
}
export interface CompareResult {
  pairs: PairComparison[];
  /** Pairs skipped because one side was unreliable (n<3) or had no aggregate. */
  refusedPairs: RefusedPair[];
  meanStddevBefore: number;
  meanStddevAfter: number;
  /** Worst single dimension stddev among the reliably-compared "after" pairs. */
  maxStddevAfter: number;
  bound: number;
  withinBound: boolean;
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

const usable = (p: PairLike): boolean => p.reliable !== false && p.aggregate != null;

/**
 * Compare two baselines pair-by-pair. THROWS if either baseline is not
 * `complete` — an incomplete baseline must never reach a comparison. Pairs are
 * matched by id; a pair that is unreliable (n<3) in either baseline is refused
 * (recorded in `refusedPairs`, not compared). `bound` is the agreed per-dimension
 * stddev target; `withinBound` reflects the worst reliably-compared dimension.
 */
export function compareBaselines(before: BaselineLike, after: BaselineLike, bound = 1.0): CompareResult {
  if (before.complete !== true) {
    throw new Error('Refusing to compare: the "before" baseline is not complete (complete !== true). Re-run the harness until every pair scores n==runs with 0 failures.');
  }
  if (after.complete !== true) {
    throw new Error('Refusing to compare: the "after" baseline is not complete (complete !== true). Re-run the harness until every pair scores n==runs with 0 failures.');
  }

  const beforeById = new Map(before.pairs.map((p) => [p.id, p]));

  const pairs: PairComparison[] = [];
  const refusedPairs: RefusedPair[] = [];
  const dimBefore: number[] = [];
  const dimAfter: number[] = [];
  let maxStddevAfter = 0;

  for (const p of after.pairs) {
    const bp = beforeById.get(p.id);
    if (!bp) continue; // pair not present in the "before" set — nothing to compare

    if (!usable(bp) || !usable(p)) {
      const reasons: string[] = [];
      if (!usable(bp)) reasons.push('before unreliable (n<3 or no aggregate)');
      if (!usable(p)) reasons.push('after unreliable (n<3 or no aggregate)');
      refusedPairs.push({ id: p.id, reason: reasons.join('; ') });
      continue;
    }

    const b = bp.aggregate as AggregateLike;
    const a = p.aggregate as AggregateLike;
    const deltas: DimDelta[] = [
      { dimension: 'overall', before: b.overall.stddev, after: a.overall.stddev, delta: a.overall.stddev - b.overall.stddev },
    ];
    for (const k of DIMENSION_KEYS) {
      const bs = b.dimensions[k]?.stddev ?? NaN;
      const as = a.dimensions[k]?.stddev ?? NaN;
      deltas.push({ dimension: k, before: bs, after: as, delta: as - bs });
      dimBefore.push(bs);
      dimAfter.push(as);
      if (Number.isFinite(as) && as > maxStddevAfter) maxStddevAfter = as;
    }
    pairs.push({ id: p.id, deltas });
  }

  return {
    pairs,
    refusedPairs,
    meanStddevBefore: mean(dimBefore),
    meanStddevAfter: mean(dimAfter),
    maxStddevAfter,
    bound,
    withinBound: maxStddevAfter <= bound,
  };
}
