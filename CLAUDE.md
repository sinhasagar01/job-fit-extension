# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev build with HMR (Chrome by default)
npm run dev:firefox  # Start dev build for Firefox
npm run build        # Production build for Chrome
npm run build:firefox
npm run zip          # Package for Chrome Web Store submission
npm run compile      # Type-check without emitting (tsc --noEmit)
```

No test runner is configured yet.

To load the extension locally: run `npm run dev`, then open `chrome://extensions`, enable Developer Mode, and load the `.output/chrome-mv3-dev/` directory.

## Rules

- Run `npm run compile` after every change and fix all type errors before declaring a task done.
- Commit with a descriptive message after every completed task.
- Never put API keys or secrets in extension code or commit them.
- Never hand-edit `manifest.json` or anything under `.output/` — configure manifest settings in `wxt.config.ts`.

## Stack

WXT + React 19 + TypeScript + Tailwind CSS + Recharts.

## Folder conventions

| Path | Purpose |
|------|---------|
| `entrypoints/` | WXT entrypoints: popup, content script, background |
| `components/` | Shared React components |
| `utils/` | Parsing and scoring logic (PDF extraction, JD extraction, fit scorer) |

## Architecture

This is a **Chrome MV3 extension** built with [WXT](https://wxt.dev). WXT uses file-based entrypoints — each file maps to an extension context:

| File | Runtime context |
|------|----------------|
| `entrypoints/background.ts` | Service worker (MV3 background) |
| `entrypoints/content.ts` | Content script injected into pages |
| `entrypoints/popup/` | Toolbar popup (React SPA) |

WXT auto-injects globals like `browser`, `defineBackground`, `defineContentScript` — no explicit imports needed for these.

### Product intent (from PRD.md)

The extension is **JobFit ("Am I Fit?")** — a job-fit scorer that lives in the toolbar. Key data flows:

1. **Resume ingestion** — user uploads PDF in popup; extract text client-side (pdf.js or similar); persist in `chrome.storage.local`.
2. **JD extraction** — content script reads job description text from the active tab. Strategy: try known selectors for LinkedIn/Greenhouse/Lever/Ashby, fall back to readability-style main-content extraction.
3. **Scoring engine** — `scoreFit(profileText, jdText)` returns typed JSON: `{ overall: number, dimensions: {...}, strengths: string[], gaps: string[], suggestion: string }`. **Must be built behind an interface with a mock client first** so all UI work requires zero API calls; real LLM client added last.
4. **Results UI** — fit score (color-coded 1–10), Recharts radar chart across 5 dimensions, 3-bullet summary.
5. **Usage limiter** — 5 free checks/day tracked in `chrome.storage.local`, resets daily.

### Storage

All state lives in `chrome.storage.local` (no backend for MVP): resume text, usage counter + last-reset date, last result per tab URL.

### AI calls

**Never bundle an API key in the extension.** For MVP, the user enters their own key in an options page; it is stored in `chrome.storage.local`. The scoring client must be behind an interface so mock and real implementations are interchangeable.

### Permissions

Keep to minimum: `activeTab`, `storage`, `scripting`. Avoid broad host permissions.
