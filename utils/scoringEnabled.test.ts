import { describe, expect, it } from 'vitest';
import { scoringEnabled } from './scoringEnabled';

// The deliverable: an uncertain detection must not auto-enable scoring. This
// is the boundary the "Am I Fit?" button's disabled state is wired to.
describe('scoringEnabled', () => {
  const base = { hasJd: true, stale: false, uncertain: false, confirmed: false };

  it('enables a confident detection without any confirmation', () => {
    expect(scoringEnabled(base)).toBe(true);
  });

  it('does NOT auto-enable an uncertain detection', () => {
    expect(scoringEnabled({ ...base, uncertain: true })).toBe(false);
  });

  it('enables an uncertain detection once the user confirms', () => {
    expect(scoringEnabled({ ...base, uncertain: true, confirmed: true })).toBe(true);
  });

  it('stale always blocks — even a confirmed uncertain detection', () => {
    expect(scoringEnabled({ ...base, stale: true })).toBe(false);
    expect(scoringEnabled({ ...base, stale: true, uncertain: true, confirmed: true })).toBe(false);
  });

  it('no JD never enables, confirmation notwithstanding', () => {
    expect(scoringEnabled({ ...base, hasJd: false })).toBe(false);
    expect(scoringEnabled({ hasJd: false, stale: false, uncertain: true, confirmed: true })).toBe(false);
  });
});
