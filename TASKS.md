# TASKS.md

Post-launch task list in build order. Each wave depends on the one before it.
Each task ends with a verification step. Complete tasks are marked ✅.

**Current version:** 1.2.0 (submitted for Chrome Web Store review 2026-07-17)

> The original MVP task list is archived in `TASKS-mvp.md`. It describes the
> original *plan*, not what shipped.

---

# Shipped (Waves 0–5) ✅

- **Wave 0** — Vitest + RTL harness, storage mock, CLAUDE.md test conventions, tests in CI.
- **Wave 1** — `decrementCheck` ordering fix; result caching (hash of profile+JD, no double-charge); JD extraction fixtures incl. Ashby/YC/Commenda fixes.
- **Wave 2** — `suggestion` field contract fix (validation + prompt tightening).
- **Wave 3** — Eval harness with completeness gate, retry/backoff, failure records, `.incomplete/` quarantine. **3.2 resolved:** Groq's issue was JSON-output reliability (strict `json_object` 400-ing ~40% of weak-fit calls), not score variance — dropped it, backstop carries; `groq.json` baseline committed. **3.1 open:** Gemini baseline rerun blocked on free-tier quota reset (`GEMINI_API_KEY=… npm run eval -- --provider gemini --runs 3 --delay 10000`; commit only on ✓ COMPLETE).
- **Wave 5** — Side-panel migration (popup deleted, workspace tabs, stale-panel guard with no-score/no-decrement test); full-page tracker with history, per-row delete, clear-history, 200-entry eviction cap.

---

# Wave 6 — JD detection fires on non-job pages 🔴 LIVE BUG — DO THIS FIRST

YouTube, the Gemini API docs, and most content-rich pages are detected as job
postings. The extension offers to score them, produces nonsense, and spends a
free check doing it.

## 6.0 — Why this blocks Wave 4

Today a false positive costs the **user** a check. Once scoring is hosted, it
costs **you** money — every junk page anyone scores is billed to your OpenAI
balance. Detection must be trustworthy before an endpoint you pay for sits
behind it. **Do not start Wave 4 until 6.1 is green.**

## Task 6.1 — Negative fixtures + a real "is this a job posting?" gate

**Root cause (verify before fixing).** `extractJd`'s fallback is "largest
`<article>`/`<main>`/`<section>` ≥ 200 chars". Nearly every content page on the
web clears that. Nothing checks the text is *a job posting* — only that it is
*text*.

**Why the existing test never caught it.** Task 1.3's negative case used a
saved `example.com`, whose whole body is under the 200-char floor. It passed
because the page was empty, not because a gate works. A test that can only
pass isn't a verifier — the same failure class this repo already fixed in the
eval harness.

**Deliverables**

- `test/fixtures/negative/` — content-rich pages that are **not** job postings.
  Minimum six: a YouTube watch page, an API-docs page (e.g. Gemini docs), a news
  article, a long blog post, a GitHub repo page, a product marketing page. Each
  must have well over 200 chars of `<main>`/`<article>` text — that's the point.
- A `looksLikeJobPosting(doc)` gate, run **before** the fallback extractor,
  scoring positive signals rather than trusting length:
  - **Definitive:** schema.org JSON-LD `@type: JobPosting` → yes, short-circuit.
  - **Strong:** known ATS host (`boards.greenhouse.io`, `jobs.lever.co`,
    `jobs.ashbyhq.com`, `linkedin.com/jobs/…`) or URL path matching
    `/jobs?/`, `/careers?/`, `/vacanc`, `/opening`.
  - **Corroborating:** job-phrase density — "responsibilities",
    "qualifications", "requirements", "what you'll do", "what we're looking
    for", "about the role", "years of experience", "apply now", "benefits".
  - Pass on: definitive, OR strong, OR ≥3 corroborating. **Length alone is
    never sufficient.**
  - Keep it inline in `extractJd` — the `executeScript` serialization
    constraint still applies (ARCHITECTURE.md Decision 4).
- Gate says no → return the no-JD state with the existing paste fallback.
  Do **not** guess.

**Verification**

- Every fixture in `test/fixtures/negative/` returns no JD — **assert on the
  content-rich ones specifically**.
- Every existing positive fixture still extracts (no regression).
- Mutation check: neuter the gate; the negative tests must fail. If they
  don't, the fixtures aren't content-rich enough.
- Manually: YouTube, the Gemini API docs, and a news article show the paste
  fallback, not a detected job.

## Task 6.2 — Never spend a check on a page we're unsure about

**Deliverables**

- Uncertain detection (fallback extraction with no definitive/strong signal) is
  surfaced as such: preview the text with an explicit "This doesn't look like a
  job posting — score it anyway?" affordance, not a confident detected-job card.
