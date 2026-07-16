import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { extractJd } from './extractJd';

// These assertions describe the intended contract of extractJd (TASKS.md
// Task 1.3): for a real job page it must return a JD of at least 200 chars
// and a non-null title; for a JD-free page it must return null rather than
// hallucinate a match. Fixtures are real saved pages (or, for the SPA case,
// the real board API response) captured in test/fixtures/.

const fixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'test/fixtures', name), 'utf8');

/** Build a Document from saved HTML without executing its scripts. */
const docFrom = (name: string): Document => new JSDOM(fixture(name)).window.document;

/** A minimal, JD-free document (used when the JD comes from elsewhere). */
const emptyDoc = (): Document =>
  new JSDOM('<!doctype html><html><head><title>x</title></head><body></body></html>').window.document;

/** A fetch mock that resolves the given JSON with an ok response. */
const fetchReturning = (json: unknown) =>
  vi.fn(async () => ({ ok: true, json: async () => json })) as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Server-rendered pages: extract from the live DOM.
// ---------------------------------------------------------------------------

describe('extractJd — previously-failing server-rendered sites', () => {
  it('extracts the JD from a YC company jobs page (no article/main/section tags)', async () => {
    const result = await extractJd(
      docFrom('yc-solve-intelligence.html'),
      'https://www.ycombinator.com/companies/solve-intelligence/jobs'
    );
    expect(result).not.toBeNull();
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).not.toBeNull();
    // Must be the JD itself, not a whole-page grab: real JD prose present,
    // site chrome (global footer) absent.
    expect(result!.text).toContain('MoM revenue growth');
    expect(result!.text).not.toContain('© 2026 Y Combinator');
  });

  it('extracts the JD from a Commenda careers page', async () => {
    const result = await extractJd(
      docFrom('commenda-product-builder.html'),
      'https://commenda.io/careers/product-builder'
    );
    expect(result).not.toBeNull();
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).not.toBeNull();
    expect(result!.text).toContain('Work side by side with engineers');
    expect(result!.text).not.toContain('© 2026 Commenda');
  });
});

// ---------------------------------------------------------------------------
// Ashby: SPA shell — JD comes from the public posting API, not the DOM.
// ---------------------------------------------------------------------------

describe('extractJd — Ashby (API special-case)', () => {
  const board = JSON.parse(fixture('ashby/phantom-jobboard.json'));
  const jobId = 'e7b83c02-55c2-4037-9209-93deb3b7492c'; // Senior Software Engineer, Frontend
  const jobUrl = `https://jobs.ashbyhq.com/phantom/${jobId}`;

  it('fetches the board API and returns the matching job description', async () => {
    const fetchMock = fetchReturning(board);
    const result = await extractJd(emptyDoc(), jobUrl, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith('https://api.ashbyhq.com/posting-api/job-board/phantom');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Senior Software Engineer, Frontend');
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
  });

  it('returns null when the job id is not on the board (no DOM JD to fall back to)', async () => {
    const fetchMock = fetchReturning(board);
    const missing = 'https://jobs.ashbyhq.com/phantom/00000000-0000-0000-0000-000000000000';
    const result = await extractJd(emptyDoc(), missing, fetchMock);
    expect(result).toBeNull();
  });

  it('does not call the API for a non-Ashby URL', async () => {
    const fetchMock = fetchReturning(board);
    await extractJd(docFrom('commenda-product-builder.html'), 'https://commenda.io/careers/product-builder', fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Known-working sites: exercised through their dedicated selectors, which are
// tried before the fallback. These lock the selector contract so the fallback
// changes can't silently regress selector-matched sites.
// ---------------------------------------------------------------------------

describe('extractJd — known-selector sites (regression guards)', () => {
  const body = (html: string) =>
    new JSDOM(`<!doctype html><html><head><title>Job</title></head><body>${html}</body></html>`)
      .window.document;
  const filler =
    'We are looking for an experienced engineer to join our team. '.repeat(6); // > 200 chars

  it('LinkedIn: reads #job-details', async () => {
    const doc = body(`<h1 class="top-card-layout__title">Staff Engineer</h1><div id="job-details">${filler}</div>`);
    const result = await extractJd(doc, 'https://www.linkedin.com/jobs/view/123');
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).toBe('Staff Engineer');
  });

  it('Greenhouse: reads .job__description', async () => {
    const doc = body(`<h1 class="app-title">Backend Engineer</h1><div class="job__description">${filler}</div>`);
    const result = await extractJd(doc, 'https://boards.greenhouse.io/acme/jobs/123');
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).toBe('Backend Engineer');
  });

  it('Lever: reads .posting-description', async () => {
    const doc = body(`<div class="posting-headline"><h2>Product Manager</h2></div><div class="posting-description">${filler}</div>`);
    const result = await extractJd(doc, 'https://jobs.lever.co/acme/123');
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).toBe('Product Manager');
  });
});

// ---------------------------------------------------------------------------
// Negative case: a genuinely JD-free page must return null, not a false match.
// ---------------------------------------------------------------------------

describe('extractJd — JD-free page', () => {
  it('returns null for example.com (no job description to find)', async () => {
    const result = await extractJd(docFrom('example-com.html'), 'https://example.com/');
    expect(result).toBeNull();
  });
});
