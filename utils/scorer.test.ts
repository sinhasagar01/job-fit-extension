import { describe, expect, it } from 'vitest';
import { validateFitResult, type FitResult } from './scorer';

// These assertions describe the *intended* contract of validateFitResult as
// specified in TASKS.md Task 0.2 — not whatever the current code happens to do.
// If the implementation diverges from the contract, the failing test is the
// signal, and the fix belongs in the implementation.
//
// Contract under test:
//  - overall is ALWAYS recomputed from the dimensions as a weighted mean
//    (skills 30%, experience 25%, keywords 20%, domain 15%, education 10%),
//    then clamped/rounded to an integer in [1, 10]. Any model-supplied
//    `overall` is ignored.
//  - Each dimension is clamped into [1, 10] and rounded.
//  - dimensions, strengths, gaps, and suggestion are required; a missing one
//    throws rather than producing a malformed result.
//  - A non-numeric or null dimension throws rather than yielding NaN.

/** A fresh, fully-valid raw model payload. Dimensions are all in-range so
 *  clamping is a no-op and callers can override individual fields per test. */
function validPayload(): Record<string, unknown> {
  return {
    dimensions: {
      skillsMatch: 8,
      experienceLevel: 7,
      domainIndustry: 6,
      keywordCoverage: 5,
      educationCerts: 4,
    },
    strengths: ['s1', 's2', 's3'],
    gaps: ['g1', 'g2', 'g3'],
    suggestion: 'Tailor your resume to the JD.',
    actionPlan: ['Learn X', 'Build Y'],
  };
}

describe('validateFitResult — valid payload', () => {
  it('returns a FitResult with every field intact', () => {
    const result = validateFitResult(validPayload());

    expect(result.dimensions).toEqual({
      skillsMatch: 8,
      experienceLevel: 7,
      domainIndustry: 6,
      keywordCoverage: 5,
      educationCerts: 4,
    });
    expect(result.strengths).toEqual(['s1', 's2', 's3']);
    expect(result.gaps).toEqual(['g1', 'g2', 'g3']);
    expect(result.suggestion).toBe('Tailor your resume to the JD.');
    expect(result.actionPlan).toEqual(['Learn X', 'Build Y']);
    expect(typeof result.overall).toBe('number');
  });
});

describe('validateFitResult — dimension clamping', () => {
  it('clamps a dimension above 10 down to 10', () => {
    const payload = validPayload();
    (payload.dimensions as Record<string, number>).skillsMatch = 15;

    expect(validateFitResult(payload).dimensions.skillsMatch).toBe(10);
  });

  it('clamps a dimension below 1 up to 1', () => {
    const payload = validPayload();
    (payload.dimensions as Record<string, number>).educationCerts = -3;

    expect(validateFitResult(payload).dimensions.educationCerts).toBe(1);
  });

  it('rounds a fractional dimension to the nearest integer', () => {
    const payload = validPayload();
    (payload.dimensions as Record<string, number>).experienceLevel = 7.6;

    expect(validateFitResult(payload).dimensions.experienceLevel).toBe(8);
  });
});

describe('validateFitResult — overall is recomputed, never trusted', () => {
  it('ignores a model-supplied overall and recomputes from the weighted mean', () => {
    const payload = validPayload();
    payload.overall = 999; // model lies about the overall
    (payload.dimensions as Record<string, number>) = {
      skillsMatch: 10,
      experienceLevel: 8,
      keywordCoverage: 6,
      domainIndustry: 4,
      educationCerts: 2,
    };

    // 10*.30 + 8*.25 + 6*.20 + 4*.15 + 2*.10 = 7.0
    expect(validateFitResult(payload).overall).toBe(7);
  });

  it('computes the weighted mean with the specified dimension weights', () => {
    // A second, independent point on the weighting function.
    // skills 3, experience 5, keywords 7, domain 9, education 1:
    // 3*.30 + 5*.25 + 7*.20 + 9*.15 + 1*.10 = 0.9+1.25+1.4+1.35+0.1 = 5.0
    const payload = validPayload();
    (payload.dimensions as Record<string, number>) = {
      skillsMatch: 3,
      experienceLevel: 5,
      keywordCoverage: 7,
      domainIndustry: 9,
      educationCerts: 1,
    };

    expect(validateFitResult(payload).overall).toBe(5);
  });

  it('weights skillsMatch most heavily (30%)', () => {
    // All dimensions at 1 except skillsMatch at 10:
    // 10*.30 + 1*.25 + 1*.20 + 1*.15 + 1*.10 = 3.0 + 0.70 = 3.70 -> rounds to 4.
    // A different single dimension at 10 (e.g. education 10%) would round to 2,
    // so this pins skills as the dominant weight.
    const payload = validPayload();
    (payload.dimensions as Record<string, number>) = {
      skillsMatch: 10,
      experienceLevel: 1,
      keywordCoverage: 1,
      domainIndustry: 1,
      educationCerts: 1,
    };

    expect(validateFitResult(payload).overall).toBe(4);
  });
});

describe('validateFitResult — required fields', () => {
  const requiredFields: Array<keyof ReturnType<typeof validPayload> | string> = [
    'dimensions',
    'strengths',
    'gaps',
    'suggestion',
  ];

  for (const field of requiredFields) {
    it(`throws when '${field}' is missing`, () => {
      const payload = validPayload();
      delete payload[field];

      expect(() => validateFitResult(payload)).toThrow();
    });
  }

  it('throws when a single dimension is missing', () => {
    const payload = validPayload();
    delete (payload.dimensions as Record<string, unknown>).keywordCoverage;

    expect(() => validateFitResult(payload)).toThrow();
  });

  it('throws when the raw value is not an object', () => {
    expect(() => validateFitResult(null)).toThrow();
    expect(() => validateFitResult('nope')).toThrow();
  });
});

describe('validateFitResult — suggestion must be present and non-empty', () => {
  // Reproduction for Task 2.1: Commenda produced a result with a blank
  // suggestion. A missing suggestion already throws; the gap is that an empty
  // or whitespace-only string is a required-field violation too — it renders
  // as an empty "Suggestion" section rather than a real recommendation.
  it('throws when suggestion is an empty string', () => {
    const payload = validPayload();
    payload.suggestion = '';
    expect(() => validateFitResult(payload)).toThrow();
  });

  it('throws when suggestion is whitespace only', () => {
    const payload = validPayload();
    payload.suggestion = '   \n\t ';
    expect(() => validateFitResult(payload)).toThrow();
  });

  it('trims surrounding whitespace from a valid suggestion', () => {
    const payload = validPayload();
    payload.suggestion = '  Highlight your Kubernetes experience.  ';
    expect(validateFitResult(payload).suggestion).toBe('Highlight your Kubernetes experience.');
  });
});

describe('validateFitResult — invalid dimension values', () => {
  it('throws on a non-numeric (string) dimension rather than returning NaN', () => {
    const payload = validPayload();
    (payload.dimensions as Record<string, unknown>).skillsMatch = 'high';

    let result: FitResult | undefined;
    expect(() => {
      result = validateFitResult(payload);
    }).toThrow();
    // Guard against a "passes but produces NaN" regression.
    expect(result?.overall).not.toBeNaN();
  });

  it('throws on a null dimension rather than returning NaN', () => {
    const payload = validPayload();
    (payload.dimensions as Record<string, unknown>).experienceLevel = null;

    expect(() => validateFitResult(payload)).toThrow();
  });
});
