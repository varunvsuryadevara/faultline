#!/usr/bin/env node
// Writes the 150 test cases as human-readable and tracker-friendly files:
//   docs/test-cases/TEST-CASES.md    readable document
//   docs/test-cases/test-cases.csv   one row per case, with blank Status / Tester / Date / Notes columns for UAT
//   docs/test-cases/test-cases.json  machine-readable, for other tools
// Run after editing evals/ai-cases.js, evals/cases/*.js or evals/app-cases.js:  npm run export:test-cases

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_CASES } from '../evals/ai-cases.js';
import { APP_CASES } from '../evals/app-cases.js';
import { getScenario } from '../shared/scenarios/index.js';
import { INTENT_FAMILIES, countryName, labelOf, stageGroupOf } from '../shared/scenarios/vocab.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'test-cases');

const familyLabel = (f) => INTENT_FAMILIES.find((x) => x.value === f)?.label ?? f;
const riskList = (r) => r.map((x) => labelOf('risk', x).replace(' risk', '')).join(', ');
const md = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function aiRow(c) {
  const s = getScenario(c.scenario);
  const required = c.expect.flags.filter((f) => f.required).map((f) => f.label);
  const optional = c.expect.flags.filter((f) => !f.required).map((f) => f.label);
  return {
    id: c.id,
    type: c.kind === 'counterfactual' ? 'AI assessment, counterfactual variant' : 'AI assessment, scenario',
    area: stageGroupOf(s.stage)?.label ?? '',
    stage: labelOf('stage', s.stage),
    country: countryName(s.country),
    scenario: c.scenario,
    title: c.title,
    rule: c.rule,
    change: c.change ?? '',
    preconditions: c.kind === 'counterfactual' ? `Scenario ${c.scenario} with this change applied: ${c.change}` : `Scenario ${c.scenario} in the library; model configured`,
    steps: [
      c.kind === 'counterfactual' ? `Build the case file for ${c.scenario} with the patch in evals/cases/counterfactual.js` : `Open ${c.scenario} (#/scenarios/${c.scenario})`,
      'Run the AI assessment (or: npm run eval -- --only ' + c.id + ')',
      'Compare the assessment with the expected results',
    ],
    expected: [
      `Intent family: ${c.expect.family.map(familyLabel).join(' or ')}`,
      `Risk: ${riskList(c.expect.risk)}`,
      ...required.map((l) => `Must: ${l}`),
      ...optional.map((l) => `Should: ${l}`),
    ],
    automated: 'Yes (npm run eval)',
    phrases: c.expect.flags,
    family: c.expect.family,
    risk: c.expect.risk,
  };
}

function appRow(c) {
  return {
    id: c.id,
    type: 'Application',
    area: c.area,
    stage: '',
    country: '',
    scenario: '',
    title: c.title,
    rule: '',
    change: '',
    preconditions: 'FaultLine installed with the claims-stage pack (npm install)',
    steps: c.steps,
    expected: c.expected,
    automated: c.type === 'manual' ? 'No (manual)' : c.type === 'automated' ? 'Yes (npm test)' : 'Partly (npm test + manual)',
  };
}

const ai = AI_CASES.map(aiRow);
const app = APP_CASES.map(appRow);
const all = [...ai, ...app];
mkdirSync(OUT, { recursive: true });

// JSON
writeFileSync(
  path.join(OUT, 'test-cases.json'),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      counts: { total: all.length, aiScenario: ai.filter((r) => r.type.endsWith('scenario')).length, aiCounterfactual: ai.filter((r) => r.type.includes('counterfactual')).length, application: app.length },
      grading: 'An AI case passes when the intent family and risk are among those expected and every "Must" concept is present. A concept is present when any of its phrases appears in the assessment text (case-insensitive). No "Must" phrase appears in the case file itself.',
      cases: all,
    },
    null,
    2,
  ),
);

// CSV
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = ['ID', 'Type', 'Area', 'Claim stage', 'Country', 'Scenario', 'Title', 'Rule or practice tested', 'Preconditions', 'Steps', 'Expected result', 'Automated', 'Status', 'Tester', 'Date', 'Notes'];
const rows = all.map((r) => [r.id, r.type, r.area, r.stage, r.country, r.scenario, r.title, r.rule, r.preconditions, r.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), r.expected.join('\n'), r.automated, '', '', '', '']);
writeFileSync(path.join(OUT, 'test-cases.csv'), `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`);

// Markdown
const lines = [
  '# FaultLine test cases',
  '',
  `${all.length} test cases: ${ai.filter((r) => r.type.endsWith('scenario')).length} AI assessment cases (one per new scenario), ${ai.filter((r) => r.type.includes('counterfactual')).length} counterfactual variants, and ${app.length} application cases.`,
  '',
  '## How the AI cases are graded',
  '',
  'Each AI case runs FaultLine’s claims assessment on a scenario’s case file and checks the answer:',
  '',
  '- **Intent family** must be one of those listed (Genuine, Needs a closer look, Fraud).',
  '- **Risk** must be one of the levels listed.',
  '- **Must** concepts must all be present; **Should** concepts only add to the score. A concept is present when any of its phrases (in evals/cases/*.js) appears in the assessment text, ignoring case. No Must phrase appears in the case file itself, so a concept only counts when the assessment adds it. A phrase match shows that a point was raised, not that it was argued well, so read failed and borderline answers yourself.',
  '',
  'Counterfactual variants change one deciding fact in a scenario, so the right answer changes with it. They check that the model reasons from the evidence rather than recognising a familiar story.',
  '',
  'Run them with `npm run eval` (needs the model key in .env), or check the definitions without a model with `npm run eval -- --dry-run` and `npm run eval -- --oracle`.',
  '',
];

const groups = [...new Set(ai.filter((r) => r.type.endsWith('scenario')).map((r) => r.area))];
lines.push('## AI assessment cases, by claim area', '');
for (const g of groups) {
  lines.push(`### ${g}`, '', '| ID | Scenario | Stage | Test | Rule or practice tested | Expected |', '| --- | --- | --- | --- | --- | --- |');
  for (const r of ai.filter((x) => x.type.endsWith('scenario') && x.area === g)) {
    lines.push(`| ${r.id} | ${r.scenario} (${r.country}) | ${r.stage} | ${md(r.title)} | ${md(r.rule)} | ${md(r.expected.join('; '))} |`);
  }
  lines.push('');
}
lines.push('## Counterfactual variants', '', '| ID | Scenario | What changes | Rule or practice tested | Expected |', '| --- | --- | --- | --- | --- |');
for (const r of ai.filter((x) => x.type.includes('counterfactual'))) lines.push(`| ${r.id} | ${r.scenario} | ${md(r.change)} | ${md(r.rule)} | ${md(r.expected.join('; '))} |`);
lines.push('', '## Application cases', '', '| ID | Area | Test | Steps | Expected | Automated |', '| --- | --- | --- | --- | --- | --- |');
for (const r of app) lines.push(`| ${r.id} | ${r.area} | ${md(r.title)} | ${md(r.steps.map((s, i) => `${i + 1}. ${s}`).join(' '))} | ${md(r.expected.join('; '))} | ${r.automated} |`);
lines.push('');
writeFileSync(path.join(OUT, 'TEST-CASES.md'), lines.join('\n'));

console.log(`Wrote ${all.length} test cases to ${path.relative(ROOT, OUT)}: TEST-CASES.md, test-cases.csv, test-cases.json`);
