// The scoring contract shared by three consumers: the extension, the eval
// harness, and the hosted Cloudflare Worker. Keep this file PURE — no
// `import.meta`, no DOM, no node builtins — so workerd can import it. Anything
// environment-specific (e.g. apiDetail's `import.meta.env.DEV`) stays out.
//
// buildPrompt + validateFitResult + FitResult were relocated here verbatim from
// utils/scoringUtils.ts and utils/scorer.ts, which now re-export them so every
// existing import site is unchanged. Do not change the logic here — only its
// home moved.

export const PROFILE_CHAR_LIMIT = 8000;
export const JD_CHAR_LIMIT = 4000;

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

export function buildPrompt(
  profileText: string,
  jdText: string,
  meta?: { title?: string | null; company?: string | null }
): string {
  const job = `${meta?.title ?? 'Unknown'} at ${meta?.company ?? 'Unknown'}`;
  return `You are a resume-to-job-fit scorer. Return ONLY a strict JSON object — no markdown, no explanation.

## Scoring Rubric
1–2  Wrong field entirely; credentials don't align with the role at all
3–4  Right general field but major gaps in required skills, seniority, or domain
5–6  Plausible candidate with notable gaps requiring significant ramp-up
7–8  Strong match on most key requirements; gaps are minor or easily learned
9–10 Near-perfect alignment of seniority, core skills, and domain; rare

Most real candidates score 4–7. A score of 8+ requires specific evidence from the resume — do not award it if requirements are missing or assumed.

## Instructions
1. Identify the top required skills, seniority level, and domain from the job description.
2. For each dimension, find concrete evidence (or absence of evidence) in the candidate profile and assign a score using the rubric:
   - skillsMatch: technical/functional skills overlap with job requirements
   - experienceLevel: seniority and years of relevant experience vs. what the role demands
   - keywordCoverage: role-specific terminology, tools, and technologies present in the profile
   - domainIndustry: candidate's industry/domain background vs. the role's domain
   - educationCerts: relevance of degrees, certifications, or equivalent training
3. Do NOT include an overall score — it will be computed from your dimension scores.
4. Provide 2–3 actionPlan items ordered by impact on the fit score (highest impact first). Each is a single sentence grounded in THIS specific JD and resume: name the exact missing skill, tool, or area called out in the job description, then give one concrete next step (what to learn, build, or add to the resume). Reference the actual technology or requirement by name — not "learn cloud" but "earn AWS Solutions Architect Associate cert to address the cloud infrastructure gap listed in the JD".
5. Write a "suggestion": one specific, non-empty sentence giving the single highest-impact thing this candidate should do to strengthen their fit for THIS role. Never leave it blank or generic — it is required.

Job: ${job}

=== CANDIDATE PROFILE ===
${profileText.slice(0, PROFILE_CHAR_LIMIT)}

=== JOB DESCRIPTION ===
${jdText.slice(0, JD_CHAR_LIMIT)}

Return ONLY this JSON (integers 1–10 per dimension, exactly 3 strings each in strengths/gaps, a non-empty suggestion, 2–3 strings in actionPlan):
{"dimensions":{"skillsMatch":<int>,"experienceLevel":<int>,"domainIndustry":<int>,"keywordCoverage":<int>,"educationCerts":<int>},"strengths":["…","…","…"],"gaps":["…","…","…"],"suggestion":"…","actionPlan":["<skill/area>: <concrete next step>","…"]}`;
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
  // The first 3 entries of strengths/gaps must be non-empty strings — an empty
  // or non-string entry renders as a blank/garbage bullet (same failure class
  // as the empty-suggestion bug).
  for (const [field, arr] of [['strengths', r.strengths], ['gaps', r.gaps]] as const) {
    for (let i = 0; i < 3; i++) {
      const v = (arr as unknown[])[i];
      if (typeof v !== 'string' || v.trim().length === 0)
        throw new Error(`${field} must be 3 non-empty strings`);
    }
  }
  if (typeof r.suggestion !== 'string' || r.suggestion.trim().length === 0)
    throw new Error('Missing field: suggestion');
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
      (r.strengths as string[])[0].trim(),
      (r.strengths as string[])[1].trim(),
      (r.strengths as string[])[2].trim(),
    ],
    gaps: [
      (r.gaps as string[])[0].trim(),
      (r.gaps as string[])[1].trim(),
      (r.gaps as string[])[2].trim(),
    ],
    suggestion: (r.suggestion as string).trim(),
    actionPlan: (r.actionPlan as string[]).slice(0, 3) as [string, string] | [string, string, string],
  };
}
