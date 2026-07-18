import { buildPrompt, validateFitResult, type FitResult } from '../../utils/shared/scoringContract';
import type { Env } from './env';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Call OpenAI and return a validated FitResult. Throws a generic Error on any
 * provider/parse/validation failure — the caller maps every throw to
 * `provider_error`. Zero-retention: no throw message, and no code path here,
 * ever includes profileText/jdText/meta or the provider's raw text (that would
 * risk leaking into a log line).
 */
export async function scoreWithOpenAI(
  env: Env,
  input: { profileText: string; jdText: string; meta?: { title?: string | null; company?: string | null } },
): Promise<FitResult> {
  const prompt = buildPrompt(input.profileText, input.jdText, input.meta);

  let response: Response;
  try {
    response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2048,
        // No response_format: json_object — provider JSON mode is optional and
        // never load-bearing (Groq's strict mode was the ~40%-failure bug). We
        // let it return text and rely on the brace-extraction backstop below.
      }),
    });
  } catch {
    throw new Error('provider request failed');
  }

  if (!response.ok) throw new Error(`provider returned ${response.status}`);

  const data = (await response.json()) as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  const rawText =
    ((choices?.[0]?.message as Record<string, unknown> | undefined)?.content as string | undefined) ?? '';

  // Mirrors utils/openaiCompatScoringClient.ts:101–130, minus the
  // import.meta.env.DEV raw-detail (workerd has no import.meta.env, and echoing
  // raw text would violate zero-retention).
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // backstop: extract the outermost {...} in case of surrounding noise
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first !== -1 && last > first) {
      try {
        parsed = JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        // fall through
      }
    }
    if (parsed === undefined) throw new Error('unexpected provider response format');
  }

  // validateFitResult throws a detailed Error on bad shape; swallow the detail
  // (it could quote model text) and surface a generic failure.
  try {
    return validateFitResult(parsed);
  } catch {
    throw new Error('provider response failed validation');
  }
}
