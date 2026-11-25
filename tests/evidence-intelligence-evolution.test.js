// Comprehensive Verification Test Suite for FaultLine Evidence Intelligence Evolution
// Validates:
// 1. Security Gate: Strict multi-tenant isolation and cross-tenant access rejection (403)
// 2. Evidence Independence Engine: Distinguishes genuine corroboration from derivative echoes
// 3. Competing Hypothesis Workspace: Evaluates H1, H2, H3 with evidence weights & discriminators
// 4. Temporal Precision & Benign Variance: Distinguishes human approximate recall from material fraud
// 5. Contradiction Intelligence: Enriches conflicts with alternative innocent explanations
// 6. Workflow Action Pack: Enforces jurisdictional statutory deadlines (UK 15-day, CA 40-day)
// 7. Decision Memory & Cryptographic Audit: Tamper-evident SHA-256 hash chaining

import test from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../server/db/store.js';
import { InvestigationModel } from '../server/db/models.js';
import { getInvestigationDetails } from '../server/intelligence/investigation.js';
import { handleChatMessage } from '../server/intelligence/orchestrator.js';
import { evaluateEvidenceIndependence, DERIVATION_TYPES } from '../server/intelligence/independence.js';
import { evaluateCompetingHypotheses, HYPOTHESIS_IDS } from '../server/intelligence/hypothesis.js';
import { constructNativeTimeline, parseTimeToMinutes } from '../server/intelligence/native/timeline.js';
import { detectNativeContradictions } from '../server/intelligence/native/contradiction.js';
import { detectNativeCorroborations } from '../server/intelligence/native/corroboration.js';
import { calculateStatutoryDeadline, generateWorkflowChecklist } from '../server/intelligence/workflow.js';
import { recordCaseDecisionMemory, getCaseDecisionMemory, verifyAuditIntegrity } from '../server/intelligence/decision-memory.js';

test('Security Gate — Strict Multi-Tenant Isolation & Access Control', async (t) => {
  // Create an investigation belonging to Tenant Alpha
  const alphaCase = db.save('investigations', {
    tenantId: 'tenant-alpha',
    claimReference: 'FL-ALPHA-001',
    title: 'Tenant Alpha Commercial Fleet Collision',
    context: 'Alpha delivery van collision at junction.',
    country: 'UK',
    status: 'OPEN',
    risk: 'MEDIUM',
  });

  db.save('exhibits', {
    investigationId: alphaCase.id,
    exhibitLetter: 'A',
    label: 'Alpha Driver Statement',
    kind: 'statement',
    text: 'I was driving van 12 for Tenant Alpha on delivery schedule.',
  });

  // 1. Same tenant investigator should successfully access the case
  const userAlpha = { id: 'user-1', email: 'investigator@alpha.com', tenantId: 'tenant-alpha', role: 'INVESTIGATOR' };
  const accessAlpha = getInvestigationDetails(alphaCase.id, userAlpha);
  assert.ok(accessAlpha, 'Tenant Alpha user should access Tenant Alpha case');
  assert.equal(accessAlpha.caseFile.title, 'Tenant Alpha Commercial Fleet Collision');

  // 2. Cross-tenant investigator should be rejected with 403 FORBIDDEN
  const userBeta = { id: 'user-2', email: 'investigator@beta.com', tenantId: 'tenant-beta', role: 'INVESTIGATOR' };
  assert.throws(
    () => {
      getInvestigationDetails(alphaCase.id, userBeta);
    },
    (err) => {
      assert.equal(err.code, 'FORBIDDEN');
      assert.equal(err.status, 403);
      assert.ok(err.message.includes('Cross-tenant access violation'));
      return true;
    },
    'Cross-tenant user must be rejected with 403 FORBIDDEN',
  );

  // 3. System Admin should have legitimate cross-tenant governance oversight
  const userAdmin = { id: 'admin-1', email: 'admin@faultline.internal', tenantId: 'tenant-hq', role: 'SYSTEM_ADMIN' };
  const accessAdmin = getInvestigationDetails(alphaCase.id, userAdmin);
  assert.ok(accessAdmin, 'SYSTEM_ADMIN should have legitimate cross-tenant access');

  // 4. Test Chat Orchestrator Tenant Rejection
  const chatResponse = await handleChatMessage({
    message: 'Summarize the evidence for this case',
    activeCaseId: alphaCase.id,
    user: userBeta,
  });

  assert.equal(chatResponse.code, 'FORBIDDEN');
  assert.equal(chatResponse.status, 403);
  assert.ok(chatResponse.text.includes('Access Denied: Cross-Tenant Security Violation'));
});

