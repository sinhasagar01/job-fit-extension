export type ScoreBand = 'red' | 'amber' | 'green';

/** Map a 1–10 score to a colour band. Thresholds match the original FitScore
 *  component (≤4 red, ≤6 amber, else green) — kept here as the single source so
 *  the verdict ring and the dimension bars can't drift apart. */
export function scoreBand(score: number): ScoreBand {
  if (score <= 4) return 'red';
  if (score <= 6) return 'amber';
  return 'green';
}
