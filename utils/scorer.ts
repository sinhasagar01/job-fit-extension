export interface FitResult {
  overall: number;
  dimensions: {
    skillsMatch: number;
    experienceLevel: number;
    domainIndustry: number;
    keywordCoverage: number;
    educationCerts: number;
  };
  strengths: [string, string, string];
  gaps: [string, string, string];
  suggestion: string;
  actionPlan: [string, string] | [string, string, string];
}

export interface ScoringClient {
  scoreFit(
    profileText: string,
    jdText: string,
    meta?: { title?: string | null; company?: string | null }
  ): Promise<FitResult>;
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}

export function validateFitResult(raw: unknown): FitResult {
  if (typeof raw !== 'object' || raw === null) throw new Error('Result is not an object');
  const r = raw as Record<string, unknown>;

  if (typeof r.dimensions !== 'object' || r.dimensions === null)
    throw new Error('Missing field: dimensions');
  const d = r.dimensions as Record<string, unknown>;
  for (const key of ['skillsMatch', 'experienceLevel', 'domainIndustry', 'keywordCoverage', 'educationCerts']) {
    if (typeof d[key] !== 'number') throw new Error(`Missing or invalid dimension: ${key}`);
  }
  if (!Array.isArray(r.strengths) || r.strengths.length < 3)
    throw new Error('strengths must have 3 items');
  if (!Array.isArray(r.gaps) || r.gaps.length < 3)
    throw new Error('gaps must have 3 items');
  if (typeof r.suggestion !== 'string') throw new Error('Missing field: suggestion');
  if (!Array.isArray(r.actionPlan) || r.actionPlan.length < 2 || r.actionPlan.length > 3)
    throw new Error('actionPlan must have 2–3 items');

  const skillsMatch = clamp(d.skillsMatch as number);
  const experienceLevel = clamp(d.experienceLevel as number);
  const domainIndustry = clamp(d.domainIndustry as number);
  const keywordCoverage = clamp(d.keywordCoverage as number);
  const educationCerts = clamp(d.educationCerts as number);

  // weighted mean: skills 30%, experience 25%, keywords 20%, domain 15%, education 10%
  const overall = clamp(
    skillsMatch * 0.30 +
    experienceLevel * 0.25 +
    keywordCoverage * 0.20 +
    domainIndustry * 0.15 +
    educationCerts * 0.10
  );

  return {
    overall,
    dimensions: { skillsMatch, experienceLevel, domainIndustry, keywordCoverage, educationCerts },
    strengths: [
      (r.strengths as string[])[0],
      (r.strengths as string[])[1],
      (r.strengths as string[])[2],
    ],
    gaps: [
      (r.gaps as string[])[0],
      (r.gaps as string[])[1],
      (r.gaps as string[])[2],
    ],
    suggestion: r.suggestion as string,
    actionPlan: (r.actionPlan as string[]).slice(0, 3) as [string, string] | [string, string, string],
  };
}
