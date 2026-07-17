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

/** One sentence contrasting the strongest and weakest dimensions. */
export function verdictSummary(dimensions: FitResult['dimensions']): string {
  const { strongest, weakest } = strongestWeakest(dimensions);
  const s = DIMENSION_LABELS[strongest];
  const w = DIMENSION_LABELS[weakest];
  if (strongest === weakest) {
    return `Scores are even across the board — ${s.toLowerCase()} at ${dimensions[strongest]}/10.`;
  }
  return `${s} is your strongest at ${dimensions[strongest]}/10, while ${w} is the gap at ${dimensions[weakest]}/10.`;
}

/** Evidence "what moved the number" lead — the weakest dimension and its weight. */
export function evidenceLead(overall: number, dimensions: FitResult['dimensions']): string {
  const { weakest } = strongestWeakest(dimensions);
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
