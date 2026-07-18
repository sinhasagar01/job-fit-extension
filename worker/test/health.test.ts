import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// Proves the workerd test pool runs and the stub responds. The real /score
// tests — per-token limit, per-IP, oversized body, each typed error, and
// global-cap → 503 with ZERO provider calls (assert the fetch spy is never
// invoked) — arrive with the handler in Task 4.1.
describe('worker scaffold', () => {
  it('returns 501 not_implemented from the stub', async () => {
    const res = await SELF.fetch('http://worker.local/score', { method: 'POST' });
    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ error: 'not_implemented' });
  });
});
