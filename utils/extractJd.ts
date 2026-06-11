export function extractJd(): { title: string | null; company: string | null; text: string } | null {
  // Must be self-contained — executeScript serializes only this function body.

  const norm = (raw: string): string | null => {
    const t = raw.replace(/\s+/g, ' ').trim();
    return t.length >= 200 ? t : null;
  };

  const getTextContent = (selector: string): string | null => {
    const t = (document.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return t.length > 0 ? t : null;
  };

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
  if (!title) title = document.title.trim() || null;

  // --- company ---
  const companySelectors = [
    'a.topcard__org-name-link',         // LinkedIn
    '.top-card-layout__second-title',   // LinkedIn (alt)
    '.company-name',                    // Greenhouse
    '.posting-category:first-child',    // Lever
    '[data-testid="company-name"]',     // Ashby
  ];
  let company: string | null = null;
  for (const sel of companySelectors) {
    company = getTextContent(sel);
    if (company) break;
  }
  if (!company) {
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim();
    company = ogSite || location.hostname.replace(/^www\./, '');
  }

  // --- JD text (same logic as before) ---
  const jdSelectors = [
    '#job-details',                          // LinkedIn
    '.job__description',                     // Greenhouse
    '.posting-description',                  // Lever
    '.ashby-job-posting-description',        // Ashby
  ];
  let text: string | null = null;
  for (const sel of jdSelectors) {
    text = norm(document.querySelector(sel)?.textContent ?? '');
    if (text) break;
  }
  if (!text) {
    const candidates = [...document.querySelectorAll('article, main, section')];
    if (candidates.length) {
      const largest = candidates.reduce((a, b) =>
        (a.textContent?.length ?? 0) >= (b.textContent?.length ?? 0) ? a : b
      );
      text = norm(largest.textContent ?? '');
    }
  }

  if (!text) return null;
  return { title, company, text };
}
