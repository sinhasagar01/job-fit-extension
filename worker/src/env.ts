/**
 * Worker environment bindings.
 *
 * `OPENAI_API_KEY` is a SECRET — never in wrangler.toml `[vars]`. It is provided
 * by worker/.dev.vars locally and `wrangler secret put` in production. The rest
 * come from `[vars]` in wrangler.toml (strings; parse as needed).
 */
export interface Env {
  RATE_LIMIT: KVNamespace;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  MAX_BODY_BYTES: string;
  DAILY_LIMIT_PER_TOKEN: string;
  DAILY_LIMIT_PER_IP: string;
  GLOBAL_DAILY_CAP: string;
}
