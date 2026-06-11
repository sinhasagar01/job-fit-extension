import type { ScoringClient, FitResult } from './scorer';
import { validateFitResult } from './scorer';

const STRENGTHS = [
  'Strong alignment with required technical skills',
  'Years of experience match the seniority level',
  'Domain expertise overlaps well with the industry',
  'Resume keywords closely mirror job posting language',
  'Relevant certifications demonstrate foundational knowledge',
];

const GAPS = [
  'Missing explicit mention of required tooling (e.g. Kubernetes)',
  'No demonstrated leadership or cross-functional ownership',
  'Industry background differs from the target sector',
  'Several job-specific keywords absent from resume',
  'No advanced degree or certification listed',
];

const SUGGESTIONS = [
  'Tailor your bullet points to echo the exact phrasing in the JD.',
  "Add a 'Key Skills' section that mirrors the role's required stack.",
  'Quantify impact metrics (e.g. "reduced latency by 40%") to stand out.',
  'Highlight cross-team projects to address the collaboration gap.',
];

function pickDistinct<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, n));
}

function randOffset(): number {
  return Math.floor(Math.random() * 5) - 2;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const mockScoringClient: ScoringClient = {
  async scoreFit(_profileText: string, _jdText: string, _meta?: { title?: string | null; company?: string | null }): Promise<FitResult> {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    const overall = 2 + Math.floor(Math.random() * 8);
    const [s1, s2, s3] = pickDistinct(STRENGTHS, 3);
    const [g1, g2, g3] = pickDistinct(GAPS, 3);
    return validateFitResult({
      overall,
      dimensions: {
        skillsMatch: clamp(overall + randOffset()),
        experienceLevel: clamp(overall + randOffset()),
        domainIndustry: clamp(overall + randOffset()),
        keywordCoverage: clamp(overall + randOffset()),
        educationCerts: clamp(overall + randOffset()),
      },
      strengths: [s1, s2, s3],
      gaps: [g1, g2, g3],
      suggestion: pick(SUGGESTIONS),
    });
  },
};