test('Evidence Independence Engine — Derivative Citation Detection & Score Penalization', (t) => {
  // Scenario A: Derivative echo reporting (Exhibit B directly quotes Exhibit A)
  const derivativeExhibits = [
    {
      id: 'A',
      label: 'Claimant Driver Statement',
      kind: 'statement',
      text: 'I was slowing down normally for the roundabout when the trailing car struck me from behind.',
    },
    {
      id: 'B',
      label: 'Broker Incident Note',
      kind: 'report',
      text: 'As stated in Exhibit A, claimant driver was slowing down normally for the roundabout.',
    },
  ];

  const evalDerivative = evaluateEvidenceIndependence(['A', 'B'], derivativeExhibits);
  assert.equal(evalDerivative.isIndependent, false, 'Derivative citation must not be marked independent');
  assert.equal(evalDerivative.derivationType, DERIVATION_TYPES.DERIVATIVE_CITATION);
  assert.ok(evalDerivative.independenceScore <= 0.50, 'Derivative score must be penalized (<= 0.50)');
  assert.ok(evalDerivative.safeguardNotice.includes('Safeguard Notice: Apparent corroboration is derivative'));

  // Scenario B: Genuine independent corroboration (Witness statement + Electronic Telematics)
  const independentExhibits = [
    {
      id: 'A',
      label: 'Independent Third-Party Bystander',
      kind: 'witness',
      text: 'I saw the white hatchback brake suddenly with great force right before entering the roundabout.',
    },
    {
      id: 'B',
      label: 'CAN-Bus Telemetry Data',
      kind: 'telematics',
      text: 'At 08:45:12, vehicle telemetry logged severe deceleration of -0.85g from 24 mph to 0 mph.',
    },
  ];

  const evalIndependent = evaluateEvidenceIndependence(['A', 'B'], independentExhibits);
  assert.equal(evalIndependent.isIndependent, true, 'Multi-source witness + telemetry must be independent');
  assert.equal(evalIndependent.derivationType, DERIVATION_TYPES.INDEPENDENT);
  assert.ok(evalIndependent.independenceScore >= 0.90, 'Independent sensor score must be high (>= 0.90)');
  assert.equal(evalIndependent.safeguardNotice, null);
});

test('Competing Hypothesis Workspace — Evaluates H1, H2, and H3 with Evidence Weights & Discriminators', (t) => {
  const exhibitsWithStagedIndicators = [
    {
      id: 'A',
      label: 'Insured Driver Statement',
      kind: 'statement',
      text: 'I was driving in a normal queue of traffic at 15 mph. My car was in pristine before condition with no prior damage.',
    },
    {
      id: 'B',
      label: 'Third Party Statement',
      kind: 'statement',
      text: 'The insured car slammed on the brakes abruptly on the clear roundabout approach. His brake lights were off completely.',
    },
    {
      id: 'C',
      label: 'Forensic Engineering Appraisal',
      kind: 'engineering',
      text: 'Inspection reveals severe rust and deep oxidation on fractured bumper reinforcement brackets, confirming pre-existing damage prior to this collision.',
    },
  ];

  const result = evaluateCompetingHypotheses(exhibitsWithStagedIndicators);
  assert.equal(result.evaluated, true);
  assert.equal(result.hypotheses.length, 3);

  // Check Hypothesis 3 (Staged / Induced) receives strong evidence support from rust and braking
  const h3 = result.hypotheses.find((h) => h.id === HYPOTHESIS_IDS.H3);
  assert.ok(h3, 'H3 must be evaluated');
  assert.ok(h3.netEvidenceScore >= 6, 'H3 should score high due to rust and brake lights defect');
  assert.ok(h3.supportingEvidence.some((e) => e.rationale.includes('Corrosion') || e.rationale.includes('pre-existing')));
  assert.ok(h3.discriminators.length >= 2, 'H3 must have actionable discriminators');

  // Check Hypothesis 1 (Genuine) is contradicted by physical facts
  const h1 = result.hypotheses.find((h) => h.id === HYPOTHESIS_IDS.H1);
  assert.ok(h1.contradictingEvidence.length > 0, 'H1 must be contradicted by engineering findings');
  assert.equal(h1.status, 'CONTRADICTED_BY_PHYSICAL_FACTS');

  // Check critical discriminators are surfaced
  assert.ok(result.criticalDiscriminators.length > 0);
  const firstName = result.criticalDiscriminators[0].testName;
  assert.ok(
    firstName.includes('Filament') || firstName.includes('CAN-Bus') || firstName.includes('Hazard'),
    `Discriminator testName should be valid, got: ${firstName}`,
  );;
});

