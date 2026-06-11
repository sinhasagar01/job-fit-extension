# TASKS.md

MVP task list in build order. Each task is self-contained and ends with a manual test in the popup. Complete tasks are marked ✅.

---

## Task 1 — Popup UI shell (three states)

Build the popup's state machine and skeleton UI with no logic — just the three views wired to local React state with hardcoded transitions.

**Deliverables**
- `entrypoints/popup/App.tsx` renders one of three views based on a `PopupState` type:
  - `needs-resume` — upload prompt, no score visible
  - `ready` — "Am I Fit?" button, resume name shown
  - `showing-results` — placeholder result area
- A dev-only state switcher (e.g. three buttons) so you can cycle views without any real data
- Tailwind used for all styling; popup fixed at 380 px wide

**Manual test**
Load the extension (`npm run dev` → `chrome://extensions` → load `.output/chrome-mv3-dev`). Open the popup. You should see the `needs-resume` view. Click the dev switcher buttons and confirm all three views render without errors or layout breaks.

---

## Task 2 — Resume PDF upload + text extraction

Wire the file input in the `needs-resume` view to a real PDF parser and persist the result.

**Deliverables**
- Install `pdfjs-dist`; create `utils/parsePdf.ts` that accepts a `File` and returns extracted plain text
- On upload success, save `{ resumeText: string, resumeFileName: string }` to `chrome.storage.local`
- On next popup open, if storage has resume text, start in `ready` state (not `needs-resume`)
- "Remove resume" button in the `ready` view clears storage and returns to `needs-resume`

**Manual test**
Upload a real PDF resume. Close and reopen the popup — it should open in the `ready` state showing the file name. Click "Remove resume" — popup should return to `needs-resume`. Reopen the popup again to confirm it stays in `needs-resume` after removal.

---

## Task 3 — Optional LinkedIn PDF upload

Extend the upload pipeline to accept a second PDF (LinkedIn profile export) and merge it into the stored profile text.

**Deliverables**
- Add a secondary "Add LinkedIn profile (optional)" file input in both `needs-resume` and `ready` views
- Reuse `utils/parsePdf.ts`; merge LinkedIn text into a combined `profileText` stored alongside `resumeText`
- Show a small indicator in the `ready` view when a LinkedIn PDF has been added; allow removing it independently

**Manual test**
Upload a resume, then upload a LinkedIn PDF export. Confirm both file names appear in the `ready` view. Remove only the LinkedIn PDF — resume indicator should remain. Remove the resume — popup should return to `needs-resume`.

---

## Task 4 — Content script JD extraction

Extract job-description text from whatever tab is active when the popup opens.

**Deliverables**
- `utils/extractJd.ts` with a priority-ordered extraction strategy:
  1. Known selectors: LinkedIn (`#job-details`), Greenhouse (`.job__description`), Lever (`.posting-description`), Ashby (`.ashby-job-posting-description`)
  2. Readability-style fallback: largest `<article>` / `<main>` / `<section>` block by text length
- Update `entrypoints/content.ts` to expose `extractJd()` via `chrome.runtime.onMessage`
- In `ready` state, popup sends a message to the content script on open and displays one of:
  - JD preview (first 120 chars + "…") when extraction succeeds
  - "No job description detected — paste it here" textarea fallback when it fails
- Update `content.ts` `matches` to `["<all_urls>"]` and add `"scripting"` permission in `wxt.config.ts` if not present

**Manual test**
Navigate to a LinkedIn job listing and open the popup — the JD preview should appear. Navigate to a plain webpage (e.g. `example.com`) and open the popup — the paste-JD textarea should appear. Type text into the textarea and confirm it is usable as the JD input.

---

## Task 5 — Scoring engine with mock client

Build the typed scoring interface and a mock implementation so the full data flow works end-to-end without real API calls.

