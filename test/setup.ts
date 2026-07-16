import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory mock of the WXT-injected `browser` global.
//
// Production modules (utils/usageCounter.ts, entrypoints/**/App.tsx, ...) call
// `browser.storage.local.*` as an auto-injected global with no import. jsdom
// has no such global, so we install one backed by a plain object store and
// mirror Chrome's `storage.local` API closely enough that any storage-touching
// module is testable without stubbing storage per-test.
//
// The store resets before every test (see beforeEach) so tests stay isolated.
// ---------------------------------------------------------------------------

let store: Record<string, unknown> = {};

/** Chrome's get(): string key, array of keys, object of key→default, or all. */
const get = vi.fn(
  async (
    query?: string | string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>> => {
    if (query === null || query === undefined) {
      return { ...store };
    }
    if (typeof query === 'string') {
      return query in store ? { [query]: store[query] } : {};
    }
    if (Array.isArray(query)) {
      const out: Record<string, unknown> = {};
      for (const key of query) {
        if (key in store) out[key] = store[key];
      }
      return out;
    }
    // Object form: keys with default values for anything missing.
    const out: Record<string, unknown> = {};
    for (const [key, fallback] of Object.entries(query)) {
      out[key] = key in store ? store[key] : fallback;
    }
    return out;
  },
);

const set = vi.fn(async (items: Record<string, unknown>): Promise<void> => {
  Object.assign(store, items);
});

const remove = vi.fn(async (keys: string | string[]): Promise<void> => {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    delete store[key];
  }
});

const clear = vi.fn(async (): Promise<void> => {
  store = {};
});

const storageLocal = { get, set, remove, clear };

(globalThis as unknown as { browser: unknown }).browser = {
  storage: { local: storageLocal },
};

/** Directly seed the mock store from a test (bypasses the mocked set()). */
export function __seedStorage(items: Record<string, unknown>): void {
  Object.assign(store, items);
}

beforeEach(() => {
  store = {};
  get.mockClear();
  set.mockClear();
  remove.mockClear();
  clear.mockClear();
});