test('Temporal Precision & Benign Variance — 15-Minute Human Recall Variance is Non-Fraudulent', (t) => {
  // Test minute parser
  assert.equal(parseTimeToMinutes('08:45 am'), 525);
  assert.equal(parseTimeToMinutes('8:52 AM'), 532);
  assert.equal(parseTimeToMinutes('14:30'), 870);

  // Scenario 1: Approximate human witness recall (08:45 vs 08:50 with approximation word "around")
  const benignExhibits = [
    {
      id: 'A',
      label: 'Claimant Statement',
      kind: 'statement',
      text: 'On 12/04/2026 at around 08:45 am, I was driving through the junction.',
    },
    {
      id: 'B',
      label: 'Independent Witness',
      kind: 'witness',
      text: 'At approximately 08:50 am, I witnessed the collision at the junction.',
    },
  ];

  const benignTimeline = constructNativeTimeline(benignExhibits);
  assert.equal(benignTimeline.hasTimestampConflicts, true);
  const conflict = benignTimeline.conflictingTimestamps[0];
  assert.equal(conflict.minuteDelta, 5, 'Minute delta should be 5 minutes');
  assert.equal(conflict.classification, 'BENIGN_TIME_VARIANCE');
  assert.equal(conflict.severity, 'MINOR');
  assert.equal(benignTimeline.hasMaterialTimeConflicts, false, '5-minute approximate variance must not be flagged as material fraud');

  // Scenario 2: Severe irreconcilable time conflict (08:00 am vs 11:30 am)
  const materialExhibits = [
    {
      id: 'A',
      label: 'Claimant Statement',
      kind: 'statement',
      text: 'Incident took place at 08:00 am during morning rush hour.',
    },
    {
      id: 'B',
      label: 'Police CAD Log',
      kind: 'telematics',
      text: 'Officers dispatched to scene at 11:30 am.',
    },
  ];

  const materialTimeline = constructNativeTimeline(materialExhibits);
  assert.equal(materialTimeline.hasMaterialTimeConflicts, true);
  assert.equal(materialTimeline.conflictingTimestamps[0].severity, 'CRITICAL');
});

test('Contradiction Engine — Provides Objective Alternative Innocent Explanations', (t) => {
  const exhibits = [
    {
      id: 'A',
      label: 'Claimant Statement',
      kind: 'statement',
      text: 'I slowed down gradually for a queue of traffic. My car had no prior damage before.',
    },
    {
      id: 'B',
      label: 'Third Party Statement',
      kind: 'statement',
      text: 'The claimant jammed on the brakes suddenly without warning. There were rust patches on his bumper.',
    },
  ];

  const result = detectNativeContradictions(exhibits);
  assert.ok(result.total >= 2);

  result.contradictions.forEach((c) => {
    assert.ok(Array.isArray(c.alternativeInnocentExplanations), 'Every contradiction must feature alternative innocent explanations');
    assert.ok(c.alternativeInnocentExplanations.length >= 2, 'Must have at least 2 plausible non-fraudulent explanations');
  });

  const brakingConflict = result.contradictions.find((c) => c.type === 'BRAKING_BEHAVIOR_CONFLICT');
  assert.ok(brakingConflict.alternativeInnocentExplanations.some((exp) => exp.includes('Emergency hazard avoidance')));
});

