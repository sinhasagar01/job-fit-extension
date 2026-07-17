import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { baselineOutputPath } from './baselinePath';

// The invariant this guards: an invalid (incomplete) run must never be written
// to the same path as a valid one. Committing a `complete: false` baseline as if
// it were real is what happened in 69f7cfa; routing invalid runs into a
// gitignored .incomplete/ directory makes that impossible via `git add -A`.

describe('baselineOutputPath', () => {
  const base = '/repo/eval/baselines';

  it('writes a valid (complete) run to eval/baselines/<provider>.json', () => {
    expect(baselineOutputPath('gemini', true, base)).toBe(resolve(base, 'gemini.json'));
  });

  it('quarantines an invalid (incomplete) run under .incomplete/<provider>.json', () => {
    expect(baselineOutputPath('gemini', false, base)).toBe(resolve(base, '.incomplete', 'gemini.json'));
  });

  it('never routes an invalid run to the committed path (valid and invalid diverge)', () => {
    for (const provider of ['gemini', 'groq', 'mock']) {
      const valid = baselineOutputPath(provider, true, base);
      const invalid = baselineOutputPath(provider, false, base);
      expect(invalid).not.toBe(valid);
      // Valid path is the base dir; invalid path is under the quarantine dir.
      expect(dirOf(valid)).toBe(base);
      expect(dirOf(invalid)).toBe(resolve(base, '.incomplete'));
    }
  });
});

const dirOf = (p: string): string => p.slice(0, p.lastIndexOf('/'));
