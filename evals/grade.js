// Grades an AI assessment against an evaluation case's expectations. Pure functions with no
// model calls, so they are unit-tested in tests/claims-pack.test.js.
import { intentFamily, isValid } from '../shared/scenarios/vocab.js';

/** Lower-cases and straightens quotes and spaces so phrases match however they were typed. */
export const normalizeText = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-–]/g, '-')
    .replace(/\s+/g, ' ');

// Fields that hold codes rather than prose. They are graded separately (intent, risk) or carry
// no reasoning, so a phrase must not count as present just because a code contains it.
const SKIP_KEYS = new Set(['meta', 'intent', 'risk', 'confidence', 'exhibit', 'weight']);

/** All the prose in an assessment (every string at any depth), except codes and run metadata. */
export function assessmentText(assessment) {
  const out = [];
  const walk = (v, key) => {
    if (SKIP_KEYS.has(key) || v === null || v === undefined) return;
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(assessment);
  return out.join('\n');
}

/**
 * Pass when the intent family and the risk level are among those expected, and every required
 * concept is present. Optional concepts only affect the score.
 */
export function gradeAssessment(assessment, expect) {
  const family = intentFamily(assessment?.intent);
  const familyOk = expect.family.includes(family);
  const riskOk = expect.risk.includes(assessment?.risk);
  const text = normalizeText(assessmentText(assessment));
  const flags = expect.flags.map((f) => {
    const matched = f.any.find((phrase) => text.includes(normalizeText(phrase))) ?? null;
    return { label: f.label, required: Boolean(f.required), pass: matched !== null, matched };
  });
  const required = flags.filter((f) => f.required);
  const optional = flags.filter((f) => !f.required);
  const requiredOk = required.every((f) => f.pass);
  const points = Number(familyOk) + Number(riskOk) + required.filter((f) => f.pass).length + 0.5 * optional.filter((f) => f.pass).length;
  const possible = 2 + required.length + 0.5 * optional.length;
  return {
    pass: familyOk && riskOk && requiredOk,
    score: Math.round((points / possible) * 100) / 100,
    family: { intent: assessment?.intent ?? null, got: family, expected: expect.family, pass: familyOk },
    risk: { got: assessment?.risk ?? null, expected: expect.risk, pass: riskOk },
    flags,
  };
}

/** Structural problems in a case definition; the tests fail on any. */
export function caseProblems(c) {
  const problems = [];
  if (!/^TC-\d{3}$/.test(c.id ?? '')) problems.push('id should look like TC-001');
  if (!c.scenario) problems.push('scenario is missing');
  if (!c.title || !c.rule) problems.push('title and rule are required');
  const e = c.expect ?? {};
  if (!Array.isArray(e.family) || !e.family.length || e.family.some((f) => !['genuine', 'uncertain', 'fraud'].includes(f))) problems.push('expect.family is invalid');
  if (!Array.isArray(e.risk) || !e.risk.length || e.risk.some((r) => !isValid('risk', r))) problems.push('expect.risk is invalid');
  if (!Array.isArray(e.flags) || !e.flags.some((f) => f.required)) problems.push('needs at least one required flag');
  for (const f of e.flags ?? []) if (!f.label || !Array.isArray(f.any) || !f.any.length || f.any.some((p) => typeof p !== 'string' || !p.trim())) problems.push(`flag "${f.label}" is invalid`);
  if (c.kind === 'counterfactual' && (!Array.isArray(c.patch) || !c.patch.length || !c.change)) problems.push('a counterfactual needs a patch and a change description');
  return problems;
}
