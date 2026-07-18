import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    // worker/ is a separate workerd package with its own vitest (workers pool);
    // this jsdom run must not sweep it in. Re-list node_modules since a custom
    // exclude replaces vitest's default.
    exclude: ['**/node_modules/**', 'worker/**'],
  },
});
