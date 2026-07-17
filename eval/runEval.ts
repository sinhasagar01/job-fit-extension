import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { baselineOutputPath } from './baselinePath';
import { createRealScoringClient } from '../utils/realScoringClient';
import { createOpenAICompatClient } from '../utils/openaiCompatScoringClient';
import { mockScoringClient } from '../utils/mockScoringClient';
import type { FitResult, ScoringClient } from '../utils/scorer';
import { EVAL_PAIRS } from './pairs';
import { aggregateRuns, DIMENSION_KEYS, MIN_RELIABLE_SAMPLES, type PairAggregate } from './stats';
import { callWithRetry } from './retry';

type Provider = 'gemini' | 'groq' | 'mock';

interface Config {
  provider: Provider;
  runs: number;
  model: string;
  temperature: number;
  seed?: number;
  delay: number;
  retries: number;
  backoff: number;
  allowIncomplete: boolean;
}

interface FailureRecord {
  run: number;
  status?: number;
  message: string;
}
interface PairReport {
  id: string;
  expectedBand: string;
  runs: number;
  succeeded: number;
  retries: number;
  failures: FailureRecord[];
  reliable: boolean;
  aggregate: PairAggregate | null;
}

function parseConfig(argv: string[]): Config {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const provider = (get('--provider') ?? process.env.EVAL_PROVIDER ?? 'mock') as Provider;
  const runs = Number(get('--runs') ?? process.env.EVAL_RUNS ?? 5);
  const model = get('--model') ?? process.env.EVAL_MODEL ?? 'llama-3.3-70b-versatile';
  const temperature = Number(get('--temperature') ?? process.env.EVAL_TEMPERATURE ?? 0.1);
  const seedRaw = get('--seed') ?? process.env.EVAL_SEED;
  const seed = seedRaw === undefined ? undefined : Number(seedRaw);
  const delay = Number(get('--delay') ?? process.env.EVAL_DELAY ?? 4000);
  const retries = Number(get('--retries') ?? process.env.EVAL_RETRIES ?? 3);
  const backoff = Number(get('--backoff') ?? process.env.EVAL_BACKOFF ?? 2000);
  const allowIncomplete =
    argv.includes('--allow-incomplete') || ['1', 'true'].includes(process.env.EVAL_ALLOW_INCOMPLETE ?? '');

  if (!['gemini', 'groq', 'mock'].includes(provider)) {
    throw new Error(`Unknown --provider "${provider}" (expected gemini | groq | mock)`);
  }
  if (!Number.isFinite(runs) || runs < 1) throw new Error(`--runs must be a positive integer (got "${runs}")`);
  if (!Number.isFinite(temperature)) throw new Error(`--temperature must be a number (got "${temperature}")`);
  if (seed !== undefined && !Number.isFinite(seed)) throw new Error(`--seed must be a number (got "${seedRaw}")`);
  for (const [name, v] of [['--delay', delay], ['--retries', retries], ['--backoff', backoff]] as const) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`${name} must be a non-negative number (got "${v}")`);
  }
  return { provider, runs, model, temperature, seed, delay, retries, backoff, allowIncomplete };
}

