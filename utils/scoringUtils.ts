export const PROFILE_CHAR_LIMIT = 8000;
export const JD_CHAR_LIMIT = 4000;

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

export function apiDetail(body: unknown): string {
  if (!import.meta.env.DEV) return '';
  if (typeof body === 'object' && body !== null) {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === 'object' && err !== null) {
      const msg = (err as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg) return ` (API: ${msg})`;
    }
  }
  return '';
}

/**
 * True when a 429 body indicates an exhausted quota (Gemini
 * `RESOURCE_EXHAUSTED` / "exceeded your current quota") rather than a momentary
 * rate spike. A quota won't clear mid-run, so the eval harness treats these as
 * non-retriable (fail fast) while real transient 429/503s stay retriable.
 */
export function isQuotaError(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const err = (body as Record<string, unknown>).error;
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.status === 'RESOURCE_EXHAUSTED') return true;
  return typeof e.message === 'string' && /quota/i.test(e.message);
}

export function isApiKeyInvalid(status: number, body: unknown): boolean {
  if (status === 401 || status === 403) return true;
  if (status === 400 && typeof body === 'object' && body !== null) {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;
      if (
        e.status === 'API_KEY_INVALID' ||
        (typeof e.message === 'string' && e.message.includes('API_KEY_INVALID'))
      ) {
        return true;
      }
    }
  }
  return false;
}
