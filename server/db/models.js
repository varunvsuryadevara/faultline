// Relational Data Models & Access Functions for FaultLine Persistence
// Encapsulates investigations, claims, exhibits, decisions, and audit events.

import crypto from 'node:crypto';
import { db } from './store.js';

export const UserModel = {
  findByEmail(email) {
    return db.findByUserEmail(email);
  },

  findById(id) {
    return db.findById('users', id);
  },

  verifyPassword(user, plainPassword) {
    if (!user || !user.passwordHash || !plainPassword) return false;
    const stored = user.passwordHash;
    try {
      if (stored.includes(':')) {
        const [salt, expectedHash] = stored.split(':');
        const hash = crypto.scryptSync(plainPassword, salt, 32).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(hash, 'hex'));
      }
      // Legacy backward compatibility for initial seed records
      const salt = 'faultline_static_salt_2026';
      const hash = crypto.scryptSync(plainPassword, salt, 32).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(hash, 'hex'));
    } catch {
      return false;
    }
  },

  hashPassword(plainPassword) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plainPassword, salt, 32).toString('hex');
    return `${salt}:${hash}`;
  },

  list(tenantId = null) {
    return db.find('users', tenantId ? (u) => u.tenantId === tenantId : null);
  },
};

export const InvestigationModel = {
  create(data) {
    const claimRef = data.claimReference || `FL-${Date.now().toString().slice(-6)}`;
    const existing = db.findByClaimReference(claimRef);
    if (existing) {
      throw new Error(`Investigation with claim reference '${claimRef}' already exists.`);
    }

    const investigation = db.save('investigations', {
      tenantId: data.tenantId || 'tenant-default',
      claimReference: claimRef.toUpperCase(),
      title: data.title || 'Untitled Motor Investigation',
      context: data.context || '',
      country: (data.country || 'UK').toUpperCase(),
      region: data.region || null,
      status: data.status || 'OPEN',
      risk: data.risk || 'MEDIUM',
      incidentDate: data.incidentDate || new Date().toISOString(),
      incidentTime: data.incidentTime || null,
      incidentLocation: data.incidentLocation || null,
      assignedToId: data.assignedToId || null,
    });

    // Create associated claim record if provided
    if (data.claim) {
      db.save('claims', {
        investigationId: investigation.id,
        policyNumber: data.claim.policyNumber || 'POL-UNSPECIFIED',
        claimType: data.claim.claimType || 'Motor Collision',
        claimAmount: data.claim.claimAmount || null,
        claimantName: data.claim.claimantName || 'Unnamed Claimant',
        policyholderName: data.claim.policyholderName || 'Unnamed Policyholder',
      });
    }

    // Save exhibits if provided
    if (Array.isArray(data.exhibits)) {
      data.exhibits.forEach((ex, idx) => {
        const letter = ex.exhibitLetter || String.fromCharCode(65 + idx);
        db.save('exhibits', {
          investigationId: investigation.id,
          exhibitLetter: letter,
          label: ex.label || `Exhibit ${letter}`,
          kind: ex.kind || 'statement',
          text: ex.text || '',
        });
      });
    }

    AuditModel.record({
      investigationId: investigation.id,
      actionType: 'INVESTIGATION_CREATED',
      details: `Created investigation '${investigation.title}' (${investigation.claimReference}).`,
      userId: data.userId || null,
    });

    return this.getWithDetails(investigation.id);
  },

  findById(id) {
    return db.findById('investigations', id);
  },

  findByClaimReference(ref) {
    return db.findByClaimReference(ref);
  },

  list({ tenantId = null, status = null, country = null } = {}) {
    return db.find('investigations', (inv) => {
      if (tenantId && inv.tenantId !== tenantId) return false;
      if (status && inv.status !== status) return false;
      if (country && inv.country !== country.toUpperCase()) return false;
      return true;
    });
  },

  update(id, data) {
    const existing = db.findById('investigations', id);
    if (!existing) return null;

    const previous = { ...existing };
    const updated = db.save('investigations', { ...existing, ...data });

    AuditModel.record({
      investigationId: id,
      actionType: 'INVESTIGATION_UPDATED',
      details: `Updated investigation details for ${existing.claimReference}.`,
      previousValue: previous,
      newValue: updated,
      userId: data.userId || null,
    });

    return this.getWithDetails(id);
  },

  delete(id, userId = null) {
    const existing = db.findById('investigations', id);
    if (!existing) return false;

    // Delete cascading exhibits, claims, findings, decisions
    const exhibits = db.find('exhibits', (e) => e.investigationId === id);
    for (const ex of exhibits) db.delete('exhibits', ex.id);

    const claim = db.findOne('claims', (c) => c.investigationId === id);
    if (claim) db.delete('claims', claim.id);

    const decision = db.findOne('decisions', (d) => d.investigationId === id);
    if (decision) db.delete('decisions', decision.id);

    db.delete('investigations', id);

    AuditModel.record({
      investigationId: id,
      actionType: 'INVESTIGATION_DELETED',
      details: `Deleted investigation ${existing.claimReference}.`,
      userId,
    });

    return true;
  },

  getWithDetails(id) {
    const inv = db.findById('investigations', id);
    if (!inv) return null;

    const claim = db.findOne('claims', (c) => c.investigationId === id);
    const exhibits = db.find('exhibits', (e) => e.investigationId === id);
    const decision = db.findOne('decisions', (d) => d.investigationId === id);
    const findings = db.find('findings', (f) => f.investigationId === id);
    const contradictions = db.find('contradictions', (c) => c.investigationId === id);
    const subrogation = db.findOne('subrogations', (s) => s.investigationId === id);
    const salvage = db.findOne('salvages', (s) => s.investigationId === id);

    return {
      ...inv,
      claim: claim || null,
      exhibits: exhibits || [],
      decision: decision || null,
      findings: findings || [],
      contradictions: contradictions || [],
      subrogation: subrogation || null,
      salvage: salvage || null,
    };
  },
};

