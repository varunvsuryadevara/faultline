// FaultLine Decision Memory & Case History Service.
// Persists investigator hypothesis selections, accepted/dismissed AI findings,
// and audit rationale in db/decisions.json and db/auditEvents.json.
// Employs cryptographic SHA-256 chaining for tamper-evident audit history.

import crypto from 'node:crypto';
import { db } from '../db/store.js';
import { AuditModel, DecisionModel, InvestigationModel } from '../db/models.js';

/**
 * Computes SHA-256 hash for audit chaining.
 */
function computeAuditHash(entry, previousHash = 'GENESIS_HASH_00000000000000000000000000000000') {
  const content = JSON.stringify({
    investigationId: entry.investigationId,
    actionType: entry.actionType,
    details: entry.details,
    userId: entry.userId,
    timestamp: entry.timestamp,
    previousHash,
  });
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Saves investigator hypothesis appraisal and finding review decisions for a case.
 */
export function recordCaseDecisionMemory({
  investigationId,
  selectedHypothesis = null,
  hypothesisRationale = '',
  reviewedFindings = {}, // { [findingId]: 'accepted' | 'dismissed' }
  nextActionPlan = [],
  user = {},
}) {
  if (!investigationId) {
    throw new Error('investigationId is required to record decision memory.');
  }

  // Tenant isolation verification if database investigation
  const inv = db.findById('investigations', investigationId) || db.findByClaimReference(investigationId);
  if (inv && inv.tenantId && user.tenantId && inv.tenantId !== user.tenantId && user.role !== 'SYSTEM_ADMIN') {
    const error = new Error(`Cross-tenant violation: Investigation ${investigationId} belongs to another organization.`);
    error.code = 'FORBIDDEN';
    error.status = 403;
    throw error;
  }

  const existingDecision = db.findOne('decisions', (d) => d.investigationId === investigationId) || {};

  const memoryPayload = {
    ...existingDecision,
    investigationId,
    selectedHypothesis,
    hypothesisRationale,
    reviewedFindings,
    nextActionPlan,
    updatedBy: user.email || user.id || 'investigator@faultline.internal',
    updatedAt: new Date().toISOString(),
  };

  const savedDecision = db.save('decisions', memoryPayload);

  // Retrieve last audit event for cryptographic chaining
  const auditList = db.find('auditEvents', (a) => a.investigationId === investigationId) || [];
  const lastEvent = auditList.length > 0 ? auditList[auditList.length - 1] : null;
  const previousHash = lastEvent?.currentHash || 'GENESIS_HASH_00000000000000000000000000000000';

  const auditEntry = {
    investigationId,
    actionType: 'INVESTIGATOR_HYPOTHESIS_EVALUATION',
    details: `Investigator recorded hypothesis: ${selectedHypothesis || 'UNSPECIFIED'}. Reviewed ${Object.keys(reviewedFindings).length} findings.`,
    userId: user.id || user.email || null,
    timestamp: new Date().toISOString(),
    previousHash,
  };
  auditEntry.currentHash = computeAuditHash(auditEntry, previousHash);

  db.save('auditEvents', auditEntry);

  return {
    ok: true,
    decision: savedDecision,
    auditEvent: auditEntry,
  };
}

/**
 * Retrieves complete decision memory and audit chain for an investigation.
 */
export function getCaseDecisionMemory(investigationId, user = {}) {
  if (!investigationId) return null;

  // Tenant isolation check
  const inv = db.findById('investigations', investigationId) || db.findByClaimReference(investigationId);
  if (inv && inv.tenantId && user.tenantId && inv.tenantId !== user.tenantId && user.role !== 'SYSTEM_ADMIN') {
    const error = new Error(`Cross-tenant violation: Access denied to investigation ${investigationId}.`);
    error.code = 'FORBIDDEN';
    error.status = 403;
    throw error;
  }

  const decision = db.findOne('decisions', (d) => d.investigationId === investigationId);
  const auditTrail = db.find('auditEvents', (a) => a.investigationId === investigationId) || [];

  return {
    investigationId,
    decision: decision || null,
    auditTrail,
    totalAuditEvents: auditTrail.length,
    isChainValid: verifyAuditIntegrity(auditTrail),
  };
}

/**
 * Cryptographically verifies that the audit log has not been tampered with.
 */
export function verifyAuditIntegrity(auditTrail = []) {
  if (!auditTrail || auditTrail.length === 0) return true;

  let expectedPrevHash = 'GENESIS_HASH_00000000000000000000000000000000';
  for (const entry of auditTrail) {
    if (entry.previousHash && entry.previousHash !== expectedPrevHash) {
      return false; // Chain broken
    }
    if (entry.currentHash) {
      const computed = computeAuditHash(entry, entry.previousHash || expectedPrevHash);
      if (computed !== entry.currentHash) {
        return false; // Content modified
      }
      expectedPrevHash = entry.currentHash;
    }
  }
  return true;
}