**Deliverables**
- `utils/scorer.ts` defines and exports:
  ```ts
  interface FitResult {
    overall: number;          // 1–10
    dimensions: {
      skillsMatch: number;
      experienceLevel: number;
      domainIndustry: number;
      keywordCoverage: number;
      educationCerts: number;
    };
    strengths: [string, string, string];
    gaps: [string, string, string];
    suggestion: string;
  }

  interface ScoringClient {
    scoreFit(profileText: string, jdText: string): Promise<FitResult>;
  }
  ```
- `utils/mockScoringClient.ts` implements `ScoringClient` with canned data (overall: 7, varied dimension scores, realistic stub strings); adds a 800 ms artificial delay to simulate a real call
- Popup wires the mock client: "Am I Fit?" button in `ready` state calls `scoreFit`, shows a spinner during the delay, then transitions to `showing-results` with the `FitResult` stored in component state

**Manual test**
With a resume uploaded and a JD present (or pasted), click "Am I Fit?". A spinner should appear for ~800 ms, then the popup should transition to `showing-results`. Open DevTools → Console and confirm no errors. Click back to `ready` and run it again — result should be consistent (same canned data).

---

## Task 6 — Results UI (score, radar chart, summary bullets)

Replace the `showing-results` placeholder with the full result view.

**Deliverables**
- `components/FitScore.tsx` — large score number (color: red ≤4, amber 5–6, green ≥7) with label "Overall Fit"
- `components/RadarChart.tsx` — Recharts `RadarChart` with the five dimensions; labels readable at 380 px width
- `components/SummaryBullets.tsx` — three sections: "Top strength", "Top gap", "Suggestion", each with its string
- Compose all three in the `showing-results` view; add a "Check another job" back button that returns to `ready`

**Manual test**
Run a fit check and confirm: the score number is visible and color-coded, the radar chart renders with all five axis labels, and the three summary bullets appear with their content. Click "Check another job" and confirm the popup returns to `ready` state.

---

## Task 7 — Free-usage counter (5/day) with upgrade button

Gate the "Am I Fit?" button behind a daily usage limit.

**Deliverables**
- `utils/usageCounter.ts` — reads/writes `{ count: number, date: string }` in `chrome.storage.local`; `getRemainingChecks()` resets to 5 if date ≠ today; `decrementCheck()` subtracts one
- In `ready` state, display "N of 5 free checks remaining today" beneath the button
- After 0 checks remain, replace the button with an **Upgrade** CTA that opens `https://example.com/upgrade` in a new tab (placeholder URL)
- Decrement happens just before calling `scoreFit`; if the call fails, do not refund (keep it simple)

**Manual test**
Run 5 fit checks. After the 5th, confirm the "Am I Fit?" button is replaced by the Upgrade CTA. Click the CTA and confirm it opens a new tab. Close and reopen the popup — the Upgrade CTA should still be shown (counter persists). (To reset for further testing, clear extension storage via `chrome://extensions` → Details → Clear storage.)

---

## Task 8 — Real AI client with user-supplied API key in options

Swap the mock client for a real LLM call, gated behind a user-provided API key stored in the options page.

**Deliverables**
- `entrypoints/options/` — WXT options page with a single API key input field; saves key to `chrome.storage.local`; shows masked value when set, with a "Clear" button
- `utils/aiScoringClient.ts` implements `ScoringClient`; reads the key from storage and calls a free-tier LLM API (e.g. Claude Haiku via the Anthropic SDK, or Gemini Flash); constructs a structured prompt and parses the JSON response into `FitResult`
- Add robust error handling: missing key → prompt user to open options; non-JSON or malformed response → surface a clear error message in the popup
- In `wxt.config.ts`, register the options page and add a link to it from the `ready` view ("Settings ⚙")
- Switch the active client from `mockScoringClient` to `aiScoringClient` in the popup

**Manual test**
Open the options page (right-click extension icon → Options), enter a valid API key, and save. Return to a job listing, open the popup, and run a fit check. Confirm the result is a real AI-generated score (not the canned mock values). Then clear the API key, return to the popup, and click "Am I Fit?" — confirm a clear error or prompt appears rather than a crash.