- Test: an uncertain detection does not auto-enable the primary "Am I Fit?"
  path.

**Verification**
`npm run test:run` green. Manually: a borderline page requires explicit
confirmation before it can be scored.

---

# Wave 4 — Hosted inference (BYOK demoted to escape hatch)

**The goal is activation, not ideology.** Users report the tool is useful but
unusable, because it demands an API key before demonstrating any value. The fix
is **no key on first run** — a fresh install scores a job with one click and
zero setup.

**BYOK is demoted, not deleted** — see 4.0, and 4.5 for when it actually dies.

## 4.0 — The constraint that shapes everything below

One check ≈ 3,000 input + 500 output tokens ≈ **$0.001** at gpt-4o-mini.
A **$5** balance ≈ ~5,000 checks.

| Scenario | Cost |
|---|---|
| 38 users × 5/day × 30 days (worst case) | ~$5.70/month |
| 1,000 users × 5 free checks | ~$5.00 |
| One unbounded attacker on an anonymous endpoint | the whole balance, in an afternoon |

Conclusions: hosted free is affordable **now** and stops being affordable with
growth or abuse — so the free tier needs a hard ceiling that **fails closed**.
And deleting BYOK with no paid tier means every engaged user (persona: 10–50
jobs/month) hits a wall you can't afford to raise. BYOK stays until Wave 7
replaces it.

**Decisions (locked 2026-07-17 — flag before starting 4.1 if you disagree):**

- **Free tier: 5/day per anonymous install token**, protected by the global
  cap. Not lifetime — lifetime limits require accounts, and a sign-in gate
  before the first score recreates the exact activation barrier this wave
  exists to remove. Identity arrives with Wave 7 payments, where it's
  unavoidable and the user is already convinced.
- **Provider: OpenAI `gpt-4o-mini`.** DeepSeek v4-flash is ~25% cheaper
  (~$0.0006 vs ~$0.0008/check — cents at this scale) but is a China-based
  processor of résumé PII, which is the wrong fit for a privacy-branded
  product. `ScoringClient` makes switching later a one-file change if cost
  ever matters.
- **Provider-enforced JSON mode is optional, never load-bearing.** Try
  OpenAI's `json_schema` structured outputs, but behind the existing
  brace-extraction backstop; drop it without ceremony if it errors. Groq's
  strict mode was a 40%-failure bug — our own `validateFitResult` layer is
  the reliability mechanism.

## Task 4.1 — The proxy (Cloudflare Worker)

**Deliverables**

- Worker exposing `POST /score` → `{ profileText, jdText, meta }` → `FitResult`.
- **Provider key lives only in the Worker's env.** Never in the extension,
  never in the repo. Ship `.env.example` / `wrangler.toml` vars with no real
  values, and a "local Worker setup" section in the README.
- The Worker **reuses `buildPrompt` and `validateFitResult`** — extract to a
  shared module if needed; the scoring contract must not fork.
- **Abuse controls, in order of what actually protects the balance:**
  1. **Global daily spend ceiling that fails closed.** Cap exceeded →
     `503 { reason: 'free_tier_exhausted' }`, **no provider call** (assert the
     provider fetch spy is never invoked). This is the only control bounding
     worst case — per-token limits die to reinstalls, per-IP to a hotspot.
  2. Per-install anonymous token (generated client-side on first run, stored
     in `chrome.storage.local`, sent as a header) → 5/day in KV.
  3. Per-IP daily ceiling.
  4. Request size limits mirroring the 8,000/4,000-char truncation — reject
     oversized bodies before they reach the provider.
- **Counter consistency:** Cloudflare KV is eventually consistent. Use a
  Durable Object for the global cap, or accept bounded overshoot and say so in
  a comment (a race past the cap costs ~$0.005 — it's a circuit breaker, not
  an invoice).
- **Typed error vocabulary**, not ad-hoc strings: `invalid_input`,
  `rate_limited`, `free_tier_exhausted`, `provider_error`. The extension
  switches UI state on these; tests assert each.
- **Zero-retention posture, and it must be true:** no logging, storing, or
  forwarding of `profileText`/`jdText`; no request body ever hits a log line.
  Counters store only `{ token, date, count }`. **This exact posture is what
  4.3's privacy policy will claim — decide it here, then don't drift.**
- No accounts, no sign-in.

**Verification**
Worker unit tests: happy path; oversized body rejected; per-token limit;
per-IP limit; each typed error; and **global cap exhausted → 503 with zero
provider calls**. Manually: exhaust the cap in staging, confirm no provider
call fires.

## Task 4.2 — `createHostedClient()` + no key on first run

**Deliverables**