test('Workflow Intelligence — Enforces Jurisdictional Statutory Deadlines & Action Packs', (t) => {
  // UK Pre-Action Protocol 15-business-day deadline
  const ukDeadline = calculateStatutoryDeadline('UK');
  assert.equal(ukDeadline.jurisdiction, 'UK');
  assert.equal(ukDeadline.statutoryWindow, '15 business days');
  assert.ok(ukDeadline.deadlineDate);
  assert.ok(ukDeadline.remainingDays > 0);

  // California Fair Claims 40-day deadline
  const caDeadline = calculateStatutoryDeadline('US-CA');
  assert.equal(caDeadline.jurisdiction, 'US-CA');
  assert.equal(caDeadline.statutoryWindow, '40 calendar days');

  // Generate prioritized action checklist
  const checklist = generateWorkflowChecklist({
    caseFile: {
      title: 'Motor Collision Case',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I slowed down in queue of traffic.' },
        { id: 'B', label: 'Third Party Statement', kind: 'statement', text: 'He jammed on brakes suddenly.' },
      ],
    },
    jurisdiction: 'UK',
  });

  assert.ok(checklist.prioritizedActions.length >= 2, 'Must generate prioritized action items');
  assert.ok(checklist.prioritizedActions.some((a) => a.priority === 'P1_CRITICAL' || a.priority === 'P2_HIGH'));
  assert.ok(checklist.prioritizedActions[0].deadline.includes(ukDeadline.deadlineDate));
});

test('Decision Memory & Cryptographic Audit Trail — Tamper-Evident SHA-256 Chaining', (t) => {
  const caseId = `FL-TEST-${Date.now()}`;

  // Record Decision Memory
  const mem1 = recordCaseDecisionMemory({
    investigationId: caseId,
    selectedHypothesis: HYPOTHESIS_IDS.H2,
    hypothesisRationale: 'Innocent variance: wet tarmac and 5-min approximation explain discrepancies.',
    reviewedFindings: { 'FND-001': 'accepted', 'FND-002': 'dismissed' },
    nextActionPlan: ['Request MET weather log'],
    user: { id: 'inv-42', email: 'examiner@faultline.internal', tenantId: 'tenant-default' },
  });

  assert.equal(mem1.ok, true);
  assert.ok(mem1.auditEvent.currentHash);
  assert.equal(mem1.auditEvent.previousHash, 'GENESIS_HASH_00000000000000000000000000000000');

  // Record Second Audit Event (chained)
  const mem2 = recordCaseDecisionMemory({
    investigationId: caseId,
    selectedHypothesis: HYPOTHESIS_IDS.H2,
    hypothesisRationale: 'Weather log received confirming heavy localized downpour.',
    user: { id: 'inv-42', email: 'examiner@faultline.internal', tenantId: 'tenant-default' },
  });

  assert.equal(mem2.auditEvent.previousHash, mem1.auditEvent.currentHash, 'Second audit entry must chain to first entry hash');

  // Verify Audit Chain Integrity
  const history = getCaseDecisionMemory(caseId, { tenantId: 'tenant-default' });
  assert.equal(history.isChainValid, true, 'Audit log chain must be cryptographically valid');
  assert.equal(history.decision.selectedHypothesis, HYPOTHESIS_IDS.H2);

  // Verify Tamper Detection
  const tamperedTrail = JSON.parse(JSON.stringify(history.auditTrail));
  tamperedTrail[0].details = 'Tampered fraud verdict injected';
  assert.equal(verifyAuditIntegrity(tamperedTrail), false, 'Tampered audit trail must fail verification');
});
