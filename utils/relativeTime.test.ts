import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const NOW = 1_000_000_000_000;
const ago = (ms: number) => relativeTime(NOW - ms, NOW);
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe('relativeTime', () => {
  it('reads seconds as "Just now"', () => {
    expect(ago(5 * SEC)).toBe('Just now');
  });
  it('pluralizes minutes and hours', () => {
    expect(ago(1 * MIN)).toBe('1 minute ago');
    expect(ago(2 * MIN)).toBe('2 minutes ago');
    expect(ago(1 * HOUR)).toBe('1 hour ago');
  });
  it('uses "Yesterday" for one day and "N days ago" up to a week', () => {
    expect(ago(1 * DAY)).toBe('Yesterday');
    expect(ago(3 * DAY)).toBe('3 days ago');
  });
  it('uses weeks, then falls back to a date', () => {
    expect(ago(2 * 7 * DAY)).toBe('2 weeks ago');
    expect(ago(60 * DAY)).toBe(new Date(NOW - 60 * DAY).toLocaleDateString());
  });
  it('never returns a negative age', () => {
    expect(relativeTime(NOW + 5 * SEC, NOW)).toBe('Just now');
  });
});
