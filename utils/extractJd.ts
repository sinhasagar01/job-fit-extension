export interface JdResult {
  title: string | null;
  company: string | null;
  text: string;
}

/**
 * Extract a job description from the current page.
 *
 * Runs in the page via `chrome.scripting.executeScript({ func: extractJd })`,
 * which serializes ONLY this function's body — every helper and constant must
 * be defined inside it, and it may not reference imports or outer bindings.
 *
 * The `doc`/`href`/`fetchFn` parameters default to the page globals so the
 * in-page call stays arg-free; tests pass their own document, URL, and fetch.
 */
export async function extractJd(
  doc: Document = document,
  href: string = location.href,
  fetchFn: typeof fetch = fetch
): Promise<JdResult | null> {
  const norm = (raw: string): string | null => {
    const t = (raw || '').replace(/\s+/g, ' ').trim();
    return t.length >= 200 ? t : null;
  };

  const getTextContent = (selector: string): string | null => {
    const t = (doc.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return t.length > 0 ? t : null;
  };

  let url: URL | null = null;
  try {
    url = new URL(href);
  } catch {
    url = null;
  }

  // --- Ashby: the job page is a client-side SPA shell (no JD in the DOM at
  //     load), but the board exposes a public posting API keyed by the job id
  //     in the URL: https://jobs.ashbyhq.com/{slug}/{jobId}. The API returns a
  //     clean descriptionPlain, so we prefer it over scraping. ---
  if (url && url.hostname === 'jobs.ashbyhq.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[0];
    const jobId = parts[1];
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId ?? '');
    if (slug && isUuid) {
      try {
        const res = await fetchFn(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
        if (res.ok) {
          const data = (await res.json()) as { jobs?: Array<Record<string, unknown>> };
          const job = (data.jobs ?? []).find((j) => j.id === jobId);
          if (job) {
            const plain =
              typeof job.descriptionPlain === 'string' && job.descriptionPlain
                ? job.descriptionPlain
                : typeof job.descriptionHtml === 'string'
                  ? job.descriptionHtml.replace(/<[^>]+>/g, ' ')
                  : '';
            const text = norm(plain);
            if (text) {
              const ogSite = doc
                .querySelector('meta[property="og:site_name"]')
                ?.getAttribute('content')
                ?.trim();
              const company = ogSite || slug.charAt(0).toUpperCase() + slug.slice(1);
              const title =
                typeof job.title === 'string' && job.title.trim() ? job.title.trim() : null;
              return { title, company, text };
            }
          }
        }
      } catch {
        // Network/parse failure — fall through to DOM extraction below.
      }
    }
  }

  // --- title ---
  const titleSelectors = [
    'h1.top-card-layout__title',       // LinkedIn
    'h1.app-title',                    // Greenhouse
    '.posting-headline h2',            // Lever
    '.ashby-job-posting-heading h1',   // Ashby
  ];
  let title: string | null = null;
  for (const sel of titleSelectors) {
    title = getTextContent(sel);
    if (title) break;
  }
  if (!title) title = getTextContent('h1');
  if (!title) title = doc.title.trim() || null;

  // --- company ---
  // Prefer the employer from schema.org JobPosting JSON-LD — the reliable
  // generic source (a hostname or Lever's location column are not the company).
  const jsonLdCompany = (): string | null => {
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      let data: unknown;
      try {
        data = JSON.parse(script.textContent ?? '');
      } catch {
        continue;
      }
      const graph = (data as { '@graph'?: unknown })['@graph'];
      const nodes = Array.isArray(data) ? data : Array.isArray(graph) ? graph : [data];
      for (const node of nodes) {
        const obj = node as { '@type'?: unknown; hiringOrganization?: unknown };
        const type = obj['@type'];
        const isJob = Array.isArray(type) ? type.includes('JobPosting') : type === 'JobPosting';
        if (!isJob) continue;
        const org = obj.hiringOrganization;
        const name = typeof org === 'string' ? org : (org as { name?: unknown } | null)?.name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
    return null;
  };

  const companySelectors = [
    'a.topcard__org-name-link',       // LinkedIn
    '.top-card-layout__second-title', // LinkedIn (alt)
    '.company-name',                  // Greenhouse
    '[data-testid="company-name"]',   // Ashby
  ];
  let company: string | null = jsonLdCompany();
  for (const sel of companySelectors) {
    if (company) break;
    company = getTextContent(sel);
  }
  if (!company) {
    // og:site_name is the site's name (often the employer on a company site);
    // fall back to it, but never to the hostname — that isn't a company.
    company = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() || null;
  }
  if (!company) {
    // Plain-markup last resort: the document <title> almost always follows a
    // "<role> <sep> <company>" pattern ("Senior Frontend Engineer - Northwind
    // Labs", "… | Acme", "… at Acme"). Split on the separators, drop the part
    // that is the role we already extracted plus generic board noise, and trust
    // it only when exactly one meaningful part remains (so a 3-part or
    // role-only title yields nothing rather than a wrong guess).
    const titleCompany = (): string | null => {
      const docTitle = (doc.title || '').replace(/\s+/g, ' ').trim();
      if (!docTitle) return null;
      const parts = docTitle
        .split(/\s+[|–—·-]\s+|\s+at\s+/i)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length < 2) return null;
      const roleLc = (title ?? '').trim().toLowerCase();
      const noise = /^(careers?|jobs?|hiring|apply|home|job (posting|application|opening)s?)$/i;
      const candidates = parts.filter((p) => {
        const lc = p.toLowerCase();
        if (noise.test(p)) return false;
        if (!roleLc) return true;
        return lc !== roleLc && !roleLc.includes(lc) && !lc.includes(roleLc);
      });
      return candidates.length === 1 ? candidates[0] : null;
    };
    company = titleCompany();
  }

  // --- JD text: known selectors first, then a readability-style fallback ---
  const jdSelectors = [
    '#job-details',                          // LinkedIn
    '.job__description',                     // Greenhouse
    '.posting-description',                  // Lever
    '.ashby-job-posting-description',        // Ashby (older/standard postings)
  ];
  let text: string | null = null;
  for (const sel of jdSelectors) {
    text = norm(doc.querySelector(sel)?.textContent ?? '');
    if (text) break;
  }

  // Lever (current template): no single .posting-description — the JD is split
  // across stable data-qa blocks. Concatenate them so the whole JD is captured,
  // not just the densest section (the readability pass would pick a fragment).
  if (!text) {
    const leverBlocks = [
      ...doc.querySelectorAll(
        '[data-qa="job-description"], [data-qa="posting-requirements"], [data-qa="closing-description"]'
      ),
    ];
    if (leverBlocks.length) {
      text = norm(leverBlocks.map((b) => b.textContent ?? '').join('\n'));
    }
  }

  if (!text) {
    // Readability fallback. The original only considered <article>/<main>/
    // <section>; sites like YC render the JD in bare <div>s with no semantic
    // container. Naively picking the largest low-link block grabs the whole
    // page (nav + JD + footer), so we score by *paragraph density*: prefer the
    // block dominated by <p>/<li> prose. `2·paraLen − totalLen` peaks on the
    // tight JD container and drops for wrapper elements padded with chrome.
    const normLen = (el: Element): number =>
      (el.textContent ?? '').replace(/\s+/g, ' ').trim().length;
    const linkDensity = (el: Element): number => {
      const total = normLen(el) || 1;
      let linkLen = 0;
      el.querySelectorAll('a').forEach((a) => {
        linkLen += (a.textContent ?? '').replace(/\s+/g, ' ').trim().length;
      });
      return linkLen / total;
    };
    // Prose length: all <p>, plus <li> that are real content (not nav links —
    // mega-menus build huge <li> lists that would otherwise inflate the score).
    const paraLen = (el: Element): number => {
      let n = 0;
      el.querySelectorAll('p').forEach((p) => {
        n += normLen(p);
      });
      el.querySelectorAll('li').forEach((li) => {
        if (linkDensity(li) < 0.5) n += normLen(li);
      });
      return n;
    };

    const candidates = [...doc.querySelectorAll('article, main, section, [role="main"], div')];

    let best: { el: Element; score: number } | null = null;
    for (const el of candidates) {
      if (normLen(el) < 200) continue;
      if (linkDensity(el) > 0.5) continue; // nav/listing/footer
      const para = paraLen(el);
      if (para < 100) continue; // needs real prose, not a link grid
      const score = 2 * para - normLen(el);
      if (!best || score > best.score) best = { el, score };
    }

    // Last resort: a JD not wrapped in <p>/<li>. Largest low-link block.
    if (!best) {
      let big: { el: Element; len: number } | null = null;
      for (const el of candidates) {
        const len = normLen(el);
        if (len < 200 || linkDensity(el) > 0.5) continue;
        if (!big || len > big.len) big = { el, len };
      }
      if (big) best = { el: big.el, score: big.len };
    }

    if (best) text = norm(best.el.textContent ?? '');
  }

  if (!text) return null;
  return { title, company, text };
}
