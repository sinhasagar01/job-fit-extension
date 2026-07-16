# Scoring eval harness (Task 3.1)

Measures the **consistency** of the fit scorer: it runs each fixed `(resume, JD)`
pair N times against a provider and reports per-dimension **mean and variance**,
so you can see how much the model's scores wobble on identical input.

## Files

| File | Purpose |
|------|---------|
| `pairs.ts` | 6 fixed `(resume, JD)` pairs — 2 strong, 2 mid, 2 weak fit |
| `stats.ts` | mean / variance / stddev + `aggregateRuns` (unit-tested in `stats.test.ts`) |
| `runEval.ts` | the runner: N runs per pair → per-dimension stats → `baselines/<provider>.json` |
| `baselines/` | recorded output per provider (generated) |

The harness reuses the **real** scoring path — `buildPrompt` and the actual
Gemini/Groq clients — via `vite-node` (which supplies `import.meta.env`).

## Run it

```bash
# No keys needed — proves the harness plumbing with random mock scores:
npm run eval:mock

# Real providers (keys via env, never committed):
GEMINI_API_KEY=…  npm run eval -- --provider gemini --runs 5
GROQ_API_KEY=…    npm run eval -- --provider groq   --runs 5 --model llama-3.3-70b-versatile
```

Flags: `--provider gemini|groq|mock`, `--runs N` (default 5), `--model <id>` (groq).
Env equivalents: `EVAL_PROVIDER`, `EVAL_RUNS`, `EVAL_MODEL`.

## Recording baselines

Each run writes `baselines/<provider>.json` (provider, model, runs, timestamp,
and per-pair aggregates). **Commit `baselines/gemini.json` and `baselines/groq.json`**
as the recorded baselines for Task 3.1 — they contain only scores, no secrets.
`baselines/mock.json` is throwaway (gitignored).

## Harness stability

The aggregation math is pure and deterministic (`stats.test.ts` pins it), so any
variance a baseline reports is the **model's**, not the harness's. Verify by
running the same provider twice — the statistics should be comparable. High
per-dimension variance on identical input is exactly what Task 3.2 (Groq score
consistency) then works to reduce.
