import { resolve } from 'node:path';

/**
 * Resolve where a baseline JSON is written, keyed on whether the run passed the
 * completeness gate.
 *
 * - **Valid (complete) runs** land at `eval/baselines/<provider>.json` — the
 *   committed path that `eval:compare` and Task 3.1 read.
 * - **Invalid (incomplete) runs** are quarantined under
 *   `eval/baselines/.incomplete/<provider>.json`, a gitignored directory, so a
 *   stray `git add -A` can never stage a failed run as if it were a real
 *   baseline (which is exactly what happened in 69f7cfa). An invalid run must
 *   never share a path with a valid one.
 *
 * `baseDir` is injectable so the decision is unit-testable without touching the
 * filesystem.
 */
export function baselineOutputPath(
  provider: string,
  complete: boolean,
  baseDir: string = resolve(process.cwd(), 'eval/baselines'),
): string {
  const dir = complete ? baseDir : resolve(baseDir, '.incomplete');
  return resolve(dir, `${provider}.json`);
}
