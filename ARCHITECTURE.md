# JobFit Architecture

A guided tour of the codebase for a developer who knows JavaScript well but is new to Chrome extensions, WXT, and advanced React patterns. Read this with the code open.

---

## Part 1 — Chrome Extension Concepts

### The three runtime contexts

A Chrome extension is not a single program. It is three different programs that run in three isolated JavaScript environments, each with different capabilities and lifetimes. Every extension must declare which contexts it uses in a special file called `manifest.json`.

**Popup** (`entrypoints/popup/`)  
The small window that appears when you click the toolbar icon. It is an ordinary HTML page running React. It has access to all Chrome extension APIs (`browser.*`). It loads when the user opens it and is destroyed when they close it — no persistent state in memory. Because it is killed on close, all state must be persisted to `chrome.storage` to survive.

**Content script** (`entrypoints/content.ts`)  
Code that is injected into an ordinary web page and runs inside that page's JavaScript environment. It can read and manipulate the DOM of the page the user is viewing. It cannot access most Chrome extension APIs directly. In JobFit, `content.ts` is nearly empty — see why in the "On-demand injection" section below.

**Background / service worker** (`entrypoints/background.ts`)  
A long-lived (or in MV3, on-demand) script that runs in the extension's own isolated environment, separate from any visible page. It is the coordinator — it can listen for browser events and talk to both the popup and content scripts. In JobFit, `background.ts` is also empty for now because the popup handles everything directly.

These three contexts **cannot share variables**. They communicate through message passing (`browser.runtime.sendMessage`) or through `chrome.storage`, which acts as a shared database all contexts can read and write.

### manifest.json and permissions

Every extension needs a `manifest.json` that tells Chrome what the extension is and what browser APIs it needs. We never edit this file directly — see the WXT section below. The declared permissions for JobFit are in `wxt.config.ts`:

```
permissions: ['storage', 'activeTab', 'scripting']
```

- **`storage`** — lets all contexts call `browser.storage.local.*`
- **`activeTab`** — grants temporary access to the tab the user is currently viewing, but *only* while the popup is open and the user is interacting with the extension. No persistent page access. This is a privacy-friendly alternative to declaring a broad `<all_urls>` host permission.
- **`scripting`** — allows the extension to programmatically inject JavaScript into a tab using `browser.scripting.executeScript`. This is what powers JD extraction.

There are also `host_permissions` for the two AI provider domains. These are needed because Chrome blocks cross-origin `fetch` calls by default; listing a domain here adds it to the extension's content security policy allowlist.

### chrome.storage

