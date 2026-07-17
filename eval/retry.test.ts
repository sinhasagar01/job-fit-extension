import { describe, expect, it, vi } from 'vitest';
import { callWithRetry } from './retry';
import { ScoringError } from '../utils/scoringError';

const noSleep = async () => {};

describe('callWithRetry', () => {
  it('succeeds without retrying when fn resolves', async () => {
    const fn = vi.fn(async () => 'ok');
    const out = await callWithRetry(fn, { maxRetries: 3, backoffMs: 10, sleep: noSleep });
    expect(out).toEqual({ ok: true, result: 'ok', retriesUsed: 0 });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries a retriable error then succeeds, counting retries + backing off exponentially', async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      if (++calls <= 2) throw new ScoringError('rate limit', { status: 429, retriable: true });
      return 'ok';
    });
    const sleep = vi.fn(async () => {});
    const out = await callWithRetry(fn, { maxRetries: 3, backoffMs: 10, sleep });

    expect(out).toEqual({ ok: true, result: 'ok', retriesUsed: 2 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 10); // backoff * 2^0
    expect(sleep).toHaveBeenNthCalledWith(2, 20); // backoff * 2^1
  });

  it('exhausts maxRetries on a persistent retriable error and fails with status', async () => {
    const fn = vi.fn(async () => {
      throw new ScoringError('Rate limit reached.', { status: 429, retriable: true });
    });
    const out = await callWithRetry(fn, { maxRetries: 2, backoffMs: 1, sleep: noSleep });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(429);
      expect(out.message).toContain('Rate limit');
      expect(out.retriesUsed).toBe(2);
    }
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry a non-retriable error (e.g. invalid key)', async () => {
    const fn = vi.fn(async () => {
      throw new ScoringError('Invalid API key.', { status: 401, retriable: false });
    });
    const sleep = vi.fn(async () => {});
    const out = await callWithRetry(fn, { maxRetries: 3, backoffMs: 1, sleep });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.status).toBe(401);
      expect(out.retriesUsed).toBe(0);
    }
    expect(fn).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