- `utils/hostedScoringClient.ts` implementing `ScoringClient` — POSTs to the
  Worker, no key. Fourth client beside mock/Gemini/Groq; the interface doesn't
  change.
- `getClient`: **user key set → their provider, direct (never through the
  proxy); no key → hosted.** A BYOK user's data never touches your server —
  that distinction is load-bearing for 4.3.
- **First run never mentions an API key.** Upload resume → open job → score.
  Options keeps BYOK, reframed: "Use your own key — unlimited checks, and
  your data goes straight to the provider."
- `503 free_tier_exhausted` is a specific, calm state — not an error toast:
  two equal paths (add your own key / Pro "coming soon"), no urgency
  theatrics, no dark patterns. The user has already seen value by this point;
  that's the entire design.
- Worker origin added to `host_permissions`.

**Verification**
- Tests: no key → hosted client; key present → direct client, hosted never
  called; each typed error renders its state.
- **Before hosted becomes the default:** add the hosted provider to `eval/`
  and run the 6-pair baseline — ✓ COMPLETE and within the agreed variance
  bound (per-dim sd ≤ 1.0, overall ≤ 0.75), same bar as Gemini/Groq. The
  harness exists; use it on the model we're about to pay for.
- Manually, in a **fresh Chrome profile with no key**: install → upload →
  score. Zero setup. If this doesn't work in a clean profile, nothing else in
  the wave matters.

## Task 4.3 — Rewrite every privacy claim 🔴 THE ACTUAL GATE

You **certified** the current claims to the Chrome Web Store. Every one below
is false the moment a hosted check runs:

| Claim | Where |
|---|---|
| "There is no intermediary. The extension developer receives nothing." | `STORE_LISTING.md` |
| "We have no servers. We store nothing." | store description |
| "Does not operate any developer-side servers" | `PRIVACY.md` + gist |
| "your resume never leaving your device" | `README.md` |
| "The extension developer receives no data, no telemetry, and no API traffic" | `README.md` |
| "This extension does not collect any user data" | `SUBMISSION_CHECKLIST.md` + store form |
| "Local-first storage, user-owned API keys" | `ARCHITECTURE.md` Decision 6 |
| "Never bundle an API key… the user enters their own key" | `CLAUDE.md`, `AGENTS.md` |
| "no server, no accounts" | `PRD.md` |
| "On your device" badge; "no servers" landing copy | side panel, `docs/index.html` |

**The honest replacement** (still a real differentiator):

> Free checks are scored by our server, which passes your text to the AI
> provider and returns the result. We don't store it, log it, or keep it —
> the request is processed and dropped. Prefer it never touches our server at
> all? Add your own API key and scoring goes straight from your browser to
> the provider.

**Deliverables**

- Rewrite `PRIVACY.md` **and** the gist (verify they match — the repo copy may
  still be the June 16 version, predating the saved-checks disclosure).
- Update: store description, `STORE_LISTING.md`, `README.md`,
  `docs/index.html`, `ARCHITECTURE.md` Decision 6 (+ new decision for the
  hosted proxy), `PRD.md`, `CLAUDE.md`, `AGENTS.md`, `JobFit-KEY-FACTS.md`,
  and the in-panel "On your device" badge (conditional: true on BYOK, false
  on hosted).
- Store form: data declarations become PII **yes**, Website content **yes**;
  new host-permission justification for the Worker origin; `storage`
  justification updated (install token added; key line survives until 4.5).

**Verification**
`grep -rin "no servers\|never leaves your device\|receives nothing\|no intermediary\|does not collect any user data" . --include="*.md" --include="*.html"`
returns only lines still true — i.e. explicitly scoped to the BYOK path.
Every surviving claim must answer: *is this true for a user with no key?*

## Task 4.4 — Resubmit as 1.3.0

New screenshots (first-run flow, **no key field** anywhere), new data
declarations, new host permission. Expect a slower review — new host
permission plus a data-posture change on an extension handling résumés.

**Verification:** published, and a fresh profile scores a job with zero setup.

## Task 4.5 — Delete BYOK — gated on Wave 7

Until a paid tier serves users who exceed the free tier, BYOK is the only
unlimited path. Deleting it before that isn't simplification; it's removing
the product's ceiling. When it goes: remove the two provider host
permissions, the key storage, the options-page key UI, and re-simplify
`getClient` — and update every 4.3 document again.

---

# Wave 7 — Payments (what lets BYOK die)

Not a task — a business decision, downstream of Wave 4 data. **Mechanical
trigger:** the global daily cap starts firing regularly — that's the free tier
outgrowing the balance, arriving as numbers instead of a guess. Needs: Stripe,
identity (this is where accounts/auth finally enter, attached to checkout —
not before), honest positioning about what's free. PRD sketches Pro $9/mo.
Open until the data exists.