If you reached for `localStorage` to store the resume text, it would work in the popup — but content scripts and background workers would not be able to see it, because `localStorage` is scoped to an origin (the extension's popup page URL). `chrome.storage.local` is extension-scoped: every context can read and write the same store.

JobFit stores everything here:

| Key | Written by | Read by |
|-----|-----------|---------|
| `resumeText` | `NeedsResume.tsx` after PDF parse | `App.tsx` on startup |
| `resumeFileName` | same | `App.tsx` on startup |
| `linkedInText` / `linkedInFileName` | `LinkedInUploadSection` | `App.tsx` |
| `profileText` | `App.tsx` (merged resume + LinkedIn) | `App.tsx` when scoring |
| `fitProvider`, `fitProviderModel`, `fitProviderApiKey` | `options/App.tsx` | `App.tsx` when building client |
| `usageCounter` | `usageCounter.ts` | `usageCounter.ts` |

The API is promise-based:

```js
// write
await browser.storage.local.set({ resumeText: 'some text' });

// read
const result = await browser.storage.local.get(['resumeText', 'resumeFileName']);
console.log(result.resumeText);

// delete
await browser.storage.local.remove(['resumeText']);
```

---

## Part 2 — What WXT Does

[WXT](https://wxt.dev) is a build framework for Chrome extensions, similar to what Vite is for web apps. It gives us:

1. **File-based entrypoints** — any file in `entrypoints/` is automatically compiled into the correct extension context. You don't write manifest entries by hand.
2. **HMR in development** — `npm run dev` watches for changes and reloads the extension.
3. **Auto-injected globals** — WXT provides `browser`, `defineBackground`, `defineContentScript` as global variables in the appropriate contexts, so you don't need to import them.
4. **Manifest generation** — everything in `wxt.config.ts` is merged into `manifest.json` at build time. The output lands in `.output/chrome-mv3-dev/` (dev) or `.output/chrome-mv3/` (prod).

### How entrypoints/ maps to the extension

| File/folder | WXT produces | Chrome loads it as |
|---|---|---|
| `entrypoints/background.ts` | `background.js` | Service worker (persistent coordinator) |
| `entrypoints/content.ts` | `content-scripts/content.js` | Content script (injected into pages) |
| `entrypoints/popup/` | `popup.html` + bundled JS | The toolbar popup page |
| `entrypoints/options/` | `options.html` + bundled JS | The settings page (`browser.runtime.openOptionsPage()`) |

Each folder under `entrypoints/` that has a `main.tsx` becomes a full React app. WXT creates the HTML shell, the React root mount, and wires up the content security policy headers.

---

## Part 3 — The Main Data Flow

Here is the full journey from "user uploads resume" to "results on screen", with real file references at each step.

```
User uploads PDF
    │
    ▼
parsePdf()                          utils/parsePdf.ts
    │  extracts text client-side via pdf.js
    ▼
chrome.storage.local                entrypoints/popup/views/NeedsResume.tsx:26
    │  { resumeText, resumeFileName }
    ▼
App.tsx startup effect              entrypoints/popup/App.tsx:33-49
    │  reads storage, merges resume+LinkedIn into profileText
    ▼
extractJd() injected into tab       entrypoints/popup/App.tsx:59-62
    │  via browser.scripting.executeScript
    │  ↳ runs inside the job page's DOM      utils/extractJd.ts
    │  ↳ returns { title, company, text }
    ▼
User clicks "Am I Fit?"
    │
    ▼
handleFit()                         entrypoints/popup/App.tsx:93-129
    │  reads profileText + provider settings from storage
    │  selects scoring client
    │
    ├─ Groq key set?  → createOpenAICompatClient()   utils/openaiCompatScoringClient.ts
    ├─ Gemini key set? → createRealScoringClient()    utils/realScoringClient.ts
    └─ no key?         → mockScoringClient            utils/mockScoringClient.ts
    │
    ▼
client.scoreFit(profileText, jdText, meta)
    │  builds prompt via buildPrompt()               utils/scoringUtils.ts:4-42
    │  POST to provider API
    │  parses JSON response
    │  validates + normalizes via validateFitResult() utils/scorer.ts:28-77
    ▼
FitResult                           utils/scorer.ts:1-14
    │
    ▼
ShowingResults view                 entrypoints/popup/views/ShowingResults.tsx
    ├─ FitScore           components/FitScore.tsx
    ├─ DimensionRadar     components/DimensionRadar.tsx
    └─ SummaryBullets     components/SummaryBullets.tsx
```

### Step 1 — PDF parsing (`utils/parsePdf.ts`)

`parsePdf(file)` uses `pdfjs-dist` entirely in the browser. No server upload ever happens. The function loads the PDF into an `ArrayBuffer`, parses each page, extracts text items, and joins them into a single string. The result is immediately written to `chrome.storage.local` (`NeedsResume.tsx:26`) so it survives popup close.

### Step 2 — Startup state check (`App.tsx:33-49`)

When the popup opens, the first `useEffect` reads storage. If `resumeText` exists, the popup goes to `ready` state; otherwise to `needs-resume`. This is the pattern for restoring state across popup open/close cycles — there is no server, no session, so storage is the only memory.

### Step 3 — JD extraction (`App.tsx:51-70`, `utils/extractJd.ts`)

When state becomes `ready`, a second `useEffect` runs `extractJd` in the active tab via `browser.scripting.executeScript`. `extractJd` queries known selectors for LinkedIn, Greenhouse, Lever, and Ashby, then falls back to the largest `<article>`, `<main>`, or `<section>` element. The result comes back to the popup as a plain JS value.

### Step 4 — Scoring (`App.tsx:93-129`, `utils/scoringUtils.ts`)

`handleFit` reads the saved `profileText` and provider settings, picks a client, and calls `scoreFit`. The client builds a prompt via `buildPrompt()`, truncates inputs to 8,000 / 4,000 characters, POSTs to the AI API, strips markdown fences from the response, JSON-parses it, and hands it to `validateFitResult`.

### Step 5 — Results display (`entrypoints/popup/views/ShowingResults.tsx`)

The validated `FitResult` drives three display components. `FitScore` renders the large number. `DimensionRadar` converts the five dimension scores into a Recharts radar chart. `SummaryBullets` lists strengths, gaps, and suggestion. The action plan renders inline in `ShowingResults`.

---

## Part 4 — Key Architectural Decisions

### Decision 1: The `ScoringClient` interface

**What:** `utils/scorer.ts:16-22` defines a TypeScript interface with a single method:

```ts
export interface ScoringClient {
  scoreFit(
    profileText: string,
    jdText: string,
    meta?: { title?: string | null; company?: string | null }
  ): Promise<FitResult>;
}
```

Three objects implement this contract: `mockScoringClient`, `createRealScoringClient()` (Gemini), and `createOpenAICompatClient()` (Groq or any OpenAI-compatible endpoint).

**Why:** The popup (`App.tsx:110-117`) selects a client at runtime based on what keys are saved, then calls `client.scoreFit(...)` without caring which provider it is. Adding a new provider means writing a new module that satisfies the interface — no changes to the popup.

**Alternative:** Hardcode one provider in the popup. That would mean a big conditional block in `handleFit` that grows every time you add a provider, and the AI logic would be tangled with UI state.

---

### Decision 2: Mock-first development

**What:** `utils/mockScoringClient.ts` is a complete implementation of `ScoringClient` that returns randomized but realistic-looking data with a fake 800ms delay, without making any network calls. The popup falls back to it automatically when no API key is configured (`App.tsx:117`).

**Why:** All UI work — layout, state transitions, the radar chart, the results view — was built and tested without ever needing an API key or network connection. The mock also guarantees that every render path for the results screen is exercisable locally.

**Alternative:** Build the real client first. You'd need to manage API keys during development, pay for every render test, and deal with network errors while trying to debug layout. The 800ms fake delay also caught timing bugs in the loading spinner logic before real latency was introduced.

---

### Decision 3: On-demand `activeTab` injection instead of a persistent content script

**What:** `entrypoints/content.ts` is essentially empty. Instead, `App.tsx:59-62` uses `browser.scripting.executeScript` to inject and run `extractJd` in the current tab on demand, every time the popup opens to `ready` state.

**Why:** `activeTab` is a privacy-preserving permission. It grants access to the current tab only while the popup is open — Chrome's permission prompt does not warn users about it, unlike declaring `<all_urls>`. A persistent content script (the alternative) would run on every page load and require declaring a broad host match pattern, triggering a "Read your browsing history on all websites" warning during install. On-demand injection also means the extension has zero overhead on pages the user never scored.

**Alternative:** A content script registered in `manifest.json` that runs on all pages and posts JD data back to the popup via `browser.runtime.sendMessage`. More overhead, more permissions, a more complex message-passing flow, and a scarier install prompt.

---

### Decision 4: The self-contained `extractJd` function

**What:** The comment at the top of `utils/extractJd.ts:2` says it all:

```ts
// Must be self-contained — executeScript serializes only this function body.
```

When you pass a function to `browser.scripting.executeScript({ func })`, Chrome serializes its source code as a string, sends it to the tab, and evals it there. The tab's JavaScript environment has no access to the extension's module graph. Any helper function defined outside `extractJd` would be a `ReferenceError` at runtime.

This is why `getTextContent` and `norm` are defined *inside* `extractJd` (`utils/extractJd.ts:4-11`), even though they look like obvious utility extractions.

**Alternative:** Inject a content script file that imports helpers. That requires the content script to be registered in the manifest and always running, taking you back to the tradeoffs in Decision 3.

---

### Decision 5: `validateFitResult` as a parsing and normalization layer

**What:** `utils/scorer.ts:28-77` validates the raw JSON from the AI, clamps every number to 1–10, and computes `overall` as a weighted mean from the five dimension scores rather than trusting the model's self-reported overall:

```ts
// weighted mean: skills 30%, experience 25%, keywords 20%, domain 15%, education 10%
const overall = clamp(
  skillsMatch * 0.30 +
  experienceLevel * 0.25 +
  keywordCoverage * 0.20 +
  domainIndustry * 0.15 +
  educationCerts * 0.10
);
```

Every scoring client — including the mock — runs its output through `validateFitResult` before returning. If the response is missing required fields, the function throws, which surfaces as `scoreError` in the UI.

**Why (validation):** LLMs are not guaranteed to return valid JSON or to include all expected fields. The model is explicitly told in the prompt not to include an `overall` field, because a self-reported overall can be inconsistently calibrated. Keeping the computation in the validator means neither the model nor individual client implementations can corrupt the contract.

**Why (computed overall):** The weights reflect deliberate product decisions about what matters most for job fit. If the model computed the overall, different models or providers could produce incomparable scores for the same dimensions.

**Alternative:** Trust the model's output directly. The results page would crash on missing fields, and overall scores would vary by provider even when dimensions were identical.

---

### Decision 6: Local-first storage, user-owned API keys

**What:** All data lives in `chrome.storage.local`. The extension developer has no server. Users paste their own API key into the options page (`entrypoints/options/App.tsx`), which is stored in `chrome.storage.local` and sent directly from the user's browser to the AI provider.

**Why:** This design means zero infrastructure cost, zero GDPR/data-custody surface, and zero risk of a server breach exposing user resumes or API keys. The extension developer genuinely cannot see any user data — not because of a policy, but because there is no server to receive it.

**Alternative:** A backend proxy that holds a shared API key and rate-limits per user. This removes the friction of the user getting their own key, but requires a server, authentication, billing, and custody of sensitive resume data.

---

### Decision 7: Usage limiter via `chrome.storage.local`

**What:** `utils/usageCounter.ts` stores `{ count: number, date: string }` in storage. `getRemainingChecks()` resets the counter if today's date doesn't match the stored date. `decrementCheck()` writes the new count after each successful score. The popup reads remaining checks on startup and displays the count in `Ready.tsx:96-100`.

**Why:** With no backend, there is no server-side rate limit. The 5-check limit is a soft nudge (easily bypassed by clearing storage) but enough to signal expected usage patterns and prevent accidental API cost runaway from automated testing.

**Note:** The counter is per-device and per-browser-profile, not per-user. This is a known tradeoff of the local-first design.

---

## File Map

```
wxt.config.ts                 — manifest + build config
entrypoints/
  background.ts               — service worker (currently empty)
  content.ts                  — content script (currently empty)
  popup/
    main.tsx                  — React root mount
    App.tsx                   — state machine + data flow hub
    views/
      NeedsResume.tsx         — PDF upload screen
      Ready.tsx               — "Am I Fit?" screen
      ShowingResults.tsx      — results screen
  options/
    main.tsx                  — React root mount
    App.tsx                   — API key / provider settings
components/
  FitScore.tsx                — large score number
  DimensionRadar.tsx          — Recharts radar chart
  SummaryBullets.tsx          — strengths / gaps / suggestion
  LinkedInUploadSection.tsx   — LinkedIn PDF upload widget
utils/
  scorer.ts                   — FitResult type, ScoringClient interface, validateFitResult
  scoringUtils.ts             — buildPrompt, apiDetail, isApiKeyInvalid
  mockScoringClient.ts        — fake client (no API calls)
  realScoringClient.ts        — Gemini client
  openaiCompatScoringClient.ts — Groq / OpenAI-compatible client
  extractJd.ts                — self-contained DOM scraper for job pages
  parsePdf.ts                 — client-side PDF text extraction
  usageCounter.ts             — daily 5-check limiter
```
