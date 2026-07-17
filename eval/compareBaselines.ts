import { readFileSync } from 'node:fs';
import { compareBaselines } from './compare';

// CLI: compare two eval baselines and report how per-dimension variance moved.
//   npm run eval:compare -- <before.json> <after.json> [--bound 1.0]
//
// Refuses (exit non-zero) if either baseline is incomplete, and reports any
// per-pair skips due to unreliable (n<3) data — so 3.2 conclusions can only be
// drawn from sound baselines.

function main(): void {
  const argv = process.argv.slice(2);
  const files = argv.filter((a) => !a.startsWith('--'));
  const boundIdx = argv.indexOf('--bound');
  const bound = boundIdx >= 0 ? Number(argv[boundIdx + 1]) : 1.0;

  if (files.length !== 2) {
    console.error('Usage: npm run eval:compare -- <before.json> <after.json> [--bound 1.0]');
    process.exit(1);
  }

  const [before, after] = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));

  let result;
  try {
    result = compareBaselines(before, after, bound);
  } catch (err) {
    // Incomplete baseline → refuse outright.
    console.error(`✗ ${err instanceof Error ? err.message : err}`);
    process.exit(2);
  }

  const f2 = (n: number) => (Number.isNaN(n) ? '  n/a' : n.toFixed(2).padStart(5));
  const sign = (n: number) => (n <= 0 ? '' : '+') + n.toFixed(2);

  console.log(`Comparing ${files[0]}  →  ${files[1]}\n`);

  if (result.refusedPairs.length) {
    console.log('Refused pairs (not compared):');
    for (const r of result.refusedPairs) console.log(`  ${r.id}: ${r.reason}`);
    console.log('');
  }

  for (const pair of result.pairs) {
    console.log(pair.id);
    for (const d of pair.deltas) {
      const arrow = d.delta < 0 ? '↓' : d.delta > 0 ? '↑' : '·';
      console.log(`  ${d.dimension.padEnd(15)} sd ${f2(d.before)} → ${f2(d.after)}  (${sign(d.delta)}) ${arrow}`);
    }
  }

  console.log(
    `\nmean dim stddev: ${f2(result.meanStddevBefore)} → ${f2(result.meanStddevAfter)} ` +
      `(${sign(result.meanStddevAfter - result.meanStddevBefore)})`
  );
  console.log(`worst "after" dim stddev: ${f2(result.maxStddevAfter)}  (bound ${result.bound})`);
  console.log(result.withinBound ? '✓ within bound' : '✗ exceeds bound');

  // Non-zero if any pair was refused (unreliable) or the bound was exceeded.
  const refused = result.refusedPairs.length > 0;
  if (refused) console.log(`✗ ${result.refusedPairs.length} pair(s) refused as unreliable — comparison is incomplete`);
  process.exit(refused || !result.withinBound ? 1 : 0);
}

main();
