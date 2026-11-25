import express from 'express';
import { AuditModel } from '../db/models.js';
import { requireAuth, requireRole, ROLES } from '../auth.js';

export const auditRouter = express.Router();

/**
 * GET /api/audit/all
 * Returns paginated system audit trail (restricted to Auditors, Managers, and Admins)
 */
auditRouter.get('/all', requireAuth, requireRole(ROLES.AUDITOR, ROLES.CLAIMS_MANAGER, ROLES.SYSTEM_ADMIN), (req, res) => {
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
  const events = AuditModel.listRecent(limit);

  res.json({
    ok: true,
    count: events.length,
    events,
  });
});

/**
 * GET /api/audit/investigation/:id
 * Returns immutable event history for a specific investigation
 */
auditRouter.get('/investigation/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const events = AuditModel.listByInvestigation(id);

  res.json({
    ok: true,
    investigationId: id,
    count: events.length,
    events,
  });
});

/**
 * POST /api/audit/log
 * Explicitly records an audit entry from client interactions
 */
auditRouter.post('/log', requireAuth, (req, res) => {
  const { action, entityType, entityId, details, investigationId } = req.body || {};

  if (!action) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: 'Action is required.' });
  }

  const user = req.user;

  const record = AuditModel.record({
    tenantId: user.tenantId || 'tenant-faultline-primary',
    actorType: 'USER',
    actorId: user.id,
    action,
    entityType: entityType || 'UI',
    entityId: entityId || investigationId || 'GLOBAL',
    investigationId,
    details: {
      ...details,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
  });

  res.json({ ok: true, auditId: record.id });
});
