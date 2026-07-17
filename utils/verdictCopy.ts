import type { FitResult } from './scorer';
import { DIMENSION_LABELS, DIMENSION_WEIGHTS, strongestWeakest } from './dimensions';
import { scoreBand } from './scoreBand';

// FitResult has no narrative fields, so the connective copy in the panel is
// derived here from the numbers it does return. Pure + tested so the wording is
// reviewable in one place.

export function verdictHeadline(overall: number): string {
  const band = scoreBand(overall);
  if (band === 'green') return 'Strong match';
  if (band === 'amber') return 'Possible with work';
  return 'Not yet a match';
}

/** Whether there is a genuinely weak axis worth framing as a gap. The lowest
 *  dimension is only a "gap" if it isn't in the green band (≤ 6) — a 7+ is not a
 *  weakness, so at the top of the range there is nothing to call out. */
export function hasWeakAxis(dimensions: FitResult['dimensions']): boolean {
  const { weakest } = strongestWeakest(dimensions);
  return scoreBand(dimensions[weakest]) !== 'green';
}

/** One sentence contrasting the strongest and weakest dimensions. */
export function verdictSummary(dimensions: FitResult['dimensions']): string {
  const { strongest, weakest } = strongestWeakest(dimensions);
  const s = DIMENSION_LABELS[strongest];
  const w = DIMENSION_LABELS[weakest];
  if (strongest === weakest) {
    return `Scores are even across the board — ${s.toLowerCase()} at ${dimensions[strongest]}/10.`;
  }
  if (!hasWeakAxis(dimensions)) {
    // Even the weakest dimension is strong — don't call a 7+ a gap.
    return `Strong across every dimension — your lowest, ${w.toLowerCase()}, still scores ${dimensions[weakest]}/10.`;
  }
  return `${s} is your strongest at ${dimensions[strongest]}/10, while ${w} is the gap at ${dimensions[weakest]}/10.`;
}

/** Evidence "what moved the number" lead — the weakest dimension and its weight. */
export function evidenceLead(overall: number, dimensions: FitResult['dimensions']): string {
  const { weakest } = strongestWeakest(dimensions);
  if (!hasWeakAxis(dimensions)) {
    // Nothing dragged the score down — every axis is in the green band.
    return `Nothing drags this down — every dimension scores ${dimensions[weakest]}/10 or better.`;
  }
  const label = DIMENSION_LABELS[weakest];
  const weight = DIMENSION_WEIGHTS[weakest];
  return `${label} scored ${dimensions[weakest]} of 10. It carries ${weight}% of the weight, which is what pulls the overall to ${overall}.`;
}

export interface PlanStep {
  title: string;
  detail: string | null;
}

/** Split an actionPlan item into a title + detail. The prompt asks for
 *  "<area>: <next step>", but never assume it — with no colon, the whole
 *  string is the title and there is no detail. */
export function splitActionStep(step: string): PlanStep {
  const idx = step.indexOf(': ');
  if (idx === -1) return { title: step.trim(), detail: null };
  return {
    title: step.slice(0, idx).trim(),
    detail: step.slice(idx + 2).trim() || null,
  };
}
