import { DIMENSION_KEYS } from './stats';

// Quantifies how a config change moved per-dimension variance between two eval
// baselines (Task 3.2: "document what moved the numbers"). Works on the shape
// runEval.ts writes; only the stddev fields are needed here.

interface StatLike {
  stddev: number;
}
interface AggregateLike {
  overall: StatLike;
  dimensions: Record<string, StatLike>;
}
export interface PairLike {
  id: string;
  aggregate: AggregateLike | null;
}
export interface BaselineLike {
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
export interface CompareResult {
  pairs: PairComparison[];
  /** Mean stddev across the 5 dimensions of every compared pair. */
  meanStddevBefore: number;
  meanStddevAfter: number;
  /** Worst single dimension stddev in the "after" baseline. */
  maxStddevAfter: number;
  bound: number;
  withinBound: boolean;
}

const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;

/**
 * Compare two baselines pair-by-pair. Pairs are matched by id; a pair missing
 * (or failed → null aggregate) in either baseline is skipped. `bound` is the
 * agreed per-dimension stddev target; `withinBound` is whether the worst
 * "after" dimension meets it.
 */
export function compareBaselines(
  before: BaselineLike,
  after: BaselineLike,
  bound = 1.0
): CompareResult {
  const beforeById = new Map(
    before.pairs.filter((p) => p.aggregate).map((p) => [p.id, p.aggregate as AggregateLike])
  );

  const pairs: PairComparison[] = [];
  const dimBefore: number[] = [];
  const dimAfter: number[] = [];
  let maxStddevAfter = 0;

  for (const p of after.pairs) {
    const b = p.aggregate ? beforeById.get(p.id) : undefined;
    if (!p.aggregate || !b) continue;
    const a = p.aggregate;

    const deltas: DimDelta[] = [
      {
        dimension: 'overall',
        before: b.overall.stddev,
        after: a.overall.stddev,
        delta: a.overall.stddev - b.overall.stddev,
      },
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
    meanStddevBefore: mean(dimBefore),
    meanStddevAfter: mean(dimAfter),
    maxStddevAfter,
    bound,
    withinBound: maxStddevAfter <= bound,
  };
}
