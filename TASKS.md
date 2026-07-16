# TASKS.md

Post-launch task list in build order. Grouped into waves — each wave depends on the one before it. Each task ends with a verification step (automated where possible, manual where not). Complete tasks are marked ✅.

**Current version:** 1.0.0 (live in Chrome Web Store)

> The original MVP task list is archived in `TASKS-mvp.md`. Note that it describes the original *plan*, not what shipped (e.g. it specifies the Anthropic SDK and a persistent content script; the build uses Gemini/Groq and on-demand `executeScript` injection).

---

# Wave 0 — Test harness ✅

Blocks every other wave. This is the independent verifier that makes autonomous loops safe and CI meaningful. Write the assertions by hand — do not let the agent both write the test and make it pass.

## Task 0.1 — Vitest + RTL setup ✅

Install and configure the test runner with conventions documented so future sessions follow them.

**Deliverables**
- Install `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitest/coverage-v8`
- `vitest.config.ts` with `environment: 'jsdom'`, globals enabled, and a `test/setup.ts` importing jest-dom matchers
- `npm run test` (watch) and `npm run test:run` (single pass, CI-safe) scripts in `package.json`
- Mock `browser.storage.local` in `test/setup.ts` so any module touching storage is testable
- A **Testing** section added to `CLAUDE.md` documenting: test file location (`*.test.ts` colocated with source), the storage mock, and the rule that assertions describe intended behaviour, not current behaviour

**Verification**
`npm run test:run` exits 0 with a single trivial passing test. `npm run compile` still passes.

---

## Task 0.2 — `validateFitResult` unit tests ✅

The highest-value pure logic in the codebase and the easiest place to build understanding.

**Deliverables**
- `utils/scorer.test.ts` covering:
  - Valid payload → returns a `FitResult` with all fields intact
  - Dimension score above 10 / below 1 → clamped into range
  - Missing required field (each of: `dimensions`, `strengths`, `gaps`, `suggestion`) → throws
  - `overall` present in model output → ignored, recomputed from the weighted mean
  - Weighted mean arithmetic → known dimension inputs produce the expected `overall` (skills 30%, experience 25%, keywords 20%, domain 15%, education 10%)
  - Non-numeric or null dimension value → throws rather than producing `NaN`

**Verification**
`npm run test:run` exits 0. Deliberately break the clamp in `validateFitResult` and confirm a test fails — a test suite that can't fail isn't a verifier.

---

## Task 0.3 — Test suite in CI ✅

Make the harness an always-on gate rather than something you remember to run.

**Deliverables**
- Add `npm run test:run` as a step in `.github/workflows/ci.yml`, between `compile` and `build`

**Verification**
Push to main; the Actions tab shows the test step running and passing. Push a deliberately failing test on a branch and confirm CI goes red.

---

# Wave 1 — Deterministic fixes

Each has a real test as its verifier. This is where `/goal` first earns its place.

## Task 1.1 — Fix `decrementCheck` ordering ✅

Currently the counter decrements before `scoreFit` resolves, so a failed API call still costs the user a check (specced as an MVP shortcut in `TASKS-mvp.md` Task 7).

**Deliverables**
- Test asserting `decrementCheck` is **not** called when `scoreFit` rejects (API error, malformed JSON, rate limit)
- Test asserting `decrementCheck` **is** called exactly once on success
- Reorder in `App.tsx` `handleFit` so the decrement happens only after `scoreFit` resolves successfully

**Verification**
`npm run test:run` exits 0. Manually: set an invalid API key, click "Am I Fit?", confirm the remaining-checks count does not drop.

---

## Task 1.2 — Result caching (no duplicate calls, no double-charging) ✅

The same resume + same JD must return the identical result, make no second network call, and not decrement the counter.

**Deliverables**
- Deterministic cache key: hash of `profileText + jdText` (stable across popup sessions)
- Cache stored in `chrome.storage.local`; entry holds the `FitResult` and a timestamp
- `handleFit` checks the cache before selecting a scoring client; on hit, returns the stored result immediately
- Cache hit does **not** call `decrementCheck`
- Tests: (a) two identical `scoreFit` invocations produce exactly one `fetch` (spy), (b) second invocation does not call `decrementCheck`, (c) different JD text produces a cache miss and a second call, (d) result returned from cache deep-equals the original

**Verification**
`npm run test:run` exits 0. Manually: score a job, note remaining checks, click "Check another job" and re-score the same page — result identical, instantly, counter unchanged.

**`/goal` candidate.** Condition: *"npm run test:run exits 0 with all four caching tests passing; no file outside utils/, entrypoints/popup/App.tsx, and test files is modified; no change to buildPrompt or validateFitResult."* Cap: 12 turns.

---

## Task 1.3 — JD extraction fixtures + failing-site fixes ✅

Three known sites fail detection. Fix them without regressing the working ones.

**Deliverables**
- `test/fixtures/` containing saved HTML for at least 9 job pages:
  - **Known failures:** `jobs.ashbyhq.com/phantom/…`, `ycombinator.com/companies/solve-intelligence/jobs/…`, `commenda.io/careers/product-builder`
  - **Known working:** LinkedIn, Greenhouse, Lever, a standard Ashby posting, plus two arbitrary career pages
