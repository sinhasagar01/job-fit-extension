# Chrome Web Store Listing — JobFit (Am I Fit?)

---

## Extension name

```
JobFit — Am I Fit?
```

---

## Short description (132-character max)

```
Score your resume against any job in one click. Free to start, or bring your own AI key for private, direct scoring.
```

Character count: 115 ✓ (132 max)

---

## Full description

Two ways to score — a free check through our server that keeps none of your content, or your own AI key for scoring that goes straight from your browser to the provider.

**JobFit scores how well your resume fits a job posting — in one click, right from your browser toolbar.**

Open any job listing, click the JobFit icon, and within seconds you get:

- **A fit score from 1–10** — color-coded so you know at a glance whether to apply
- **A radar chart across 5 dimensions** — skills match, experience level, domain/industry fit, keyword coverage, and education/certifications
- **3 strengths and 3 gaps** — so you know exactly what's working and what isn't
- **A concrete action plan** — 2–3 specific things you can do to close the gap before you apply

**Works on any job page.** JobFit automatically extracts the job description from LinkedIn, Greenhouse, Lever, and Ashby. For any other site — company career pages, Indeed, job boards, anywhere — just paste the job description text and go.

---

### Privacy, honestly

Two ways to score, and they handle your data differently:

**Free checks.** Your resume and the job description go to JobFit's scoring server, which passes them to our AI provider (OpenAI) and returns the result. We keep **none of your content** — it's processed and dropped, never stored by us or written to a log. To run the free daily limit we keep only anonymous usage counters (one per install, one per IP with the IP hashed), never your content. OpenAI processes the request under [its API data policy](https://developers.openai.com/api/docs/guides/your-data) and states it does not train on API inputs by default.

**Your own key.** Add a free Google Gemini or Groq API key in Settings (both offer free tiers; links are on the Settings page) and scoring goes **straight from your browser to that provider** — it never touches JobFit's server, and your key never leaves your device except to the provider you chose.

Either way, JobFit never stores your resume anywhere but your own device, and we never sell your data or train on it.

---

### Getting started

1. Install JobFit and click the toolbar icon.
2. Upload your resume PDF — it is parsed on your device.
3. (Optional) Upload your LinkedIn profile PDF to enrich the match.
4. Open a job listing and click "Am I Fit?" — or paste the job description manually.
5. Get your score, gaps, and action plan.

---

### Free tier

5 fit checks per day, included. No payment required to get started.

---

## Required store assets

### Icons (already in the extension)

| File | Size |
|------|------|
| `icon/128.png` | 128×128 px |
| `icon/48.png` | 48×48 px |
| `icon/16.png` | 16×16 px |

### Screenshots (must capture before submission)

The Chrome Web Store requires at least 1 screenshot; up to 5 are allowed. All must be **1280×800 px** or **640×400 px**, PNG or JPEG.

| # | What to show | State |
|---|-------------|-------|
| 1 | Popup "ready" state | Resume loaded, job detected, "Am I Fit?" button visible |
| 2 | Results state | Score card, radar chart, strengths/gaps visible |
| 3 | Results state scrolled | Action plan section visible |
| 4 | Settings page | Provider selector + API key field |
| 5 | Paste fallback | "No job detected" state with paste textarea |

**How to capture at exactly 1280×800:** Set your browser zoom to 100%, resize the browser window to 1280×800, open the popup undocked (right-click the extension icon → "Open as popup window"), then screenshot.

### Promotional tiles (recommended)

| Tile | Size | Usage |
|------|------|-------|
| Small promo tile | **440×280 px** | Shown in Web Store search results — strongly recommended |
| Marquee promo tile | **1400×560 px** | Shown on featured/curated placements — optional |

Both should be PNG. Use the extension's indigo color scheme (`#4F46E5`) and the target icon for brand consistency.
