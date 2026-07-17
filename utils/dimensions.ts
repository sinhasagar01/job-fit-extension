import type { FitResult } from './scorer';

/** The five scoring dimensions, their display labels, and their weights in the
 *  weighted-mean overall. Single source of truth for anything that renders or
 *  reasons about dimensions (the panel UI, the eval harness). The weights match
 *  validateFitResult's weighted mean (skills 30 / experience 25 / keywords 20 /
 *  domain 15 / education 10). */
export const DIMENSION_KEYS = [
  'skillsMatch',
  'experienceLevel',
  'domainIndustry',
  'keywordCoverage',
  'educationCerts',
] as const;
export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  skillsMatch: 'Skills',
  experienceLevel: 'Experience',
  domainIndustry: 'Domain',
  keywordCoverage: 'Keywords',
  educationCerts: 'Education',
};

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  skillsMatch: 30,
  experienceLevel: 25,
  keywordCoverage: 20,
  domainIndustry: 15,
  educationCerts: 10,
};

/** Highest- and lowest-scoring dimensions. Ties resolve to the first in
 *  DIMENSION_KEYS order (stable). */
export function strongestWeakest(dimensions: FitResult['dimensions']): {
  strongest: DimensionKey;
  weakest: DimensionKey;
} {
  let strongest: DimensionKey = DIMENSION_KEYS[0];
  let weakest: DimensionKey = DIMENSION_KEYS[0];
  for (const k of DIMENSION_KEYS) {
    if (dimensions[k] > dimensions[strongest]) strongest = k;
    if (dimensions[k] < dimensions[weakest]) weakest = k;
  }
  return { strongest, weakest };
}
