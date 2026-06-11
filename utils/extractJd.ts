export function extractJd(): string | null {
  // Must be self-contained — executeScript serializes only this function body.
  const norm = (raw: string): string | null => {
    const t = raw.replace(/\s+/g, ' ').trim();
    return t.length >= 200 ? t : null;
  };

  const selectors = [
    '#job-details',              // LinkedIn
    '.job__description',         // Greenhouse
    '.posting-description',      // Lever
    '.ashby-job-posting-description', // Ashby
  ];
  for (const sel of selectors) {
    const text = norm(document.querySelector(sel)?.textContent ?? '');
    if (text) return text;
  }

  const candidates = [...document.querySelectorAll('article, main, section')];
  if (!candidates.length) return null;
  const largest = candidates.reduce((a, b) =>
    (a.textContent?.length ?? 0) >= (b.textContent?.length ?? 0) ? a : b
  );
  return norm(largest.textContent ?? '');
}