- `utils/extractJd.test.ts` asserting each fixture returns `text.length >= 200` and a non-null `title`
- Update `extractJd` selectors/fallback until all fixtures pass
- A test asserting a genuinely JD-free page (e.g. a saved `example.com`) returns null/empty — the fallback must not hallucinate a match

**Verification**
`npm run test:run` exits 0 across all fixtures. Manually: open each of the three previously-failing live URLs and confirm the JD preview appears instead of the paste-JD fallback.

**`/goal` candidate.** Condition: *"npm run test:run exits 0 with every fixture in test/fixtures/ passing extractJd's ≥200-char assertion; no file outside utils/extractJd.ts and test/ is modified."* Cap: 15 turns. Collect the fixtures yourself first — the loop can't browse.

---

# Wave 2 — Scoring contract

Touches core scoring. Human-reviewed; no autonomous loops.

## Task 2.1 — Missing `suggestion` field ✅

`commenda.io/careers/product-builder` produced a result with no suggestion — either the model omitted it and validation let it through, or the UI dropped it.

**Deliverables**
- Reproduce first: a test feeding a payload with `suggestion` missing/empty through `validateFitResult`
- Determine which layer failed (validation gap vs UI render) before changing anything
- Fix the actual layer; add a test locking the behaviour
- If the model is genuinely omitting it, tighten the prompt's required-fields instruction

**Verification**
`npm run test:run` exits 0. Manually: re-run the commenda URL and confirm the suggestion renders.

---

# Wave 3 — Scoring quality

The interview-critical work. Build the eval harness by hand; do not automate the tuning.

## Task 3.1 — Eval harness 🚧 Blocked (needs API keys)

> Harness, 6 fit-spanning pairs, deterministic stats (unit-tested), and the
> `vite-node` runner are built and committed. **Blocked** on the last
> deliverable — recording the real Gemini/Groq baselines — which needs API keys
> and live calls. Run per `eval/README.md`, then commit `eval/baselines/*.json`.

**Deliverables**
- 5–8 fixed (resume, JD) pairs spanning the range: strong fit, mid fit, weak fit
- A script that runs each pair N times against a provider and reports per-dimension mean and variance
- Recorded baseline output for both Gemini and Groq

**Verification**
Running the harness twice on the same pairs produces comparable statistics — the harness itself must be stable before it can judge the model.

---

## Task 3.2 — Groq score consistency 🚧 Blocked (needs API keys)

> Experiment tooling (temperature/seed knobs, `--temperature`/`--seed` flags,
> `eval:compare`), the one-change-at-a-time plan, and the **agreed bound**
> (per-dimension stddev ≤ 1.0, overall ≤ 0.75) are ready. **Blocked** on running
> the experiments against real Groq/Gemini, which needs API keys. Once a config
> meets the bound, lock it in at `createOpenAICompatClient`'s call site.

**Deliverables**
- Diagnose the variance source (temperature, prompt adherence, model choice) using the harness
- Apply one change at a time, re-running the harness after each
- Document what was tried and what moved the numbers

**Verification**
Harness shows variance within an agreed bound (define it before starting) across N runs for the same input, on both providers.

---

# Wave 4 — BYOK → hosted inference

**Not a task — a design decision.** Requires its own conversation before any code. It means a backend proxy, key custody, rate limiting, per-request cost, and rewriting the "your data never leaves your device" positioning that the landing page, store listing, and privacy policy are all built on. Blocked pending that discussion.

---

# Wave 5 — Sidebar, full-page view, results persistence

Human-driven design work. UI quality isn't mechanically verifiable, so no loops.

## Task 5.1 — Chrome Side Panel

**Deliverables**
- Migrate/extend the popup to Chrome's Side Panel API (more width; survives clicking outside)
- Design the wider layout deliberately — do not just stretch the 380px popup

**Verification**
Manual: open the side panel, click elsewhere on the page, confirm state persists.

---

## Task 5.2 — Full-page detailed view + history

**Deliverables**
- A full-page view (extension page) showing the detailed result
- "Open detailed view" CTA from the popup/panel after a score
- History of past checks, backed by the Wave 1.2 cache

**Verification**
Manual: score a job, open the detailed view, close everything, reopen — the past result is still listed and readable.

---

# Not doing

- **Storybook** — four small components don't justify the setup cost. Revisit if the Wave 5 redesign grows the component count.

---

# Automation, layered in

Adopt each tool when a task actually calls for it, not preemptively.

| When | Tool | Why then |
|---|---|---|
| Now | `/code-review` before every commit | Replaces the Claude-web copy-paste review loop |
| Wave 0.3 | CI running `test:run` | The always-on independent verifier |
| Wave 1.2 / 1.3 | `/goal` | First tasks with a real, deterministic verifier |
| If repetition appears | A custom skill in `.claude/skills/` | Only once the same multi-step prompt recurs |
