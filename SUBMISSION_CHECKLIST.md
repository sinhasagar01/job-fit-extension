# Chrome Web Store Submission Checklist — JobFit

Work through this top-to-bottom before submitting. The permission justifications are pre-written for the review form.

---

## Pre-submission code

- [ ] `wxt.config.ts` version bumped to `1.0.0` (change from `0.0.0`)
- [ ] Placeholder upgrade URL (`https://example.com/upgrade`) in `utils/usageCounter.ts` replaced with a real URL or removed
- [ ] `npm run compile` passes with zero TypeScript errors
- [ ] `npm run build` succeeds and produces `.output/chrome-mv3/`
- [ ] `npm run zip` produces a submission-ready `.zip` in `.output/`
- [ ] Tested on a live LinkedIn job listing (auto-extraction works)
- [ ] Tested on a live Greenhouse or Lever listing (auto-extraction works)
- [ ] Tested paste fallback on an unsupported job page
- [ ] Mock client is NOT the active default (verify `utils/scorer.ts` routes to real client when API key is present)

---

## Store assets

- [x] At least 1 screenshot captured at 1280×800 px (see `STORE_LISTING.md` for what to show) — re-captured 2026-07-17 after the Task 5.3 display fixes
- [ ] Small promo tile created at 440×280 px (PNG)
- [ ] Icons confirmed present: 16×16, 48×48, 128×128 (already in `icon/`)

---

## Store listing content

- [ ] Extension name entered: `JobFit — Am I Fit?`
- [ ] Short description entered (84 chars, within 132-char limit): `Score your resume against any job in one click — your data never leaves your device.`
- [ ] Full description pasted from `STORE_LISTING.md`
- [ ] Privacy policy URL entered (host `PRIVACY.md` on GitHub or a static page; the raw GitHub URL is acceptable)
- [ ] Category selected: **Productivity**

---

## Permission justifications

Paste these verbatim into the "Permission justification" fields on the Chrome Web Store review form. Each permission that is not self-evident requires a written justification.

### `storage`

> JobFit stores the user's resume text, optional LinkedIn profile text, chosen AI provider, API key, and daily usage counter in `chrome.storage.local`. All data remains on the user's device. No remote server or cloud database is used. Users can clear all stored data at any time via the extension UI.

### `activeTab`

> When the user clicks "Am I Fit?", JobFit reads the HTML of the tab currently open in order to extract the job title, company name, and job description body text. Access is requested on user action only — not on page load, not on navigation, not passively.

### `scripting`

> JobFit uses `browser.scripting.executeScript()` to run a one-time DOM-reading function in the active tab to extract job description content. This is the MV3-approved mechanism for programmatic DOM access triggered by user action; `activeTab` alone does not grant the ability to execute scripts in the tab.

### Host permission: `https://generativelanguage.googleapis.com/*`

> When the user selects Google Gemini as their AI provider and clicks "Am I Fit?", JobFit sends the scoring request — containing the user's resume text and the job description — directly from the browser to the Gemini API endpoint using the user's own API key. This host permission is required to make that cross-origin request. It is only exercised when the user explicitly triggers a score and has configured Gemini.

### Host permission: `https://api.groq.com/*`

> When the user selects Groq as their AI provider and clicks "Am I Fit?", JobFit sends the scoring request directly from the browser to the Groq API endpoint using the user's own API key. This host permission is required to make that cross-origin request. It is only exercised when the user explicitly triggers a score and has configured Groq.

---

## Privacy & data handling declaration (for the store form)

When the store form asks about data collection, select/declare:

| Data type | Collected? | Notes |
|-----------|-----------|-------|
| Personally identifiable information | No | Resume text is processed locally; not collected by the developer |
| Health info | No | |
| Financial info | No | |
| Authentication info | No | API keys are stored locally, not on developer servers |
| Personal communications | No | |
| Location | No | |
| Web history | No | |
| User activity | No | |
| Website content | No | Job description text is read locally and sent only to the user's chosen AI provider |

Check **"This extension does not collect any user data"** if that option is available, and note that data is processed locally and sent to the user-configured third-party AI provider.

---

## Single-purpose description (required field)

> JobFit scores how well a user's resume matches a job posting by extracting the job description from the current page and sending it, along with the user's stored resume text, to a user-configured AI API (Google Gemini or Groq). It returns a fit score, dimensional breakdown, and action plan. The extension's single purpose is resume-to-job fit scoring.

---

## Final checks before clicking Submit

- [ ] All justification fields above are filled in the Developer Dashboard
- [ ] Privacy policy URL is live and accessible (not a local file)
- [ ] No hardcoded API keys anywhere in the source (run `grep -r "AIza\|gsk_" --include="*.ts" --include="*.tsx" .`)
- [ ] `.output/` and `.env` are in `.gitignore` and not included in the zip
- [ ] Extension loads cleanly from the zip in a fresh Chrome profile with Developer Mode
