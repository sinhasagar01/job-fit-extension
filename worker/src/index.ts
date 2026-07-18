import type { Env } from './env';
import { errorResponse } from './errors';
import { hashIp, readCount, utcDate, writeIncremented } from './rateLimit';
import { scoreWithOpenAI } from './openai';
import { INSTALL_TOKEN_HEADER } from '../../utils/shared/scoreProtocol';

/**
 * JobFit hosted scoring proxy. POST /score → { profileText, jdText, meta } →
 * FitResult, scored by OpenAI gpt-4o-mini with the provider key in env only.
 *
 * Abuse controls run in a fixed precedence, EVERY one before any provider call.
 * The rate-limit gates are READ-ONLY and reject without writing (so a rejected/
 * retried request never burns quota or KV writes); counters are incremented
 * only once a request clears all four gates and is about to be scored.
 *
 * Zero-retention: nothing here logs profileText/jdText/meta/body/provider text,
 * in any path including errors; KV holds only counts.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/score') {
      return new Response('Not found', { status: 404 });
    }

    const maxBytes = parseInt(env.MAX_BODY_BYTES, 10);

    // --- (a) input validation → invalid_input (before any KV or provider work) ---
    if (Number(request.headers.get('content-length') ?? '0') > maxBytes) {
      return errorResponse('invalid_input', 'body too large');
    }
    const token = request.headers.get(INSTALL_TOKEN_HEADER)?.trim();
    if (!token) return errorResponse('invalid_input', 'missing install token');

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).length > maxBytes) {
      return errorResponse('invalid_input', 'body too large');
    }
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return errorResponse('invalid_input', 'body is not valid JSON');
    }
    const { profileText, jdText, meta } = (body ?? {}) as {
      profileText?: unknown;
      jdText?: unknown;
      meta?: unknown;
    };
    if (typeof profileText !== 'string' || profileText.trim().length === 0) {
      return errorResponse('invalid_input', 'profileText required');
    }
    if (typeof jdText !== 'string' || jdText.trim().length === 0) {
      return errorResponse('invalid_input', 'jdText required');
    }

    // --- rate-limit gates: READ-only, reject without writing, in precedence order ---
    const date = utcDate(new Date());
    const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') ?? 'noip');
    const gKey = `g:${date}`;
    const tKey = `t:${token}:${date}`;
    const ipKey = `ip:${ipHash}:${date}`;

    // (b) global daily cap — fails closed, NO provider call, NO increments.
    const globalCount = await readCount(env.RATE_LIMIT, gKey);
    if (globalCount >= parseInt(env.GLOBAL_DAILY_CAP, 10)) {
      return errorResponse('free_tier_exhausted');
    }
    // (c) per-install token.
    const tokenCount = await readCount(env.RATE_LIMIT, tKey);
    if (tokenCount >= parseInt(env.DAILY_LIMIT_PER_TOKEN, 10)) {
      return errorResponse('rate_limited');
    }
    // (d) per-IP daily ceiling.
    const ipCount = await readCount(env.RATE_LIMIT, ipKey);
    if (ipCount >= parseInt(env.DAILY_LIMIT_PER_IP, 10)) {
      return errorResponse('rate_limited');
    }

    // --- all gates passed: increment (reuse the reads), then score ---
    await Promise.all([
      writeIncremented(env.RATE_LIMIT, tKey, tokenCount),
      writeIncremented(env.RATE_LIMIT, ipKey, ipCount),
      writeIncremented(env.RATE_LIMIT, gKey, globalCount),
    ]);

    const metaObj =
      typeof meta === 'object' && meta !== null
        ? (meta as { title?: string | null; company?: string | null })
        : undefined;

    try {
      const result = await scoreWithOpenAI(env, { profileText, jdText, meta: metaObj });
      return Response.json(result);
    } catch {
      // Never surface input or provider text.
      return errorResponse('provider_error');
    }
  },
} satisfies ExportedHandler<Env>;
