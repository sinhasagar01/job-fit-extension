// buildPrompt + the char limits now live in ./shared/scoringContract (shared
// with the Worker); re-exported here so existing `from './scoringUtils'` imports
// are unchanged. apiDetail stays below — it references import.meta.env.DEV, which
// must NOT reach the Worker/shared module. isQuotaError / isApiKeyInvalid are
// client-side classifiers and stay here too.
export { buildPrompt, PROFILE_CHAR_LIMIT, JD_CHAR_LIMIT } from './shared/scoringContract';

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
