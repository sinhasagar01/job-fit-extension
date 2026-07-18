import { describe, expect, it } from 'vitest';
import { getInstallToken } from './installToken';
import { __seedStorage } from '../test/setup';

// storage resets before every test (test/setup.ts) → a fresh test == cleared storage.
describe('getInstallToken', () => {
  it('generates once and returns the same token on repeated reads', async () => {
    const first = await getInstallToken();
    const second = await getInstallToken();
    expect(second).toBe(first);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('returns a pre-seeded token unchanged (never regenerates)', async () => {
    __seedStorage({ installToken: 'existing-token-abc' });
    expect(await getInstallToken()).toBe('existing-token-abc');
    expect(await getInstallToken()).toBe('existing-token-abc');
  });

  it('cleared storage generates exactly one new token, then reuses it', async () => {
    const created = await getInstallToken(); // first call generates
    const reused = await getInstallToken(); // second call must NOT generate a new one
    expect(reused).toBe(created);
  });
});
