// Automated application test cases for the claims-stage pack (TC-126 to TC-148; see
// evals/app-cases.js). Test names start with the case id so results trace back to the test
// case list. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import { SCENARIOS, SCENARIO_PROBLEMS, getScenario } from '../shared/scenarios/index.js';
import { EXISTING_STAGES } from '../shared/scenarios/stages.js';
import { FILTERS, STAGES, STAGE_GROUPS, labelOf, stageGroupOf } from '../shared/scenarios/vocab.js';
import { facetCounts, queryScenarios } from '../shared/scenarios/query.js';
import { scenarioCase } from '../shared/scenarios/case.js';
import { validateCase } from '../shared/validate.js';
import { scenarioRouter } from '../server/scenarios.js';
import { AI_CASES, applyPatch, evalInput } from '../evals/ai-cases.js';
import { APP_CASES } from '../evals/app-cases.js';
import { caseProblems, gradeAssessment, normalizeText } from '../evals/grade.js';
import { referenceAssessment } from '../evals/oracle.js';

const ORIGINAL_FILES = ['uk', 'uk-b', 'uk-c', 'uk-d', 'us', 'us-b', 'us-c', 'us-d', 'in', 'in-b', 'in-c', 'in-d', 'ca', 'au', 'ae', 'de', 'fr', 'za', 'sg', 'other'];
const ORIGINAL_FINGERPRINT = 'b035f77f067c01b2b1b4ab8c58e65760da8fd657fe4303b079dd36cf49f8d60e';
const NEW = SCENARIOS.filter((s) => !(s.id in EXISTING_STAGES));
const ids = (r) => r.items.map((s) => s.id);
const range = (cc, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${cc}-${String(from + i).padStart(3, '0')}`);
const caseText = (c) => normalizeText([c.context, ...c.exhibits.map((e) => `${e.label}\n${e.text}`)].join('\n'));

test('TC-126 the library holds 266 scenarios with no structural problems', () => {
  assert.equal(SCENARIOS.length, 266);
  assert.equal(NEW.length, 100);
  assert.deepEqual(SCENARIO_PROBLEMS, []);
  for (const s of SCENARIOS) {
    const c = scenarioCase(s);
    assert.ok(validateCase({ context: c.context, sources: c.exhibits }).ok, s.id);
  }
});

test('TC-127 the original 166 scenarios are unchanged', async () => {
  const records = [];
  for (const f of ORIGINAL_FILES) records.push(...(await import(`../shared/scenarios/data/${f}.js`)).default);
  assert.equal(records.length, 166);
  assert.equal(createHash('sha256').update(JSON.stringify(records)).digest('hex'), ORIGINAL_FINGERPRINT);
});

test('TC-128 every scenario has a valid claim stage from the right place', async () => {
  const values = new Set(STAGES.map((s) => s.value));
  for (const s of SCENARIOS) assert.ok(values.has(s.stage), `${s.id} has stage ${s.stage}`);
  assert.equal(Object.keys(EXISTING_STAGES).length, 166);
  const records = [];
  for (const f of ORIGINAL_FILES) records.push(...(await import(`../shared/scenarios/data/${f}.js`)).default);
  for (const r of records) assert.equal(r.stage, undefined, `${r.id} should take its stage from stages.js`);
  for (const s of NEW) assert.ok(s.stage, `${s.id} should carry its own stage`);
});

test('TC-129 new scenario ids continue each series without gaps', () => {
  const expected = [
    ...range('UK', 37, 58), ...range('US', 35, 54), ...range('IN', 37, 58),
    ...range('CA', 9, 13), ...range('AU', 9, 13), ...range('AE', 8, 11), ...range('DE', 8, 11), ...range('FR', 8, 11), ...range('ZA', 8, 11), ...range('SG', 7, 10),
    'IE-002', 'NZ-002', 'JP-002', 'IT-002', 'ES-002', 'MY-002',
  ];
  assert.deepEqual(NEW.map((s) => s.id).sort(), expected.sort());
  assert.equal(new Set(SCENARIOS.map((s) => s.title.toLowerCase())).size, 266);
});

test('TC-130 the new scenarios keep the country mix', () => {
  const by = (c) => NEW.filter((s) => s.country === c).length;
  assert.deepEqual([by('UK'), by('US'), by('IN')], [22, 20, 22]);
  assert.deepEqual([by('CA'), by('AU'), by('AE'), by('DE'), by('FR'), by('ZA'), by('SG')], [5, 5, 4, 4, 4, 4, 4]);
  for (const c of ['IE', 'NZ', 'JP', 'IT', 'ES', 'MY']) assert.equal(by(c), 1, c);
});

test('TC-131 the new scenarios cover all four claim areas', () => {
  const byGroup = {};
  for (const s of NEW) byGroup[stageGroupOf(s.stage).value] = (byGroup[stageGroupOf(s.stage).value] ?? 0) + 1;
  assert.deepEqual(byGroup, { intake: 22, 'assessment-settlement': 20, 'third-parties': 31, 'fraud-compliance': 27 });
  for (const st of STAGES) assert.ok(NEW.filter((s) => s.stage === st.value).length >= 6, st.value);
});

test('TC-132 the Claim stage filter is offered with grouped options', () => {
  assert.equal(FILTERS.length, 11);
  assert.equal(FILTERS[1].key, 'stage');
  assert.equal(FILTERS[1].label, 'Claim stage');
  assert.equal(FILTERS[1].options.length, 10);
  assert.deepEqual(FILTERS[1].groups.map((g) => g.label), ['Intake and cover', 'Assessment and settlement', 'Third parties, recovery and legal', 'Fraud, compliance and customer']);
  for (const o of FILTERS[1].options) assert.ok(STAGE_GROUPS.some((g) => g.value === o.group), o.value);
  const facets = facetCounts(SCENARIOS, {});
  assert.equal(Object.values(facets.stage).reduce((a, b) => a + b, 0), 266);
});

test('TC-133 filtering by one stage returns exactly that stage', () => {
  const expected = { coverage: 53, fraud: 45, 'third-party': 44, assessment: 33, settlement: 24, recovery: 21, notification: 17, legal: 14, customer: 9, compliance: 6 };
  for (const [stage, n] of Object.entries(expected)) {
    const r = queryScenarios(SCENARIOS, { filters: { stage: [stage] } });
    assert.equal(r.total, n, stage);
    assert.ok(r.items.every((s) => s.stage === stage), stage);
  }
});

test('TC-134 stage combines with other filters and facets stay consistent', () => {
  const r = queryScenarios(SCENARIOS, { filters: { stage: ['fraud'], country: ['IN'] } });
  assert.equal(r.total, 10);
  assert.ok(r.items.every((s) => s.stage === 'fraud' && s.country === 'IN'));
  const facets = facetCounts(SCENARIOS, { filters: { stage: ['fraud'] } });
  assert.ok(facets.stage.coverage > 0, 'the stage facet ignores its own filter');
  assert.equal(Object.values(facets.country).reduce((a, b) => a + b, 0), 45);
});

test('TC-135 search finds the new scenarios by their key concepts', () => {
  const firsts = {
    'Part 36': 'UK-051',
    SASRIA: 'ZA-008',
    'time-limited demand': 'US-046',
    Werkstattrisiko: 'DE-009',
    'subject access request': 'UK-057',
    'Enhanced Care': 'CA-011',
    'knock-for-knock': 'MY-002',
    'family violence': 'AU-011',
    'insider fraud': 'US-050',
    'Cashless Treatment Scheme': 'IN-048',
  };
  for (const [q, id] of Object.entries(firsts)) assert.equal(ids(queryScenarios(SCENARIOS, { q }))[0], id, q);
});

test('TC-136 search matches stage names', () => {
  const r = queryScenarios(SCENARIOS, { q: 'regulatory compliance' });
  assert.ok(r.total >= 6);
  for (const s of SCENARIOS.filter((x) => x.stage === 'compliance')) assert.ok(ids(r).includes(s.id), s.id);
  assert.equal(ids(queryScenarios(SCENARIOS, { q: 'ombudsman' }))[0], 'IN-057');
});

test('TC-137 existing search behaviour is unchanged', () => {
  const crash = ids(queryScenarios(SCENARIOS, { q: 'UK crash for cash' }));
  assert.equal(crash[0], 'UK-021');
  assert.ok(crash.every((id) => id.startsWith('UK-')));
  assert.equal(ids(queryScenarios(SCENARIOS, { q: 'kangaroo' }))[0], 'AU-001');
  assert.deepEqual(ids(queryScenarios(SCENARIOS, { q: '"pay and recover"' })).sort(), ['IN-010', 'IN-025']);
  assert.ok(queryScenarios(SCENARIOS, { q: 'FIR' }).items.every((s) => s.country === 'IN'));
  const ev = ids(queryScenarios(SCENARIOS, { q: 'EV fire' }));
  assert.ok(ev.includes('UK-014') && ev.includes('IN-018') && ev.length <= 6);
});

// A small server with the real scenario router and a test provider (no network, no key).
async function withApi(fn, provider = { configured: false, setupHint: 'none' }) {
  const app = express();
  app.use(express.json());
  app.use('/api/scenarios', scenarioRouter({ getProvider: () => provider, rateLimiter: (req, res, next) => next(), timeoutMs: () => 30_000 }));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/scenarios`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('TC-138 GET /api/scenarios filters by stage', async () => {
  await withApi(async (base) => {
    const res = await fetch(`${base}?stage=legal&limit=200`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 14);
    assert.ok(body.items.every((s) => s.stage === 'legal'));
  });
});

test('TC-139 GET /api/scenarios returns stage facets', async () => {
  await withApi(async (base) => {
    const body = await (await fetch(base)).json();
    assert.equal(body.total, 266);
    assert.equal(Object.keys(body.facets.stage).length, 10);
    assert.equal(Object.values(body.facets.stage).reduce((a, b) => a + b, 0), 266);
  });
});

test('TC-140 GET /api/scenarios/:id returns a new scenario with its case file', async () => {
  await withApi(async (base) => {
    const res = await fetch(`${base}/in-048`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.scenario.id, 'IN-048');
    assert.equal(body.scenario.stage, 'third-party');
    assert.equal(body.case.exhibits[0].label, 'Claim notification (first notice of loss)');
    assert.equal(body.case.exhibits.at(-1).label, 'Damage and evidence on file');
  });
});

test('TC-141 GET /api/scenarios/random honours the stage filter', async () => {
  await withApi(async (base) => {
    for (let i = 0; i < 10; i += 1) {
      const body = await (await fetch(`${base}/random?stage=compliance`)).json();
      assert.equal(body.scenario.stage, 'compliance');
    }
  });
});

test('TC-143 case files never reveal the reference answers or the stage', () => {
  for (const s of NEW) {
    const c = scenarioCase(s);
    const text = JSON.stringify(c);
    for (const field of ['whatHappened', 'assessment', 'action']) assert.ok(!text.includes(s[field]), `${s.id} leaks ${field}`);
    assert.ok(!text.toLowerCase().includes(labelOf('stage', s.stage).toLowerCase()), `${s.id} leaks its stage`);
    for (const m of s.missing) assert.ok(!text.includes(`- ${m}`), `${s.id} holds a missing item as evidence`);
  }
});

test('TC-144 assessing a new scenario streams a result with the comparison', async () => {
  const scenario = getScenario('UK-037');
  const answer = JSON.stringify(referenceAssessment(scenario));
  const provider = {
    name: 'Test',
    model: 'test',
    configured: true,
    stream: async (prompt, { onText } = {}) => {
      onText?.(answer);
      return answer;
    },
  };
  await withApi(async (base) => {
    const res = await fetch(`${base}/UK-037/assess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(res.status, 200);
    const messages = (await res.text()).trim().split('\n').map((line) => JSON.parse(line));
    const result = messages.find((m) => m.type === 'result')?.result;
    assert.ok(result, 'a result message');
    assert.equal(result.scenarioId, 'UK-037');
    assert.equal(result.comparison.overall, 'agrees');
    assert.ok(['intent', 'risk'].every((k) => result.comparison[k]));
  }, provider);
});

test('TC-145 the evaluation runner works without a model', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'faultline-evals-'));
  try {
    const script = path.join(import.meta.dirname, '..', 'scripts', 'run-evals.mjs');
    const dry = execFileSync(process.execPath, [script, '--dry-run', '--out', out], { encoding: 'utf8' });
    assert.match(dry, /Checked 125 case files\./);
    const oracle = execFileSync(process.execPath, [script, '--oracle', '--out', out], { encoding: 'utf8' });
    assert.match(oracle, /Passed 100 of 100/);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('TC-146 every AI test case is well formed', () => {
  assert.deepEqual(AI_CASES.map((c) => c.id), Array.from({ length: 125 }, (_, i) => `TC-${String(i + 1).padStart(3, '0')}`));
  for (const c of AI_CASES) assert.deepEqual(caseProblems(c), [], c.id);
  const scenarioCases = AI_CASES.filter((c) => c.kind === 'scenario');
  assert.equal(scenarioCases.length, 100);
  assert.deepEqual(scenarioCases.map((c) => c.scenario).sort(), NEW.map((s) => s.id).sort());
  assert.equal(AI_CASES.filter((c) => c.kind === 'counterfactual').length, 25);
  assert.deepEqual(APP_CASES.map((c) => c.id), Array.from({ length: 25 }, (_, i) => `TC-${126 + i}`));
});

test('TC-147 counterfactual patches apply cleanly and required checks are not in the case file', () => {
  for (const c of AI_CASES) {
    const { caseFile } = evalInput(c, getScenario);
    assert.ok(validateCase({ context: caseFile.context, sources: caseFile.exhibits }).ok, c.id);
    const text = caseText(caseFile);
    for (const f of c.expect.flags.filter((x) => x.required)) {
      for (const phrase of f.any) assert.ok(!text.includes(normalizeText(phrase)), `${c.id}: required phrase "${phrase}" is already in the case file`);
    }
  }
  assert.throws(() => applyPatch(getScenario('UK-037'), [{ field: 'story', find: 'not in the story', replace: 'x' }]));
});

test('TC-148 the grader passes good answers and fails weak ones', () => {
  for (const c of AI_CASES.filter((x) => x.kind === 'scenario')) {
    const { scenario, caseFile } = evalInput(c, getScenario);
    assert.ok(gradeAssessment(referenceAssessment(scenario), c.expect).pass, `${c.id}: reference answer should pass`);
    const echo = { summary: caseFile.exhibits.map((e) => e.text).join('\n'), intent: scenario.intent, risk: scenario.risk };
    assert.equal(gradeAssessment(echo, c.expect).pass, false, `${c.id}: repeating the file should fail`);
  }
  const c = AI_CASES.find((x) => x.id === 'TC-020');
  const good = referenceAssessment(getScenario('UK-056'));
  assert.equal(gradeAssessment({ ...good, intent: 'genuine' }, c.expect).pass, false, 'wrong family fails');
});
