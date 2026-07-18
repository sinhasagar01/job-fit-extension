import type { Env } from './env';

/**
 * JobFit scoring proxy — SCAFFOLD STUB.
 *
 * Task 4.1 (setup) stops here. The real `POST /score` handler — request
 * validation, the four-tier abuse controls (global fail-closed cap, per-install
 * token, per-IP, size limit), the OpenAI `gpt-4o-mini` call reusing buildPrompt
 * + validateFitResult, and the typed error vocabulary — lands next. Everything
 * returns 501 for now so the Worker is runnable/deployable and the tooling is
 * verifiable without any behaviour yet.
 *
 * Zero-retention rule for the coming handler: never log request bodies; KV
 * stores only { token, date, count }.
 */
export default {
  async fetch(): Promise<Response> {
    return Response.json(
      { error: 'not_implemented', reason: 'scaffold stub — /score lands in Task 4.1' },
      { status: 501 },
    );
  },
} satisfies ExportedHandler<Env>;
