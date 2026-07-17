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
// Real Greenhouse + Lever fixtures. Capturing these revealed the original
// selectors were stale: Greenhouse migrated to job-boards.greenhouse.io (the
// old h1.app-title / .job__description no longer match — the h1 + readability
// fallback carry it), and Lever dropped .posting-description in favour of
// data-qa blocks that the code now concatenates.
// ---------------------------------------------------------------------------

describe('extractJd — real Greenhouse + Lever fixtures', () => {
  it('Greenhouse (new job-boards template): extracts the full JD via h1 + fallback', async () => {
    const result = await extractJd(
      docFrom('greenhouse-reddit.html'),
      'https://job-boards.greenhouse.io/reddit/jobs/8012700'
    );
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Acquisition Account Manager, Mid-Market EMEA');
    expect(result!.text).toContain('Reddit is a community of communities');
    expect(result!.text.length).toBeGreaterThan(1000);
  });

  it('Lever (data-qa blocks): concatenates the whole JD, not just the densest section', async () => {
    const result = await extractJd(
      docFrom('lever-palantir.html'),
      'https://jobs.lever.co/palantir/dab396d4-2f14-4796-aac0-0d82883dccf0'
    );
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Forward Deployed Software Engineer');
    // Whole JD present (company blurb + requirements), not the 477-char fragment
    // the density heuristic alone would pick.
    expect(result!.text).toContain('Palantir builds the world');
    expect(result!.text.length).toBeGreaterThan(3000);
  });
});

describe('extractJd — company extraction', () => {
  it('reads the employer from schema.org JSON-LD hiringOrganization', async () => {
    const result = await extractJd(docFrom('generic-jsonld-job.html'), 'https://northwind.example/careers/senior-frontend');
    expect(result).not.toBeNull();
    expect(result!.company).toBe('Northwind Labs');
    expect(result!.title).not.toBeNull();
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
  });

  it('uses JSON-LD, not a Lever location column, for the company', async () => {
    const result = await extractJd(docFrom('lever-palantir.html'), 'https://jobs.lever.co/palantir/x');
    expect(result!.company).toBe('Palantir Technologies');
    expect(result!.company).not.toBe('New York, NY');
  });

  it('returns null company (never the hostname) when no employer source exists', async () => {
    const filler = 'We need a backend engineer to build reliable services and APIs at real scale. '.repeat(4);
    const doc = new JSDOM(
      `<!doctype html><html><head><title>Job</title></head><body><h1>Backend Engineer</h1><main><p>${filler}</p></main></body></html>`
    ).window.document;
    const result = await extractJd(doc, 'https://careers.acme-corp.com/jobs/42');
    expect(result).not.toBeNull();
    expect(result!.company).toBeNull();
  });
});

// LinkedIn uses a persistent #job-details container. Its markup is gated/JS and
// couldn't be captured as a real fixture here, so this stays a synthetic guard
// on the selector path — flagged as unverified against live LinkedIn markup.
describe('extractJd — LinkedIn selector guard (synthetic, unverified vs live)', () => {
  it('reads #job-details', async () => {
    const filler = 'We are looking for an experienced engineer to join our team. '.repeat(6);
    const doc = new JSDOM(
      `<!doctype html><html><head><title>Job</title></head><body><h1 class="top-card-layout__title">Staff Engineer</h1><div id="job-details">${filler}</div></body></html>`
    ).window.document;
    const result = await extractJd(doc, 'https://www.linkedin.com/jobs/view/123');
    expect(result!.text.length).toBeGreaterThanOrEqual(200);
    expect(result!.title).toBe('Staff Engineer');
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
