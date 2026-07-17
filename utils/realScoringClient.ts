import type { ScoringClient, FitResult } from './scorer';
import { validateFitResult } from './scorer';
import { ScoringError } from './scoringError';
import { buildPrompt, apiDetail, isApiKeyInvalid, isQuotaError } from './scoringUtils';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export function createRealScoringClient(apiKey: string, temperature = 0.1): ScoringClient {
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
          generationConfig: { temperature, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
        }),
      };

      let response: Response;
      try {
        response = await fetch(GEMINI_URL, requestInit);
      } catch {
        throw new ScoringError('Network error. Please check your connection.', { retriable: true });
      }

      if (response.status === 429 || response.status === 503) {
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        try {
          response = await fetch(GEMINI_URL, requestInit);
        } catch {
          throw new ScoringError('Network error. Please check your connection.', { retriable: true });
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
          throw new ScoringError(`Invalid API key. Check your key in Settings.${detail}`, {
            status: response.status,
            retriable: false,
          });
        }
        if (response.status === 429) {
          throw new ScoringError(`Rate limit reached. Please wait a moment and try again.${detail}`, {
            status: 429,
            retriable: !isQuotaError(body), // exhausted quota won't clear mid-run → fail fast
          });
        }
        throw new ScoringError(`Scoring failed (HTTP ${response.status}). Please try again.${detail}`, {
          status: response.status,
          retriable: response.status >= 500,
        });
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
        const rawDetail = import.meta.env.DEV ? ` (raw: ${cleaned.slice(0, 200)})` : '';
        throw new ScoringError(`Scoring failed: unexpected response format. Please try again.${rawDetail}`, {
          status: response.status,
          retriable: false,
        });
      }

      return validateFitResult(parsed);
    },
  };
}
