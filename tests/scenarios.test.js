// Offline tests for the motor claims scenario library: the data, the search, the case builder,
// the assessment normaliser and the comparison with reference answers.  Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, SCENARIO_BY_ID, SCENARIO_PROBLEMS, getScenario } from '../shared/scenarios/index.js';
import { scenarioCase } from '../shared/scenarios/case.js';
import { compareWithReference } from '../shared/scenarios/compare.js';
import { facetCounts, parseQuery, queryScenarios, randomScenario } from '../shared/scenarios/query.js';
import { FILTERS, INTENTS, intentFamily } from '../shared/scenarios/vocab.js';
import { ASSESSMENT_SCHEMA, buildAssessMessage, normalizeAssessment } from '../shared/assess.js';
import { validateCase } from '../shared/validate.js';

const ids = (r) => r.items.map((s) => s.id);

test('the library has no structural problems', () => {
  assert.deepEqual(SCENARIO_PROBLEMS, []);
});

test('the library is large and covers the requested countries, categories and intents', () => {
  assert.ok(SCENARIOS.length >= 150, `only ${SCENARIOS.length} scenarios`);
  const countries = new Set(SCENARIOS.map((s) => s.country));
  for (const c of ['UK', 'US', 'IN', 'CA', 'AU', 'AE', 'DE', 'FR', 'ZA', 'SG']) assert.ok(countries.has(c), `missing ${c}`);
  for (const c of ['UK', 'US', 'IN']) assert.ok(SCENARIOS.filter((s) => s.country === c).length >= 30, `${c} has fewer than 30`);
  const categories = new Set(SCENARIOS.map((s) => s.category));
  assert.equal(categories.size, 8);
  const intents = new Set(SCENARIOS.map((s) => s.intent));
  for (const i of INTENTS) assert.ok(intents.has(i.value), `no scenario with intent ${i.value}`);
});

test('ids and titles are unique, and lookups are case-insensitive', () => {
  assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, SCENARIOS.length);
  assert.equal(new Set(SCENARIOS.map((s) => s.title.toLowerCase())).size, SCENARIOS.length);
  assert.equal(getScenario('uk-001')?.id, 'UK-001');
  assert.equal(getScenario('XX-999'), null);
  assert.equal(SCENARIO_BY_ID.size, SCENARIOS.length);
});

test('no two scenarios share the same story opening', () => {
  const openings = new Map();
  for (const s of SCENARIOS) {
    const key = s.story.split(' ').slice(0, 12).join(' ');
    assert.ok(!openings.has(key), `${s.id} and ${openings.get(key)} open the same way`);
    openings.set(key, s.id);
  }
});

test('suspicious is not treated as fraud: suspicious scenarios are in the uncertain family', () => {
  for (const s of SCENARIOS.filter((x) => x.intent === 'suspicious')) assert.equal(intentFamily(s.intent), 'uncertain');
});

test('every scenario becomes a valid case file without leaking the reference answers', () => {
  for (const s of SCENARIOS) {
    const c = scenarioCase(s);
    const v = validateCase({ context: c.context, sources: c.exhibits });
    assert.ok(v.ok, `${s.id}: ${v.error}`);
    const text = JSON.stringify(c);
    // The hidden truth and the reference assessment must never reach the model.
    assert.ok(!text.includes(s.whatHappened), `${s.id} leaks whatHappened`);
    assert.ok(!text.includes(s.assessment), `${s.id} leaks the reference assessment`);
    assert.ok(!text.includes(s.action), `${s.id} leaks the recommended action`);
    // Missing evidence is part of the answer: it may be mentioned in the story, but never listed as held.
    for (const m of s.missing) assert.ok(!c.exhibits.some((e) => e.text.includes(`- ${m}`)), `${s.id} lists missing evidence as held`);
  }
});

test('a scenario linked to a sample case uses that sample\'s exhibits', () => {
  const s = getScenario('IN-001');
  assert.equal(s.sampleId, 'motor-claim');
  const c = scenarioCase(s);
  assert.equal(c.exhibits.length, 4);
  assert.match(c.exhibits[3].text, /Job card SSM-2318/);
});

test('search understands phrases, synonyms and countries', () => {
  assert.deepEqual(parseQuery('UK crash for cash').countries, ['UK']);
  const crash = ids(queryScenarios(SCENARIOS, { q: 'UK crash for cash' }));
  assert.equal(crash[0], 'UK-021');
  assert.ok(crash.every((id) => id.startsWith('UK-')));
  assert.ok(ids(queryScenarios(SCENARIOS, { q: 'monsoon flood in India' })).includes('IN-011'));
  assert.equal(ids(queryScenarios(SCENARIOS, { q: 'kangaroo' }))[0], 'AU-001');
  assert.ok(ids(queryScenarios(SCENARIOS, { q: 'garage invoices' })).includes('IN-028'));
  assert.deepEqual(ids(queryScenarios(SCENARIOS, { q: '"pay and recover"' })).sort(), ['IN-010', 'IN-025']);
});

