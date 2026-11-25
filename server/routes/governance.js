import express from 'express';
import { DecisionModel, AuditModel } from '../db/models.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';

export const governanceRouter = express.Router();

/**
 * POST /api/governance/recommend
 * Investigator registers an evidence-backed claim recommendation
 */
governanceRouter.post(
  '/recommend',
  requireAuth,
  requireRole(ROLES.INVESTIGATOR, ROLES.SENIOR_INVESTIGATOR, ROLES.CLAIMS_MANAGER, ROLES.SYSTEM_ADMIN),
  (req, res) => {
  const {
    investigationId,
    recommendation,
    explanation,
    confidence = 0.85,
    corroboratingExhibits = [],
    contradictionExhibits = [],
    missingItems = [],
  } = req.body || {};

  if (!investigationId || !recommendation) {
    return res.status(400).json({
      code: 'INVALID_INPUT',
      error: 'investigationId and recommendation (APPROVE, REJECT, REVIEW) are required.',
    });
  }

  const validRecommendations = ['APPROVE', 'REJECT', 'REVIEW'];
  if (!validRecommendations.includes(recommendation)) {
    return res.status(400).json({
      code: 'INVALID_RECOMMENDATION',
      error: `Recommendation must be one of: ${validRecommendations.join(', ')}`,
    });
  }

  const user = req.user;

  const decision = DecisionModel.createOrUpdate({
    investigationId,
    recommendation,
    explanation,
    confidence,
    corroboratingExhibits,
    contradictionExhibits,
    missingItems,
    recommendedBy: user.email,
  });

  AuditModel.record({
    tenantId: user.tenantId,
    actorType: 'USER',
    actorId: user.id,
    action: 'INVESTIGATOR_RECOMMENDATION_SUBMITTED',
    entityType: 'DECISION',
    entityId: decision.id,
    details: {
      investigationId,
      recommendation,
      corroboratingCount: corroboratingExhibits.length,
      contradictionCount: contradictionExhibits.length,
    },
  });

  res.json({
    ok: true,
    decision,
    message: 'Investigator recommendation registered and forwarded for second-key management sign-off.',
  });
});

/**
 * POST /api/governance/sign-off
 * Claims Manager conducts second-key sign-off with Bad-Faith Litigation Guard verification
 */
governanceRouter.post(
  '/sign-off',
  requireAuth,
  requireRole(ROLES.CLAIMS_MANAGER, ROLES.SYSTEM_ADMIN),
  (req, res) => {
  const {
    decisionId,
    investigationId,
    approvedDecision,
    managerNotes = '',
    checklist = {},
  } = req.body || {};

  const effectiveDecision = approvedDecision;
  if (!effectiveDecision || !['APPROVE', 'REJECT', 'REVIEW'].includes(effectiveDecision)) {
    return res.status(400).json({
      code: 'INVALID_DECISION',
      error: 'approvedDecision must be one of: APPROVE, REJECT, REVIEW',
    });
  }

  // --- Bad-Faith Litigation Guard Verification ---
  // Prevents arbitrary rejection or unfair claims settlement practices
  if (effectiveDecision === 'REJECT') {
    const {
      physicalEvidenceCheck,
      traceableContradictions,
      insuredOpportunityToExplain,
    } = checklist;

    const failedChecks = [];
    if (!physicalEvidenceCheck) {
      failedChecks.push('Independent physical evidence or damage corroboration check');
    }
    if (!traceableContradictions) {
      failedChecks.push('Specific traceable exhibit contradiction citations');
    }
    if (!insuredOpportunityToExplain) {
      failedChecks.push('Documented opportunity for insured to clarify discrepancies');
    }

    if (failedChecks.length > 0) {
      return res.status(422).json({
        code: 'BAD_FAITH_GUARD_BLOCKED',
        error: 'Bad-Faith Litigation Guard Blocked Rejection: You cannot issue a claim rejection without completing mandatory forensic safeguards.',
        missingSafeguards: failedChecks,
        litigationRisk: 'High risk of unfair claim repudiation and bad-faith litigation damages under Insurance Regulatory Authority guidelines.',
      });
    }
  }

  const manager = req.user;

  const signedDecision = DecisionModel.signOff({
    decisionId,
    investigationId,
    managerId: manager.id,
    managerEmail: manager.email,
    approvedDecision: effectiveDecision,
    reviewNotes: managerNotes,
    checklist,
  });

  if (!signedDecision) {
    return res.status(404).json({
      code: 'DECISION_NOT_FOUND',
      error: `Could not find an open decision for investigation ID: ${investigationId || decisionId}`,
    });
  }

  AuditModel.record({
    tenantId: manager.tenantId,
    actorType: 'USER',
    actorId: manager.id,
    action: 'DECISION_SIGNED_OFF',
    entityType: 'DECISION',
    entityId: signedDecision.id,
    details: {
      investigationId: signedDecision.investigationId,
      finalDecision: effectiveDecision,
      managerEmail: manager.email,
      safeguardPassed: true,
    },
  });

  res.json({
    ok: true,
    decision: signedDecision,
    message: `Claim decision successfully signed off as ${effectiveDecision} with two-key human governance.`,
  });
});

/**
 * GET /api/governance/decision/:investigationId
 * Fetches current decision and governance sign-off trail
 */
governanceRouter.get('/decision/:investigationId', (req, res) => {
  const { investigationId } = req.params;
  const decision = DecisionModel.findByInvestigationId(investigationId);

  if (!decision) {
    return res.json({
      ok: true,
      decision: null,
      status: 'NO_DECISION_RECORDED',
    });
  }

  res.json({
    ok: true,
    decision,
  });
});
