import type { ScoringClient, FitResult } from './scorer';
import { validateFitResult } from './scorer';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const PROFILE_CHAR_LIMIT = 8000;
const JD_CHAR_LIMIT = 4000;

function buildPrompt(
  profileText: string,
  jdText: string,
  meta?: { title?: string | null; company?: string | null }
): string {
  const job = `${meta?.title ?? 'Unknown'} at ${meta?.company ?? 'Unknown'}`;
  return `You are a resume-to-job-fit scorer. Return ONLY a strict JSON object — no markdown, no explanation.

Job: ${job}

=== CANDIDATE PROFILE ===
${profileText.slice(0, PROFILE_CHAR_LIMIT)}

=== JOB DESCRIPTION ===
${jdText.slice(0, JD_CHAR_LIMIT)}

Return ONLY this JSON (integers 1–10, exactly 3 strings each in strengths/gaps):
{"overall":<int>,"dimensions":{"skillsMatch":<int>,"experienceLevel":<int>,"domainIndustry":<int>,"keywordCoverage":<int>,"educationCerts":<int>},"strengths":["…","…","…"],"gaps":["…","…","…"],"suggestion":"…"}`;
}

function apiDetail(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === 'object' && err !== null) {
      const msg = (err as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg) return ` (API: ${msg})`;
    }
  }
  return '';
}

function isApiKeyInvalid(status: number, body: unknown): boolean {
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

export function createRealScoringClient(apiKey: string): ScoringClient {
  return {
    async scoreFit(
      profileText: string,
      jdText: string,
      meta?: { title?: string | null; company?: string | null }
    ): Promise<FitResult> {
      const prompt = buildPrompt(profileText, jdText, meta);

      const requestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
        }),
      };

      let response: Response;
      try {
        response = await fetch(GEMINI_URL, requestInit);
      } catch {
        throw new Error('Network error. Please check your connection.');
      }

      if (response.status === 429 || response.status === 503) {
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        try {
          response = await fetch(GEMINI_URL, requestInit);
        } catch {
          throw new Error('Network error. Please check your connection.');
        }
      }

      if (!response.ok) {
        let body: unknown = null;
        try {
          body = await response.json();
        } catch {
          // ignore — body may not be JSON
        }

        const detail = apiDetail(body);
        if (isApiKeyInvalid(response.status, body)) {
          throw new Error(`Invalid API key. Check your key in Settings.${detail}`);
        }
        if (response.status === 429) {
          throw new Error(`Rate limit reached. Please wait a moment and try again.${detail}`);
        }
        throw new Error(`Scoring failed (HTTP ${response.status}). Please try again.${detail}`);
      }

      const data = await response.json() as Record<string, unknown>;
      const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
      const rawText =
        (
          (
            (candidates?.[0]?.content as Record<string, unknown> | undefined)
              ?.parts as Array<Record<string, unknown>> | undefined
          )?.[0]?.text as string | undefined
        ) ?? '';

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(`Scoring failed: unexpected response format. Please try again. (raw: ${cleaned.slice(0, 200)})`);
      }

      return validateFitResult(parsed);
    },
  };
}
