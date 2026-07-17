import { describe, expect, it } from 'vitest';
import { isQuotaError } from './scoringUtils';

describe('isQuotaError', () => {
  it('is true for Gemini RESOURCE_EXHAUSTED', () => {
    expect(isQuotaError({ error: { status: 'RESOURCE_EXHAUSTED', message: 'anything' } })).toBe(true);
  });

  it('is true when the message mentions quota (case-insensitive)', () => {
    expect(isQuotaError({ error: { message: 'You exceeded your current Quota, check billing.' } })).toBe(true);
  });

  it('is false for a transient rate-limit message (no quota wording)', () => {
    expect(isQuotaError({ error: { message: 'Rate limit reached for tokens per minute (TPM).' } })).toBe(false);
  });

  it('is false for non-object / empty / malformed bodies', () => {
    expect(isQuotaError(null)).toBe(false);
    expect(isQuotaError(undefined)).toBe(false);
    expect(isQuotaError('quota')).toBe(false); // string body, no error object
    expect(isQuotaError({ error: null })).toBe(false);
    expect(isQuotaError({})).toBe(false);
  });
});
