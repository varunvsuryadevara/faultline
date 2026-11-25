#!/usr/bin/env node
// Runs the AI evaluation test cases (evals/ai-cases.js) through FaultLine's claims assessment and
// grades each answer against its expected results. Uses the same model settings as the server
// (.env: ANTHROPIC_API_KEY, or LLM_PROVIDER=openai with its key).
//
//   npm run eval                              all 125 cases with the configured model
//   npm run eval -- --only TC-001,TC-101      selected cases (test case or scenario ids)
//   npm run eval -- --kind counterfactual     only the counterfactual variants
//   npm run eval -- --limit 10 --concurrency 3
//   npm run eval -- --dry-run                 build and check every case file, no model calls
//   npm run eval -- --oracle                  grade the scenarios' own reference answers (no model)
//   npm run eval -- --min-pass 0.8            exit with an error below an 80% pass rate
//
// Results are written to eval-results/<date-time>/results.json and report.md.

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { AI_CASES, evalInput } from '../evals/ai-cases.js';
import { gradeAssessment } from '../evals/grade.js';
import { referenceAssessment } from '../evals/oracle.js';
import { getProvider } from '../server/providers/index.js';
import { runAssessment } from '../shared/assess.js';
import { getScenario } from '../shared/scenarios/index.js';
import { countryName, labelOf } from '../shared/scenarios/vocab.js';
import { validateCase } from '../shared/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Same rule as the server: non-empty values in .env win.
try {
  statSync(path.join(ROOT, '.env'));
  const parsed = parseEnv(readFileSync(path.join(ROOT, '.env'), 'utf8').replace(/^﻿/, ''));
  for (const [k, v] of Object.entries(parsed)) if (v.trim() !== '') process.env[k] = v.trim();
} catch {
  // no .env
}

function parseArgs(argv) {
  const opts = { only: null, kind: null, limit: Infinity, concurrency: 2, dryRun: false, oracle: false, minPass: 0, out: path.join(ROOT, 'eval-results') };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--only') opts.only = next().split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (a === '--kind') opts.kind = next();
    else if (a === '--limit') opts.limit = Number(next());
    else if (a === '--concurrency') opts.concurrency = Math.max(1, Number(next()) || 1);
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--oracle') opts.oracle = true;
    else if (a === '--min-pass') opts.minPass = Number(next());
    else if (a === '--out') opts.out = path.resolve(next());
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).join('\n'));
      process.exit(0);
    } else throw new Error(`Unknown option ${a}`);
  }
  return opts;
}

const timeoutMs = () => (Number(process.env.ANALYSIS_TIMEOUT_SECONDS) || 240) * 1000;
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : 'n/a');

async function assessOnce(provider, input) {
  return runAssessment(input, {
    streamText: (prompt, options) => provider.stream(prompt, options),
    signal: AbortSignal.timeout(timeoutMs()),
    provider: provider.name,
    model: provider.model,
  });
}

async function runCase(c, opts, provider) {
  const started = Date.now();
  const base = { id: c.id, kind: c.kind, scenario: c.scenario, title: c.title, rule: c.rule };
  try {
    const { scenario, caseFile } = evalInput(c, getScenario);
    Object.assign(base, { country: scenario.country, stage: scenario.stage });
    const parsed = validateCase({ context: caseFile.context, sources: caseFile.exhibits });
    if (!parsed.ok) throw new Error(`case file is not valid: ${parsed.error}`);
    if (opts.dryRun) return { ...base, pass: null, ms: Date.now() - started };
    let assessment;
    if (opts.oracle) {
      if (c.kind !== 'scenario') return { ...base, pass: null, skipped: 'oracle grades scenario cases only', ms: 0 };
      assessment = referenceAssessment(scenario);
    } else {
      try {
        assessment = await assessOnce(provider, parsed.value);
      } catch (err) {
        if (!err?.retryable) throw err;
        assessment = await assessOnce(provider, parsed.value); // one retry for overload or timeouts
      }
    }
    const grade = gradeAssessment(assessment, c.expect);
    return { ...base, ...grade, intent: assessment.intent, risk: grade.risk, ms: Date.now() - started };
  } catch (err) {
    return { ...base, pass: false, error: err?.message ?? String(err), ms: Date.now() - started };
  }
}

async function pool(items, size, worker, onDone) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i]);
        onDone(results[i], i);
      }
    }),
  );
  return results;
}

function group(results, key, label) {
  const rows = new Map();
  for (const r of results.filter((x) => x.pass !== null)) {
    const k = r[key] ?? 'unknown';
    const row = rows.get(k) ?? { n: 0, pass: 0 };
    row.n += 1;
    row.pass += r.pass ? 1 : 0;
    rows.set(k, row);
  }
  return [...rows.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([k, v]) => `| ${label(k)} | ${v.n} | ${v.pass} | ${pct(v.pass, v.n)} |`)
    .join('\n');
}

