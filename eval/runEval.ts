import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRealScoringClient } from '../utils/realScoringClient';
import { createOpenAICompatClient } from '../utils/openaiCompatScoringClient';
import { mockScoringClient } from '../utils/mockScoringClient';
import type { ScoringClient } from '../utils/scorer';
import { EVAL_PAIRS } from './pairs';
import { aggregateRuns, DIMENSION_KEYS, type PairAggregate } from './stats';

type Provider = 'gemini' | 'groq' | 'mock';

interface Config {
  provider: Provider;
  runs: number;
  model: string;
  temperature: number;
  seed?: number;
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
  if (!['gemini', 'groq', 'mock'].includes(provider)) {
    throw new Error(`Unknown --provider "${provider}" (expected gemini | groq | mock)`);
  }
  if (!Number.isFinite(runs) || runs < 1) {
    throw new Error(`--runs must be a positive integer (got "${runs}")`);
  }
  if (!Number.isFinite(temperature)) {
    throw new Error(`--temperature must be a number (got "${temperature}")`);
  }
  if (seed !== undefined && !Number.isFinite(seed)) {
    throw new Error(`--seed must be a number (got "${seedRaw}")`);
  }
  return { provider, runs, model, temperature, seed };
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
  return createOpenAICompatClient({
    baseUrl: 'https://api.groq.com/openai/v1',
    model,
    apiKey: key,
    temperature,
    seed,
  });
}

const f2 = (n: number) => (Number.isNaN(n) ? '  n/a' : n.toFixed(2).padStart(5));

function printPair(id: string, band: string, agg: PairAggregate, failures: number): void {
  const o = agg.overall;
  console.log(`\n${id}  [expected: ${band}]`);
  console.log(`  overall   mean ${f2(o.mean)}  sd ${f2(o.stddev)}  runs [${o.values.join(', ')}]`);
  for (const k of DIMENSION_KEYS) {
    const s = agg.dimensions[k];
    console.log(`  ${k.padEnd(15)} mean ${f2(s.mean)}  var ${f2(s.variance)}  sd ${f2(s.stddev)}`);
  }
  if (failures > 0) console.log(`  ⚠ ${failures} run(s) failed and were excluded from the stats`);
}

async function main(): Promise<void> {
  const config = parseConfig(process.argv.slice(2));
  const client = buildClient(config);
  console.log(
    `Eval: provider=${config.provider}${config.provider === 'groq' ? ` model=${config.model}` : ''} ` +
      `temp=${config.temperature}${config.seed !== undefined ? ` seed=${config.seed}` : ''} ` +
      `runs=${config.runs} pairs=${EVAL_PAIRS.length}`
  );

  const report = [];
  for (const pair of EVAL_PAIRS) {
    process.stdout.write(`\n· ${pair.id} `);
    const results = [];
    let failures = 0;
    for (let i = 0; i < config.runs; i++) {
      try {
        const r = await client.scoreFit(pair.resume, pair.jd, { title: pair.title, company: pair.company });
        results.push(r);
        process.stdout.write('.');
      } catch (err) {
        failures++;
        process.stdout.write('x');
        if (config.provider !== 'mock') {
          console.error(`\n  run ${i + 1} error:`, err instanceof Error ? err.message : err);
        }
      }
    }
    if (results.length === 0) {
      console.log(`\n  all ${config.runs} runs failed — skipping ${pair.id}`);
      report.push({ id: pair.id, expectedBand: pair.expectedBand, failures, aggregate: null });
      continue;
    }
    const aggregate = aggregateRuns(results);
    printPair(pair.id, pair.expectedBand, aggregate, failures);
    report.push({ id: pair.id, expectedBand: pair.expectedBand, failures, aggregate });
  }

  // `new Date()` is fine here (plain Node via vite-node, not a workflow script).
  const stamp = new Date().toISOString();
  const baseline = {
    provider: config.provider,
    model: config.provider === 'groq' ? config.model : null,
    temperature: config.temperature,
    seed: config.seed ?? null,
    runs: config.runs,
    timestamp: stamp,
    pairs: report,
  };
  const dir = resolve(process.cwd(), 'eval/baselines');
  mkdirSync(dir, { recursive: true });
  const out = resolve(dir, `${config.provider}.json`);
  writeFileSync(out, JSON.stringify(baseline, null, 2));
  console.log(`\nBaseline written to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
