// Comprehensive Unit & Integration Tests for FaultLine Native Intelligence Engines
// Verifies 100% offline capability across all 7 native intelligence engines.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { constructNativeTimeline } from '../server/intelligence/native/timeline.js';
import { detectNativeContradictions } from '../server/intelligence/native/contradiction.js';
import { detectNativeCorroborations } from '../server/intelligence/native/corroboration.js';
import { evaluateNativeRiskIndicators } from '../server/intelligence/native/risk.js';
import { evaluateInvestigationCompleteness } from '../server/intelligence/native/completeness.js';
import { evaluatePolicyCompliance } from '../server/intelligence/native/policy.js';
import { generateNativeInvestigationReport } from '../server/intelligence/native/report.js';
import { runNativeAnalysis } from '../server/intelligence/native/pipeline.js';

const MOCK_EXHIBITS = [
  {
    id: 'A',
    label: 'Claimant Statement (Insured)',
    kind: 'statement',
    text: 'On 14/03/2026 at 08:45 am, I was driving my Ford Focus at 25 mph on the approach to the roundabout. Traffic was stopped ahead and I slowed down normally in the queue. My vehicle was in pristine condition before with no prior damage. I was driving alone.',
  },
  {
    id: 'B',
    label: 'Third Party Statement',
    kind: 'statement',
    text: 'At 08:52 am, the Ford Focus jammed on the brakes abruptly for no reason. There was a passenger in the car with him. The road was wet after a downpour.',
  },
  {
    id: 'C',
    label: 'Engineering Forensic Inspection',
    kind: 'engineering',
    text: 'Inspection of the Ford Focus reveals extensive pre-existing rust and deep corrosion on the rear bumper reinforcement bar and old fracture surfaces, indicating prior impact damage.',
  },
  {
    id: 'D',
    label: 'Telematics CAN-Bus Log',
    kind: 'telematics',
    text: 'At 08:45:12, vehicle telemetry recorded abrupt deceleration of -0.85g from 24 mph to 0 mph in 1.1 seconds on roundabout circulatory carriageway.',
  },
];

test('Native Timeline Engine: extracts events, timestamps, and verifies chronologies', () => {
  const result = constructNativeTimeline(MOCK_EXHIBITS);
  assert.ok(result.totalEvents >= 3);
  assert.equal(result.hasTimestampConflicts, true); // 08:45 vs 08:52
  assert.ok(result.conflictingTimestamps.length > 0);
  assert.ok(result.events.some((e) => e.time === '08:45 am' || e.time?.includes('08:45')));
  assert.ok(result.events.some((e) => e.speed === '25 mph' || e.speed?.includes('24 mph')));
});

test('Native Contradiction Engine: detects braking, damage provenance, passenger, and environmental conflicts', () => {
  const result = detectNativeContradictions(MOCK_EXHIBITS);
  assert.ok(result.total >= 3);
  assert.equal(result.hasMaterialContradictions, true);

  const types = result.contradictions.map((c) => c.type);
  assert.ok(types.includes('BRAKING_BEHAVIOR_CONFLICT'));
  assert.ok(types.includes('DAMAGE_PROVENANCE_CONFLICT'));
  assert.ok(types.includes('OCCUPANT_COUNT_CONFLICT'));

  // Verify verbatim quotes are provided for quote verification
  const brakeConflict = result.contradictions.find((c) => c.type === 'BRAKING_BEHAVIOR_CONFLICT');
  assert.ok(brakeConflict.quoteA && brakeConflict.quoteB);
  assert.ok(MOCK_EXHIBITS[0].text.includes(brakeConflict.quoteA));
  assert.ok(MOCK_EXHIBITS[1].text.includes(brakeConflict.quoteB));
});