function reportMarkdown(results, meta) {
  const graded = results.filter((r) => r.pass !== null);
  const passed = graded.filter((r) => r.pass).length;
  const failed = graded.filter((r) => !r.pass);
  const lines = [
    `# FaultLine AI evaluation report`,
    '',
    `Run: ${meta.started}. Mode: ${meta.mode}. Model: ${meta.model}.`,
    `Cases graded: ${graded.length}. Passed: ${passed} (${pct(passed, graded.length)}). Failed: ${failed.length}. Errors: ${graded.filter((r) => r.error).length}.`,
    '',
    'A case passes when the intent family and the risk level are among those expected and every required concept is present in the assessment.',
    '',
    '## By claim stage',
    '',
    '| Stage | Cases | Passed | Pass rate |',
    '| --- | --- | --- | --- |',
    group(results, 'stage', (k) => labelOf('stage', k)),
    '',
    '## By kind',
    '',
    '| Kind | Cases | Passed | Pass rate |',
    '| --- | --- | --- | --- |',
    group(results, 'kind', (k) => (k === 'counterfactual' ? 'Counterfactual variant' : 'Scenario')),
    '',
    '## By country',
    '',
    '| Country | Cases | Passed | Pass rate |',
    '| --- | --- | --- | --- |',
    group(results, 'country', (k) => countryName(k)),
    '',
    '## Failed cases',
    '',
  ];
  if (!failed.length) lines.push('None.');
  for (const r of failed) {
    lines.push(`### ${r.id} (${r.scenario}): ${r.title}`, '');
    if (r.error) {
      lines.push(`Error: ${r.error}`, '');
      continue;
    }
    if (!r.family.pass) lines.push(`- Intent: got ${r.family.intent} (${r.family.got}), expected ${r.family.expected.join(' or ')}`);
    if (!r.risk.pass) lines.push(`- Risk: got ${r.risk.got}, expected ${r.risk.expected.join(' or ')}`);
    for (const f of r.flags.filter((x) => !x.pass)) lines.push(`- ${f.required ? 'Missing (required)' : 'Missing (optional)'}: ${f.label}`);
    lines.push(`- Rule tested: ${r.rule}`, '');
  }
  return lines.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let cases = AI_CASES;
  if (opts.only) cases = cases.filter((c) => opts.only.includes(c.id) || opts.only.includes(c.scenario));
  if (opts.kind) cases = cases.filter((c) => c.kind === opts.kind);
  cases = cases.slice(0, opts.limit);
  if (!cases.length) throw new Error('No cases match the options.');

  let provider = null;
  if (!opts.dryRun && !opts.oracle) {
    provider = getProvider();
    if (!provider.configured) {
      console.error(`No model configured. ${provider.setupHint}\nTip: --dry-run and --oracle work without a key.`);
      process.exit(1);
    }
  }
  const mode = opts.dryRun ? 'dry run (no model)' : opts.oracle ? 'oracle (reference answers, no model)' : 'model';
  const meta = { started: new Date().toISOString(), mode, model: provider ? `${provider.name} ${provider.model}` : 'none' };
  console.log(`Running ${cases.length} case(s), ${mode}${provider ? `, ${meta.model}` : ''}, concurrency ${opts.concurrency}.`);

  const results = await pool(cases, opts.dryRun || opts.oracle ? 8 : opts.concurrency, (c) => runCase(c, opts, provider), (r) => {
    const mark = r.pass === null ? (r.error ? 'ERROR' : 'ok   ') : r.pass ? 'PASS ' : 'FAIL ';
    const why = r.error ? ` ${r.error}` : r.pass === false ? ` ${[!r.family?.pass && `intent ${r.family.intent}`, !r.risk?.pass && `risk ${r.risk.got}`, ...(r.flags ?? []).filter((f) => f.required && !f.pass).map((f) => `missing: ${f.label}`)].filter(Boolean).join('; ')}` : '';
    console.log(`${mark} ${r.id} ${r.scenario}${why}`);
  });

  const graded = results.filter((r) => r.pass !== null);
  const passed = graded.filter((r) => r.pass).length;
  const errors = results.filter((r) => r.error).length;
  const stamp = meta.started.replace(/[:.]/g, '-');
  const dir = path.join(opts.out, stamp);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ meta, results }, null, 2));
  writeFileSync(path.join(dir, 'report.md'), reportMarkdown(results, meta));
  console.log(graded.length ? `\nPassed ${passed} of ${graded.length} (${pct(passed, graded.length)}).` : `\nChecked ${results.length} case files.`);
  console.log(`Report: ${path.relative(ROOT, path.join(dir, 'report.md'))}`);
  if (errors || (graded.length && passed / graded.length < opts.minPass)) process.exit(1);
}

main().catch((err) => {
  console.error(err?.message ?? err);
  process.exit(1);
});
