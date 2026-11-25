import express from 'express';
import { UserModel, AuditModel } from '../db/models.js';
import { signToken, verifyToken, ROLES, ROLE_PERMISSIONS } from '../auth.js';

export const authRouter = express.Router();

/**
 * POST /api/auth/login
 * Validates email and password, returns signed JWT + sanitized user profile
 */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      code: 'MISSING_CREDENTIALS',
      error: 'Both email and password are required.',
    });
  }

  const user = UserModel.findByEmail(email);
  if (!user || !user.isActive) {
    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid email or password.',
    });
  }

  const isValid = UserModel.verifyPassword(user, password);
  if (!isValid) {
    AuditModel.record({
      tenantId: user.tenantId,
      actorType: 'USER',
      actorId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'USER',
      entityId: user.id,
      details: { email: user.email, ip: req.ip },
    });

    return res.status(401).json({
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid email or password.',
    });
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    permissions,
  });

  AuditModel.record({
    tenantId: user.tenantId,
    actorType: 'USER',
    actorId: user.id,
    action: 'LOGIN_SUCCESS',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email, role: user.role, ip: req.ip },
  });

  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      permissions,
    },
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
authRouter.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHENTICATED', error: 'No active session.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ code: 'INVALID_TOKEN', error: 'Session expired.' });
  }

  const user = UserModel.findById(decoded.id);
  if (!user || !user.isActive) {
    return res.status(401).json({ code: 'USER_INACTIVE', error: 'User account disabled.' });
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];

  res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      permissions,
    },
  });
});

/**
 * POST /api/auth/logout
 * Logs logout audit event
 */
authRouter.post('/logout', (req, res) => {
  if (req.user) {
    AuditModel.record({
      tenantId: req.user.tenantId,
      actorType: 'USER',
      actorId: req.user.id,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: req.user.id,
      details: { email: req.user.email },
    });
  }
  res.json({ ok: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/roles
 * Lists system roles and their permissions for UI display
 */
authRouter.get('/roles', (req, res) => {
  res.json({
    ok: true,
    roles: Object.keys(ROLES).map((role) => ({
      role,
      permissions: ROLE_PERMISSIONS[role] || [],
    })),
  });
});