test('Native Corroboration Engine: detects independent factual alignments across exhibits', () => {
  const result = detectNativeCorroborations(MOCK_EXHIBITS);
  assert.ok(result.total >= 1);
  assert.equal(result.hasCorroborations, true);

  // Both exhibits A and D reference roundabout location
  const locCorr = result.corroborations.find((k) => k.fact.includes('roundabout'));
  assert.ok(locCorr);
  assert.equal(locCorr.isIndependent, true);
  assert.ok(locCorr.confidenceScore >= 0.9);
});

test('Native Risk Engine: evaluates explainable fraud typologies with triggering rules', () => {
  const result = evaluateNativeRiskIndicators(MOCK_EXHIBITS);
  assert.ok(result.totalIndicators >= 2);
  assert.equal(result.riskTier, 'CRITICAL');

  const ruleIds = result.indicators.map((i) => i.id);
  assert.ok(ruleIds.includes('RISK-INDUCED-DECEL-01'));
  assert.ok(ruleIds.includes('RISK-CORROSION-02'));
  assert.ok(result.safeguardNotice.includes('Bad-Faith Litigation Guard'));
});

test('Native Completeness Engine: audits required evidence and enforces missing evidence safeguard', () => {
  const result = evaluateInvestigationCompleteness(MOCK_EXHIBITS.slice(0, 2));
  assert.ok(result.completenessPercentage < 100);
  assert.equal(result.isSufficientForDecision, false);
  assert.ok(result.missingRequired.length > 0);
  // Rule 1: Missing evidence alone != Fraud
  assert.ok(result.safeguardNotice.includes('KEEP UNDER REVIEW'));
});

test('Native Policy Compliance Engine: checks conditions and roadworthiness warranties', () => {
  const result = evaluatePolicyCompliance(MOCK_EXHIBITS);
  assert.ok(result.totalClausesChecked >= 4);

  const careClause = result.clauses.find((c) => c.clauseId === 'POL-CARE-04');
  assert.ok(careClause);
  // Rust/corrosion indicates potential breach of reasonable care / roadworthiness
  assert.equal(careClause.status, 'POTENTIAL_BREACH');
  assert.equal(result.hasCoverageQuestions, true);
});

test('Native Report Engine: compiles comprehensive audit-ready investigation report', () => {
  const report = generateNativeInvestigationReport({
    caseFile: {
      title: 'Roundabout Deceleration Collision',
      exhibits: MOCK_EXHIBITS,
    },
    scenario: {
      id: 'UK-001',
      title: 'Roundabout Staged Deceleration',
      country: 'UK',
      intent: 'staged',
    },
    jurisdiction: 'UK',
  });

  assert.ok(report.markdown.includes('FaultLine Native Forensic Investigation Report'));
  assert.ok(report.markdown.includes('Contradiction & Cross-Examination Audit'));
  assert.ok(report.markdown.includes('Bad-Faith Litigation Guard'));
  assert.ok(report.metrics.contradictionCount >= 3);
  assert.equal(report.compliance.badFaithGuardCompliant, true);
});

test('runNativeAnalysis Pipeline: end-to-end offline analysis produces verified findings and quotes', async () => {
  const progressStages = [];
  const result = await runNativeAnalysis(
    {
      context: 'Contested rear-end collision on roundabout approach.',
      sources: MOCK_EXHIBITS.map((e) => ({ label: e.label, kind: e.kind, text: e.text })),
    },
    {
      onProgress: (p) => progressStages.push(p.stage),
    },
  );

  assert.ok(result.summary.includes('Native forensic cross-examination'));
  assert.ok(result.timeline.length >= 3);
  assert.ok(result.contradictions.length >= 3);
  assert.ok(result.corroborations.length >= 1);
  assert.ok(result.meta.isOffline === true);
  assert.equal(result.meta.provider, 'FaultLine Native Intelligence Engine');

  // Verify mechanical quote checker successfully verified citations
  assert.ok(result.quoteCheck.total > 0);
  assert.ok(result.quoteCheck.exact > 0);
  assert.equal(result.quoteCheck.missing, 0);
});