test('search does not match short words inside longer ones', () => {
  // "ev" must not match "evening", and "fir" must not match "fire".
  const ev = ids(queryScenarios(SCENARIOS, { q: 'EV fire' }));
  assert.ok(ev.includes('UK-014') && ev.includes('IN-018'));
  assert.ok(ev.length <= 6, `EV fire matched ${ev.length} scenarios`);
  const fir = queryScenarios(SCENARIOS, { q: 'FIR' });
  assert.ok(fir.items.every((s) => s.country === 'IN'), 'FIR should only find Indian police reports');
  // Lower-case "us" is a pronoun, not the United States.
  assert.deepEqual(parseQuery('show us thefts').countries, []);
});

test('search falls back to partial matches when nothing matches every word', () => {
  const r = queryScenarios(SCENARIOS, { q: 'kangaroo zeppelin' });
  assert.equal(r.partial, true);
  assert.equal(r.items[0].id, 'AU-001');
});

test('filters combine with search, and facet counts respect the other filters', () => {
  const r = queryScenarios(SCENARIOS, { filters: { country: ['IN'], risk: ['critical'] } });
  assert.ok(r.total > 0);
  assert.ok(r.items.every((s) => s.country === 'IN' && s.risk === 'critical'));
  const facets = facetCounts(SCENARIOS, { filters: { country: ['IN'] } });
  // The country facet ignores its own filter, so other countries still show a count.
  assert.ok(facets.country.UK > 0);
  // Other facets are narrowed to India.
  const inTotal = SCENARIOS.filter((s) => s.country === 'IN').length;
  assert.equal(Object.values(facets.risk).reduce((a, b) => a + b, 0), inTotal);
  assert.equal(FILTERS.length, 11);
});

test('sorting by risk puts critical scenarios first', () => {
  const r = queryScenarios(SCENARIOS, { sort: 'risk-desc' });
  assert.equal(r.items[0].risk, 'critical');
  assert.equal(r.items.at(-1).risk, 'low');
});

test('random picks respect the pool and avoid repeating the current scenario', () => {
  const pool = queryScenarios(SCENARIOS, { filters: { country: ['SG'] } }).items;
  let seed = 0;
  const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 20; i += 1) {
    const pick = randomScenario(pool, { exclude: 'SG-001', random });
    assert.equal(pick.country, 'SG');
    assert.notEqual(pick.id, 'SG-001');
  }
  assert.equal(randomScenario([], {}), null);
});

test('the assessment prompt contains the case but no reference answers', () => {
  const s = getScenario('UK-011');
  const c = scenarioCase(s);
  const message = buildAssessMessage({ context: c.context, exhibits: c.exhibits.map((e, i) => ({ ...e, id: 'ABCDEF'[i] })) });
  assert.match(message, /Mill Lane/);
  assert.ok(!message.includes(s.whatHappened));
  assert.ok(!message.includes(s.intent));
  assert.deepEqual(ASSESSMENT_SCHEMA.required.slice(-4), ['intent', 'risk', 'confidence', 'reasoning']);
});

test('normalises a messy model assessment', () => {
  const out = normalizeAssessment(
    {
      summary: 'x',
      intent: 'Genuine with Potential Exaggeration',
      risk: 'HIGH',
      confidence: 72,
      next_actions: ['Call the claimant'],
      supporting: [{ point: 'p', exhibit: 'Z', quote: 'q' }],
      questions: [{ question: 'Where were you?' }],
    },
    ['A', 'B'],
  );
  assert.equal(out.intent, 'genuine-exaggeration');
  assert.equal(out.risk, 'high');
  assert.equal(out.confidence, 0.72);
  assert.deepEqual(out.nextActions, ['Call the claimant']);
  assert.equal(out.supporting[0].exhibit, '');
  assert.equal(out.questions[0].ask, 'Claimant');
  const fallback = normalizeAssessment({ intent: 'definitely fraud', risk: 'extreme' }, ['A']);
  assert.equal(fallback.intent, 'insufficient-evidence');
  assert.equal(fallback.risk, 'medium');
});

test('compares an AI call with the reference by intent family and risk distance', () => {
  const s = getScenario('UK-001'); // disputed, medium
  assert.equal(compareWithReference({ intent: 'disputed', risk: 'medium' }, s).overall, 'agrees');
  const near = compareWithReference({ intent: 'insufficient-evidence', risk: 'high' }, s);
  assert.equal(near.intent.match, 'near');
  assert.equal(near.risk.match, 'near');
  assert.equal(near.overall, 'close');
  assert.equal(compareWithReference({ intent: 'potential-fraud', risk: 'medium' }, s).overall, 'differs');
  assert.equal(compareWithReference({ intent: 'disputed', risk: 'critical' }, s).overall, 'differs');
});
