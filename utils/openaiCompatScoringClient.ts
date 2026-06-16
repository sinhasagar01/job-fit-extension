import type { ScoringClient, FitResult } from './scorer';
import { validateFitResult } from './scorer';
import { buildPrompt, apiDetail, isApiKeyInvalid } from './scoringUtils';

export function createOpenAICompatClient({
  baseUrl,
  model,
  apiKey,
}: {
  baseUrl: string;
  model: string;
  apiKey: string;
}): ScoringClient {
  return {
    async scoreFit(
      profileText: string,
      jdText: string,
      meta?: { title?: string | null; company?: string | null }
    ): Promise<FitResult> {
      const prompt = buildPrompt(profileText, jdText, meta);
      const url = `${baseUrl}/chat/completions`;

      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      };

      let response: Response;
      try {
        response = await fetch(url, requestInit);
      } catch {
        throw new Error('Network error. Please check your connection.');
      }

      if (response.status === 429 || response.status === 503) {
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        try {
          response = await fetch(url, requestInit);
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
      const choices = data.choices as Array<Record<string, unknown>> | undefined;
      const choice0 = choices?.[0] as Record<string, unknown> | undefined;
      const finishReason = choice0?.finish_reason as string | undefined;
      const rawText =
        (
          (choice0?.message as Record<string, unknown> | undefined)?.content as string | undefined
        ) ?? '';

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/m, '')
        .replace(/```\s*$/m, '')
        .trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // backstop: extract outermost {...} in case there's surrounding noise
        const first = cleaned.indexOf('{');
        const last = cleaned.lastIndexOf('}');
        if (first !== -1 && last > first) {
          try {
            parsed = JSON.parse(cleaned.slice(first, last + 1));
          } catch {
            // fall through to error below
          }
        }
        if (parsed === undefined) {
          const finishDetail = import.meta.env.DEV && finishReason ? ` finish_reason=${finishReason}` : '';
          const rawDetail = import.meta.env.DEV ? ` (raw: ${cleaned.slice(0, 1000)})` : '';
          throw new Error(
            `Scoring failed: unexpected response format. Please try again.${finishDetail}${rawDetail}`
          );
        }
      }

      return validateFitResult(parsed);
    },
  };
}
