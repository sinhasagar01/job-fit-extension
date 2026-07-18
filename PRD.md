# PRD: JobFit — "Am I Fit?" Chrome Extension

## 1. Problem Statement

Job seekers apply to dozens of roles with no quick way to judge whether a specific
job description (JD) actually matches their background. They either waste time
applying to poor-fit roles or skip roles they'd be competitive for. Existing tools
(ATS resume checkers) require copy-pasting into a separate website, breaking the
browsing flow.

JobFit lives where the decision happens: on the job listing page itself. One click
gives a 1–10 fit score with a visual breakdown explaining _why_.

## 2. Target User

**Primary persona:** Active job seeker (0–10 years experience), tech and
adjacent roles, applies to 10–50 jobs/month, browses LinkedIn Jobs, company
career pages, Lever/Greenhouse/Ashby boards. Price-sensitive but will pay for
tools that save hours during an active search.

## 3. Core User Journey (MVP)

1. User installs extension and clicks the toolbar icon for the first time.
2. **Onboarding (popup):** user uploads their resume as a PDF. Optionally also
   uploads their LinkedIn profile exported as PDF (LinkedIn → Profile → More →
   "Save to PDF"). We parse both to plain text and store locally.
3. User browses to any job listing page.
4. User clicks the extension icon → popup shows an **"Am I Fit?"** button.
5. On click: the content script extracts the JD text from the active tab; the
   extension sends {resume text + JD text} to the AI model.
6. Popup displays:
   - **Overall fit score: N/10** (large, color-coded: red ≤4, amber 5–6, green ≥7)
   - **Radar chart** with per-dimension subscores: Skills Match, Experience
     Level, Domain/Industry, Keyword/ATS Coverage, Education/Certs
   - **3-bullet summary:** top strength, top gap, one actionable suggestion
7. Free-tier counter decrements ("4 of 5 free checks left today"). When
   exhausted, the button is replaced by an **Upgrade** CTA.

## 4. MVP Feature List (build exactly this, nothing more)

- [ ] Popup UI with three states: needs-resume / ready / showing-results
- [ ] Resume PDF upload + client-side text extraction (pdf.js or similar);
      store extracted text in `chrome.storage.local`
- [ ] Optional LinkedIn-profile PDF upload, same pipeline, merged into profile text
- [ ] Content script: extract JD text from the active tab. Strategy: try common
      selectors for LinkedIn/Greenhouse/Lever/Ashby first, fall back to
      readability-style main-content extraction. Must work "well enough" on
      arbitrary pages.
- [ ] Scoring engine: a single `scoreFit(profileText, jdText)` function that calls
      an LLM and returns typed JSON: `{ overall: number, dimensions: {...},
    strengths: string[], gaps: string[], suggestion: string }`.
      **Implement behind an interface with a mock client first** (returns canned
      JSON) so all UI work needs zero API calls. Real client added last.
- [ ] Results UI: score, Recharts radar chart, summary bullets
- [ ] Free-usage limiter: 5 checks/day tracked in `chrome.storage.local`,
      resets daily; Upgrade button (UI only — links to a placeholder page)
- [ ] Error states: no JD found on page, parse failure, API failure, offline

## 5. Explicitly OUT of MVP (v2 backlog)

Resume tailoring per JD · cover letter generation · keyword gap deep-dive ·
application tracker dashboard · interview prep questions · accounts/auth ·
payments/Stripe · backend server · cross-browser builds · model choice UI.

## 6. Technical Architecture

- **Stack:** WXT + React + TypeScript + Tailwind CSS + Recharts.
  WXT file-based entrypoints; never hand-edit manifest.json (use wxt.config.ts).
- **Storage:** device state in `chrome.storage.local` (resume text, usage
  counter, last result per tab URL, anonymous install token). No accounts.
- **AI calls:** two paths — the hosted free tier is a Cloudflare Worker
  (`worker/`) that holds the OpenAI key in its env (Wave 4, shipped; never ship
  a key in the bundle); or BYOK, where the user's Gemini/Groq key is stored
  locally and sent straight to their provider.
- **Privacy stance:** the résumé is stored only on-device. Free checks pass it
  through our Worker to OpenAI, which keeps none of it (not stored, not logged);
  BYOK scoring goes straight to the user's provider, never our server. No
  analytics. See PRIVACY.md.
- **Permissions:** request the minimum — `activeTab`, `storage`, `scripting`.
  Avoid broad host permissions if possible.

## 7. Monetization (post-MVP, for context)

- **Free:** 5 checks/day, basic model.
- **Pro ($9/mo):** unlimited checks, stronger model, resume tailoring, cover
  letters, keyword gap analysis, application tracker.
- **Credits pack:** one-time purchase for sporadic users.

## 8. Key Risks

- **LinkedIn ToS:** we never scrape linkedin.com profiles. Profile data comes
  only from the user's own exported PDF. (Reading the _public JD text_ of a page
  the user is viewing via activeTab is the standard extension pattern.)
- **JD extraction brittleness:** arbitrary career sites vary wildly — mitigate
  with fallback extraction + a manual "paste JD" textarea as last resort.
- **API cost abuse:** mitigated in MVP by user-supplied key; solved post-MVP by
  proxy with rate limiting.
- **Privacy:** resumes are sensitive personal data; keep processing local-first
  and write an honest privacy policy before store submission.

## 9. Success Metrics (launch)

- Activation: % of installs that upload a resume and run ≥1 check (target 40%+)
- Retention: % running a check in week 2 (target 20%+)
- Free→paid conversion once payments exist (target 2–4%)
- Chrome Web Store rating ≥ 4.0

## 10. Open Questions (decide during build, ask the developer)

- Which free-tier LLM for the default model?
- Radar chart vs. horizontal bars if radar feels cramped in a 380px popup?
- Should "no JD detected" auto-open the paste-JD fallback?