function buildClient({ provider, model, temperature, seed }: Config): ScoringClient {
  if (provider === 'mock') return mockScoringClient;
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Set GEMINI_API_KEY to run the gemini provider.');
    return createRealScoringClient(key, temperature);
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('Set GROQ_API_KEY to run the groq provider.');
  return createOpenAICompatClient({ baseUrl: 'https://api.groq.com/openai/v1', model, apiKey: key, temperature, seed });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const f2 = (n: number) => (Number.isNaN(n) ? '  n/a' : n.toFixed(2).padStart(5));

function printPair(p: PairReport): void {
  console.log(`\n${p.id}  [expected: ${p.expectedBand}]  n=${p.succeeded}/${p.runs} · retries=${p.retries}`);
  if (!p.reliable) {
    console.log(`  ⚠ UNRELIABLE — only ${p.succeeded} successful run(s) (need ≥${MIN_RELIABLE_SAMPLES}); stats below are NOT trustworthy`);
  }
  if (p.aggregate) {
    const o = p.aggregate.overall;
    console.log(`  overall   mean ${f2(o.mean)}  sd ${f2(o.stddev)}  runs [${o.values.join(', ')}]`);
    for (const k of DIMENSION_KEYS) {
      const s = p.aggregate.dimensions[k];
      console.log(`  ${k.padEnd(15)} mean ${f2(s.mean)}  var ${f2(s.variance)}  sd ${f2(s.stddev)}`);
    }
  }
  if (p.failures.length) {
    console.log(`  failures (${p.failures.length}):`);
    for (const f of p.failures) {
      console.log(`    run ${f.run}: ${f.status != null ? `HTTP ${f.status}` : 'no-status'} — ${f.message.slice(0, 120)}`);
    }
  }
}

async function main(): Promise<number> {
  const config = parseConfig(process.argv.slice(2));
  const client = buildClient(config);
  console.log(
    `Eval: provider=${config.provider}${config.provider === 'groq' ? ` model=${config.model}` : ''} ` +
      `temp=${config.temperature}${config.seed !== undefined ? ` seed=${config.seed}` : ''} ` +
      `runs=${config.runs} delay=${config.delay}ms retries=${config.retries} pairs=${EVAL_PAIRS.length}`
  );

  const report: PairReport[] = [];
  let callIndex = 0;
  for (const pair of EVAL_PAIRS) {
    process.stdout.write(`\n· ${pair.id} `);
    const results: FitResult[] = [];
    const failures: FailureRecord[] = [];
    let retries = 0;
    for (let i = 0; i < config.runs; i++) {
      if (callIndex > 0 && config.delay > 0) await sleep(config.delay); // throttle between calls
      callIndex++;
      const outcome = await callWithRetry(
        () => client.scoreFit(pair.resume, pair.jd, { title: pair.title, company: pair.company }),
        { maxRetries: config.retries, backoffMs: config.backoff, sleep }
      );
      retries += outcome.retriesUsed;
      if (outcome.ok) {
        results.push(outcome.result);
        process.stdout.write('.');
      } else {
        failures.push({ run: i + 1, status: outcome.status, message: outcome.message });
        process.stdout.write('x');
      }
    }
    const succeeded = results.length;
    const pairReport: PairReport = {
      id: pair.id,
      expectedBand: pair.expectedBand,
      runs: config.runs,
      succeeded,
      retries,
      failures,
      reliable: succeeded >= MIN_RELIABLE_SAMPLES,
      aggregate: succeeded >= 1 ? aggregateRuns(results) : null,
    };
    printPair(pairReport);
    report.push(pairReport);
  }

  // Completeness gate: a baseline is valid only if every pair scored fully.
  const incomplete = report.filter((p) => p.succeeded !== config.runs || p.failures.length > 0);
  const complete = incomplete.length === 0;
  console.log('');
  if (complete) {
    console.log(`✓ COMPLETE — every pair scored ${config.runs}/${config.runs} with 0 failures`);
  } else {
    console.log(`✗ INCOMPLETE — ${incomplete.length} pair(s) not fully scored:`);
    for (const p of incomplete) {
      const codes = [...new Set(p.failures.map((f) => f.status ?? 'no-status'))].join(', ');
      console.log(`    ${p.id}: n=${p.succeeded}/${p.runs}, ${p.failures.length} failure(s)${codes ? ` [${codes}]` : ''}`);
    }
  }

  // `new Date()` is fine here (plain Node via vite-node, not a workflow script).
  const baseline = {
    provider: config.provider,
    model: config.provider === 'groq' ? config.model : null,
    temperature: config.temperature,
    seed: config.seed ?? null,
    runs: config.runs,
    delay: config.delay,
    retries: config.retries,
    complete,
    timestamp: new Date().toISOString(),
    pairs: report,
  };
  // Invalid runs are quarantined under .incomplete/ (gitignored) so a failed
  // baseline can never be staged as a real one; valid runs write the committed
  // path.
  const out = baselineOutputPath(config.provider, complete);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(baseline, null, 2));
  console.log(`\nBaseline written to ${out}`);

  if (!complete && !config.allowIncomplete) {
    console.log('This baseline is INVALID (incomplete) — quarantined under .incomplete/ (gitignored). Re-run — or pass --allow-incomplete for exploration only.');
    return 1;
  }
  if (!complete) console.log('⚠ --allow-incomplete: kept despite gaps; NOT valid for eval:compare.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
