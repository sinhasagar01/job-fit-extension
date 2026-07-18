import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

// Runs the Worker's tests inside workerd (not jsdom), with the bindings from
// wrangler.toml (KV is simulated locally). This is why the Worker lives in its
// own package: the root vitest is jsdom + the React setup file, which would
// break Worker tests.
export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
