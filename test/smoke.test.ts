import { describe, expect, it } from 'vitest';

// Trivial harness-liveness check — not a behavioural test. Its only job is to
// prove Vitest, jsdom, and the setup file load and run. Real behavioural tests
// live colocated with their source as *.test.ts (see Task 0.2 onward).
describe('test harness', () => {
  it('runs a passing test', () => {
    expect(1 + 1).toBe(2);
  });

  it('provides jsdom (document is defined)', () => {
    expect(typeof document).toBe('object');
  });

  it('installs the browser.storage.local mock', async () => {
    await browser.storage.local.set({ hello: 'world' });
    const { hello } = await browser.storage.local.get('hello');
    expect(hello).toBe('world');
  });
});
