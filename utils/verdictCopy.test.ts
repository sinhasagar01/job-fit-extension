import { describe, expect, it } from 'vitest';
import { scoreBand } from './scoreBand';
import { strongestWeakest } from './dimensions';
import {
  evidenceLead,
  hasWeakAxis,
  splitActionStep,
  verdictHeadline,
  verdictSummary,
} from './verdictCopy';
import type { FitResult } from './scorer';

const dims = (v: number[]): FitResult['dimensions'] => ({
  skillsMatch: v[0],
  experienceLevel: v[1],
  domainIndustry: v[2],
  keywordCoverage: v[3],
  educationCerts: v[4],
});

describe('scoreBand', () => {
  it('maps thresholds: ≤4 red, ≤6 amber, else green', () => {
    expect(scoreBand(1)).toBe('red');
    expect(scoreBand(4)).toBe('red');
    expect(scoreBand(5)).toBe('amber');
    expect(scoreBand(6)).toBe('amber');
    expect(scoreBand(7)).toBe('green');
    expect(scoreBand(10)).toBe('green');
  });
});

describe('strongestWeakest', () => {
  it('finds the highest and lowest dimensions', () => {
    const { strongest, weakest } = strongestWeakest(dims([8, 9, 1, 4, 6]));
    expect(strongest).toBe('experienceLevel');
    expect(weakest).toBe('domainIndustry');
  });
});

describe('verdictHeadline', () => {
  it('reflects the band', () => {
    expect(verdictHeadline(3)).toBe('Not yet a match');
    expect(verdictHeadline(6)).toBe('Possible with work');
    expect(verdictHeadline(9)).toBe('Strong match');
  });
});

describe('weak-axis floor — a 7+ is never a gap (boundary at 6/7)', () => {
  it('hasWeakAxis is true at 6 and false at 7 (the lowest dimension)', () => {
    expect(hasWeakAxis(dims([10, 10, 6, 10, 10]))).toBe(true); // lowest = 6 → weak
    expect(hasWeakAxis(dims([10, 10, 7, 10, 10]))).toBe(false); // lowest = 7 → not weak
  });

  it('verdictSummary does not call a strong lowest dimension a "gap"', () => {
    // The reported bug: a near-perfect profile framed a 9 as the gap.
    const s = verdictSummary(dims([9, 10, 10, 9, 10]));
    expect(s).not.toContain('gap');
    expect(s).toContain('Strong across every dimension');
  });

  it('verdictSummary still names a genuine gap (lowest ≤ 6)', () => {
    const s = verdictSummary(dims([8, 9, 1, 4, 6]));
    expect(s).toContain('is the gap at 1/10');
  });

  it('verdictSummary boundary: 6 is a gap, 7 is not', () => {
    expect(verdictSummary(dims([10, 10, 6, 10, 10]))).toContain('gap at 6/10');
    expect(verdictSummary(dims([10, 10, 7, 10, 10]))).not.toContain('gap');
  });

  it('evidenceLead does not claim a drag when nothing is weak', () => {
    const lead = evidenceLead(10, dims([9, 10, 10, 9, 10]));
    expect(lead).not.toContain('pulls the overall');
    expect(lead).toContain('Nothing drags this down');
  });

  it('evidenceLead boundary: explains the drag at 6, not at 7', () => {
    expect(evidenceLead(6, dims([10, 10, 6, 10, 10]))).toContain('pulls the overall to 6');
    expect(evidenceLead(9, dims([10, 10, 7, 10, 10]))).not.toContain('pulls the overall');
  });
});

describe('verdictSummary / evidenceLead', () => {
  it('names the strongest and weakest dimensions with their scores', () => {
    const summary = verdictSummary(dims([8, 9, 1, 4, 6]));
    expect(summary).toContain('Experience');
    expect(summary).toContain('9/10');
    expect(summary).toContain('Domain');
    expect(summary).toContain('1/10');
  });

  it('cites the weakest dimension weight in the evidence lead', () => {
    // Domain is weakest here; its weight is 15%.
    const lead = evidenceLead(4, dims([8, 9, 1, 4, 6]));
    expect(lead).toContain('Domain scored 1 of 10');
    expect(lead).toContain('15% of the weight');
    expect(lead).toContain('overall to 4');
  });
});

describe('splitActionStep', () => {
  it('splits "<area>: <detail>" into title and detail', () => {
    expect(splitActionStep('Kubernetes: complete a hands-on lab')).toEqual({
      title: 'Kubernetes',
      detail: 'complete a hands-on lab',
    });
  });

  it('falls back to the whole string as title when there is no colon', () => {
    expect(splitActionStep('Lead with your performance work')).toEqual({
      title: 'Lead with your performance work',
      detail: null,
    });
  });

  it('treats an empty detail as no detail', () => {
    expect(splitActionStep('Skills: ')).toEqual({ title: 'Skills', detail: null });
  });
});
