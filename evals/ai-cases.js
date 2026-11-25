// AI evaluation test cases for the claims assessment (TC-001 to TC-125).
//
// Each case names a scenario and says what a good assessment of its case file must contain:
//   expect.family  intent families accepted (genuine, uncertain, fraud), from shared/scenarios/vocab.js
//   expect.risk    risk levels accepted (low, medium, high, critical)
//   expect.flags   concepts the assessment must mention. Each has a label and `any`, a list of
//                  phrases; the concept counts as present if any phrase appears in the assessment
//                  text (case-insensitive). `required: true` concepts must all be present to pass.
//   rule           the claims rule or practice the case tests, for people reading the results
//
// Scenario cases (TC-001 to TC-100) use the scenario's case file as it is. Counterfactual cases
// (TC-101 to TC-125) first change one deciding fact with `patch`, so the right answer changes.
// The model never sees these expectations, only the case file built by shared/scenarios/case.js.

import UK_E from './cases/uk-e.js';
import UK_F from './cases/uk-f.js';
import US_E from './cases/us-e.js';
import US_F from './cases/us-f.js';
import IN_E from './cases/in-e.js';
import IN_F from './cases/in-f.js';
import CA_AU from './cases/ca-au.js';
import AE_DE_FR from './cases/ae-de-fr.js';
import ZA_SG_OTHER from './cases/za-sg-other.js';
import COUNTERFACTUAL from './cases/counterfactual.js';
import { scenarioCase } from '../shared/scenarios/case.js';

export const AI_CASES = [
  ...[...UK_E, ...UK_F, ...US_E, ...US_F, ...IN_E, ...IN_F, ...CA_AU, ...AE_DE_FR, ...ZA_SG_OTHER].map((c) => ({ kind: 'scenario', ...c })),
  ...COUNTERFACTUAL,
];

export const AI_CASE_BY_ID = new Map(AI_CASES.map((c) => [c.id, c]));

const clone = (value) => JSON.parse(JSON.stringify(value));
const countOf = (text, find) => text.split(find).length - 1;

/**
 * Returns a copy of the scenario with the counterfactual patch applied. Throws if a `find`
 * text is missing or ambiguous, so a broken patch is caught by the tests, not by a model run.
 */
export function applyPatch(scenario, patch = []) {
  const s = clone(scenario);
  for (const { field, find, replace } of patch) {
    const parts = field.split('.');
    const last = parts.pop();
    let holder = s;
    for (const p of parts) {
      holder = holder?.[/^\d+$/.test(p) ? Number(p) : p];
      if (holder === undefined) throw new Error(`${scenario.id}: no field ${field}`);
    }
    const key = /^\d+$/.test(last) ? Number(last) : last;
    const value = holder[key];
    if (typeof value === 'string') {
      const n = countOf(value, find);
      if (n !== 1) throw new Error(`${scenario.id}: "${find.slice(0, 50)}" found ${n} times in ${field}`);
      holder[key] = value.replace(find, () => replace);
    } else if (Array.isArray(value)) {
      const hits = value.map((item, i) => [item, i]).filter(([item]) => typeof item === 'string' && item.includes(find));
      if (hits.length !== 1 || countOf(hits[0][0], find) !== 1) {
        throw new Error(`${scenario.id}: "${find.slice(0, 50)}" must match exactly one item of ${field}`);
      }
      const [item, i] = hits[0];
      value[i] = item.replace(find, () => replace);
    } else {
      throw new Error(`${scenario.id}: ${field} is not text or a list`);
    }
  }
  return s;
}

/** The scenario (patched for counterfactuals) and the case file the model will assess. */
export function evalInput(testCase, getScenario) {
  const base = getScenario(testCase.scenario);
  if (!base) throw new Error(`${testCase.id}: unknown scenario ${testCase.scenario}`);
  const scenario = testCase.patch ? applyPatch(base, testCase.patch) : base;
  return { scenario, caseFile: scenarioCase(scenario) };
}
