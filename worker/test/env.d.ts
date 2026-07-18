import type { Env } from '../src/env';

// Type the `env` provided by cloudflare:test as the Worker's Env (KV binding + vars).
declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
