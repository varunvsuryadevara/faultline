// Tests for Intelligence Builder: Governed Self-Improvement Engine
// Verifies empirical pattern discovery, proposal validation against 266 benchmarks,
// human approval gating, versioned activation, and rollback capabilities.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  discoverPatterns,
  listProposals,
  getProposal,
  validateProposalAgainstBenchmarks,
  approveProposal,
  rejectProposal,
  activateRule,
  rollbackRule,
  getActiveRules,
  getBuilderAuditHistory,
} from '../server/intelligence/builder.js';

test('Builder Pattern Discovery: inspects 266 benchmark scenarios and finds recurring forensic patterns', () => {
  const result = discoverPatterns();
  assert.equal(result.scenariosAnalyzed, 266);
  assert.ok(result.discoveredPatterns.length >= 3);

  const patternIds = result.discoveredPatterns.map((p) => p.id);
  assert.ok(patternIds.includes('PAT-001')); // Staged Deceleration Clustering
  assert.ok(patternIds.includes('PAT-002')); // Independent Witness Scarcity
  assert.ok(patternIds.includes('PAT-003')); // Pre-Existing Corrosion Discrepancy

  // Verify non-zero counts
  result.discoveredPatterns.forEach((pat) => {
    assert.ok(pat.affectedScenariosCount > 0);
    assert.ok(pat.recommendedIntervention);
  });
});

test('Builder Proposal Management: lists structured improvement proposals with false-positive risk scores', () => {
  const proposals = listProposals();
  assert.ok(proposals.length >= 3);

  const p1 = getProposal('PROP-2026-001');
  assert.ok(p1);
  assert.equal(p1.category, 'WORKFLOW_CHECKLIST');
  assert.ok(p1.falsePositiveRisk.includes('LOW'));
  assert.ok(p1.sampleSize >= 40);
  assert.ok(p1.proposedChecklist);
  assert.ok(p1.expectedBenefit);
});

test('Builder Benchmark Validation: validates proposal against 266 scenarios without regression', () => {
  const validation = validateProposalAgainstBenchmarks('PROP-2026-003');
  assert.equal(validation.proposalId, 'PROP-2026-003');
  assert.equal(validation.scenariosEvaluated, 266);
  assert.ok(validation.scenariosImpacted > 0);
  assert.ok(validation.validationScore >= 85);
  assert.equal(validation.status, 'VALIDATED');

  // Verify updated in stored proposal
  const updated = getProposal('PROP-2026-003');
  assert.equal(updated.validationStatus, 'VALIDATED');
  assert.equal(updated.validationScore, validation.validationScore);
});

test('Builder Human Approval Gate: proposals require explicit human sign-off before activation', () => {
  // Test rejecting or approving
  const approved = approveProposal('PROP-2026-003', {
    reviewerNotes: 'Approved by Senior Fraud Analyst for multi-lane roundabout protocol.',
    approvedBy: 'Senior Claims Forensics Architect',
  });

  assert.equal(approved.approvalStatus, 'APPROVED');
  assert.equal(approved.reviewedBy, 'Senior Claims Forensics Architect');
  assert.ok(approved.reviewedAt);

  // Verify audit log recorded approval
  const audit = getBuilderAuditHistory();
  assert.ok(audit.some((a) => a.action === 'PROPOSAL_APPROVED' && a.proposalId === 'PROP-2026-003'));
});

test('Builder Activation & Rollback: activated rule enters active ruleset and can be reverted', () => {
  const initialActive = getActiveRules().length;

  // Activate the approved rule
  const rule = activateRule('PROP-2026-003', { user: 'Chief Claims Officer' });
  assert.ok(rule.ruleId);
  assert.equal(rule.proposalId, 'PROP-2026-003');
  assert.ok(rule.version);

  const activeAfter = getActiveRules();
  assert.equal(activeAfter.length, initialActive + 1);
  assert.ok(activeAfter.some((r) => r.proposalId === 'PROP-2026-003'));

  // Proposal status becomes ACTIVATED
  const propAfter = getProposal('PROP-2026-003');
  assert.equal(propAfter.approvalStatus, 'ACTIVATED');

  // Rollback rule
  const rollbackResult = rollbackRule('PROP-2026-003', {
    reason: 'Operational test completed, reverting to standard ruleset.',
    user: 'Chief Claims Officer',
  });

  assert.equal(rollbackResult.success, true);
  const activeAfterRollback = getActiveRules();
  assert.equal(activeAfterRollback.length, initialActive);
  assert.equal(activeAfterRollback.some((r) => r.proposalId === 'PROP-2026-003'), false);

  // Proposal records rollback
  const propRolledBack = getProposal('PROP-2026-003');
  assert.equal(propRolledBack.approvalStatus, 'ROLLBACK');
});

test('Builder Safety Constraint: unapproved proposals cannot be activated autonomously', () => {
  // Create or reject a proposal to test safety enforcement
  rejectProposal('PROP-2026-003', {
    reviewerNotes: 'Rejected due to excessive scope.',
    rejectedBy: 'Governance Board',
  });

  // Attempting to activate rejected proposal must throw an error
  assert.throws(
    () => {
      activateRule('PROP-2026-003', { user: 'Rogue Process' });
    },
    /Cannot activate proposal PROP-2026-003 without prior human approval/
  );
});