export const DecisionModel = {
  createOrUpdate(data) {
    const {
      investigationId,
      recommendation,
      outcome,
      explanation,
      confidence,
      corroboratingExhibits = [],
      contradictionExhibits = [],
      missingItems = [],
      recommendedBy,
    } = data;

    const existing = db.findOne('decisions', (d) => d.investigationId === investigationId);
    const payload = {
      ...(existing || {}),
      investigationId,
      recommendation: recommendation || outcome || 'REVIEW',
      outcome: outcome || recommendation || 'REVIEW',
      explanation: explanation || '',
      aiConfidence: typeof confidence === 'number' ? Math.round(confidence * 100) : 85,
      corroboratingExhibits,
      contradictionExhibits,
      missingItems,
      recommendedBy: recommendedBy || 'investigator@faultline.internal',
      status: 'PENDING_MANAGER_REVIEW',
      updatedAt: new Date().toISOString(),
    };

    const saved = db.save('decisions', payload);

    AuditModel.record({
      investigationId,
      actionType: 'DECISION_RECOMMENDATION_REGISTERED',
      details: `Investigator recommended: ${payload.recommendation}`,
      newValue: saved,
    });

    return saved;
  },

  saveDecision(investigationId, decisionData, userId = null) {
    const existing = db.findOne('decisions', (d) => d.investigationId === investigationId);
    const payload = {
      ...(existing || {}),
      ...decisionData,
      investigationId,
    };
    const saved = db.save('decisions', payload);

    // Update investigation status based on decision
    const inv = db.findById('investigations', investigationId);
    if (inv) {
      const newStatus = decisionData.outcome === 'APPROVE' ? 'APPROVED'
        : decisionData.outcome === 'REJECT' ? 'REJECTED'
        : 'UNDER_REVIEW';
      db.save('investigations', { ...inv, status: newStatus });
    }

    AuditModel.record({
      investigationId,
      actionType: 'DECISION_GENERATED',
      details: `Generated final decision: ${decisionData.outcome} (Confidence: ${decisionData.aiConfidence}%).`,
      newValue: saved,
      userId,
    });

    return saved;
  },

  findByInvestigationId(investigationId) {
    return db.findOne('decisions', (d) => d.investigationId === investigationId);
  },

  signOff(decisionIdOrPayload, approverIdParam = null, optionsParam = {}) {
    let decisionId;
    let approverId;
    let comments = '';
    let badFaithAcknowledged = true;
    let approvedDecision = null;
    let reviewNotes = '';

    if (typeof decisionIdOrPayload === 'object' && decisionIdOrPayload !== null) {
      const opts = decisionIdOrPayload;
      decisionId = opts.decisionId;
      approverId = opts.managerId || opts.managerEmail || 'manager';
      approvedDecision = opts.approvedDecision;
      reviewNotes = opts.reviewNotes || '';
      comments = reviewNotes;
      badFaithAcknowledged = opts.checklist?.physicalEvidenceCheck ?? true;
      if (!decisionId && opts.investigationId) {
        const found = db.findOne('decisions', (d) => d.investigationId === opts.investigationId);
        decisionId = found?.id;
      }
    } else {
      decisionId = decisionIdOrPayload;
      approverId = approverIdParam;
      comments = optionsParam.comments || '';
      badFaithAcknowledged = optionsParam.badFaithAcknowledged ?? true;
    }

    let decision = decisionId ? db.findById('decisions', decisionId) : null;
    if (!decision) {
      // create empty decision record if not yet recorded
      decision = db.save('decisions', {
        investigationId: decisionIdOrPayload?.investigationId || 'INV-GLOBAL',
        outcome: approvedDecision || 'REVIEW',
        status: 'PENDING_MANAGER_REVIEW',
      });
      decisionId = decision.id;
    }

    const approval = db.save('decisionApprovals', {
      decisionId,
      approverId,
      approverRole: 'CLAIMS_MANAGER',
      status: 'APPROVED',
      approvedDecision: approvedDecision || decision.outcome,
      comments: comments || reviewNotes,
      badFaithReviewAcknowledged: badFaithAcknowledged,
      timestamp: new Date().toISOString(),
    });

    const updatedDecision = db.save('decisions', {
      ...decision,
      status: 'SIGNED_OFF',
      finalDecision: approvedDecision || decision.outcome,
      signedOffById: approverId,
      signedOffAt: new Date().toISOString(),
      approvals: [approval],
    });

    AuditModel.record({
      investigationId: decision.investigationId,
      actionType: 'DECISION_AUTHORIZED_BY_MANAGER',
      details: `Decision ${approvedDecision || decision.outcome} officially authorized by user ${approverId}.`,
      userId: approverId,
    });

    return updatedDecision;
  },
};

export const AuditModel = {
  record({
    investigationId = null,
    userId = null,
    actorId = null,
    actorType = 'USER',
    actionType = null,
    action = null,
    details = '',
    previousValue = null,
    newValue = null,
    ipAddress = null,
    entityType = 'SYSTEM',
    entityId = null,
  }) {
    return db.save('auditEvents', {
      investigationId: investigationId || entityId,
      userId: userId || actorId,
      action: action || actionType || 'GENERIC_ACTION',
      actionType: actionType || action || 'GENERIC_ACTION',
      entityType,
      entityId,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      previousValue,
      newValue,
      ipAddress,
      timestamp: new Date().toISOString(),
    });
  },

  listForInvestigation(investigationId) {
    const all = db.find('auditEvents', (a) => a.investigationId === investigationId);
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  listByInvestigation(investigationId) {
    return this.listForInvestigation(investigationId);
  },

  listAll(limit = 100) {
    const all = db.find('auditEvents');
    return all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  },

  listRecent(limit = 100) {
    return this.listAll(limit);
  },
};
