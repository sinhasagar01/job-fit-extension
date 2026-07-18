# JobFit scoring Worker

A Cloudflare Worker that scores résumé-vs-JD fit server-side so the extension
works with **no API key on first run** (Wave 4). It holds the OpenAI key in its
own environment and is called by the extension only when the user hasn't set
their own key (BYOK users go direct to their provider, never through here).

**Status:** scaffold only. `src/index.ts` is a 501 stub; the `POST /score`
handler, rate limiting, and provider call are Task 4.1.

This is an **isolated sub-package** — its own `package.json`, `tsconfig.json`,
`wrangler.toml`, and `vitest.config.ts` — because it runs on `workerd`, not the
extension's jsdom/DOM toolchain. The root `tsconfig`/`vitest` exclude `worker/`.

## Local setup (macOS)

Prerequisite: a Cloudflare account (free plan is fine) — https://dash.cloudflare.com/sign-up

```bash
cd worker
npm install                       # installs the pinned devDeps + writes the lockfile

npx wrangler login                # interactive OAuth — opens the browser, click "Allow"

# Create the KV namespace + preview twin, then paste the printed ids into wrangler.toml:
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create RATE_LIMIT --preview

# Local secret for `wrangler dev` (gitignored — never commit the real value):
cp .dev.vars.example .dev.vars    # then edit: OPENAI_API_KEY=sk-...
```

### Run / verify
```bash
npm run typecheck   # tsc --noEmit against workers-types (no DOM)
npm run test        # vitest in the workerd pool — the health test hits the stub
npm run dev         # wrangler dev — serves the stub on http://localhost:8787 (KV simulated locally)
# curl -X POST localhost:8787/score  ->  501 { "error": "not_implemented", ... }
```
Local `dev`/`test` simulate KV; the `id`/`preview_id` in `wrangler.toml` matter
only for **deploy** against your account.

### Deploy (later, on explicit go — after the handler exists)
```bash
npx wrangler secret put OPENAI_API_KEY   # interactive — paste the prod key (stored encrypted at Cloudflare)
npm run deploy                           # wrangler deploy
```

## Notes

- **Secrets never enter the repo.** Only `.dev.vars.example` (empty placeholder)
  is committed. `.dev.vars` is gitignored; production uses `wrangler secret put`.
- **`GLOBAL_DAILY_CAP = 200`** is bounded by the free-plan KV write limit
  (~1,000 writes/day), not the dollar budget — see the comment in `wrangler.toml`.
- **Toolchain peer versions:** `@cloudflare/vitest-pool-workers` pins a narrow
  `vitest` range; if `npm install` reports a peer mismatch, align `vitest` to the
  version the pool requires (that's why the Worker keeps its own lockfile,
  separate from the extension's `vitest@4`).
- **Zero-retention:** the handler must never log request bodies; KV stores only
  `{ token, date, count }`.
