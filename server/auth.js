import crypto from 'node:crypto';
import { UserModel, AuditModel } from './db/models.js';

function resolveJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== '') {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be explicitly defined in production.');
  }
  if (!globalThis.__FAULTLINE_DEV_SECRET) {
    globalThis.__FAULTLINE_DEV_SECRET = crypto.randomBytes(32).toString('hex');
    console.warn('[auth] NOTICE: JWT_SECRET not set in environment. Generated secure ephemeral session secret.');
  }
  return globalThis.__FAULTLINE_DEV_SECRET;
}

const getJwtSecret = () => resolveJwtSecret();

export const ROLES = {
  INVESTIGATOR: 'INVESTIGATOR',
  SENIOR_INVESTIGATOR: 'SENIOR_INVESTIGATOR',
  CLAIMS_MANAGER: 'CLAIMS_MANAGER',
  AUDITOR: 'AUDITOR',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
};

export const ROLE_PERMISSIONS = {
  [ROLES.INVESTIGATOR]: [
    'claim:read',
    'claim:create',
    'claim:edit',
    'evidence:upload',
    'evidence:verify',
    'analysis:run',
    'decision:recommend',
  ],
  [ROLES.SENIOR_INVESTIGATOR]: [
    'claim:read',
    'claim:create',
    'claim:edit',
    'evidence:upload',
    'evidence:verify',
    'analysis:run',
    'decision:recommend',
    'decision:override',
    'subrogation:initiate',
  ],
  [ROLES.CLAIMS_MANAGER]: [
    'claim:read',
    'claim:create',
    'claim:edit',
    'evidence:upload',
    'evidence:verify',
    'analysis:run',
    'decision:recommend',
    'decision:sign_off',
    'subrogation:initiate',
    'subrogation:approve',
    'audit:read',
  ],
  [ROLES.AUDITOR]: [
    'claim:read',
    'evidence:verify',
    'audit:read',
    'report:export',
  ],
  [ROLES.SYSTEM_ADMIN]: [
    '*',
  ],
};

/**
 * Base64URL encoding helper
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decoding helper
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Signs a standard JWT with HMAC-SHA256
 */
export function signToken(payload, expiresInSeconds = 86400) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verifies a JWT token signature and expiry
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware: authenticates Bearer token if present
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      error: 'Session token has expired or is invalid. Please sign in again.',
    });
  }

  req.user = decoded;
  next();
}

/**
 * Middleware: enforces that user is signed in
 */
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      code: 'UNAUTHENTICATED',
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }
  next();
}

/**
 * Middleware: enforces one of the specified roles
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        error: 'Authentication required to access this resource.',
      });
    }

    if (req.user.role === ROLES.SYSTEM_ADMIN) {
      return next(); // System admin bypasses role gates
    }

    if (!allowedRoles.includes(req.user.role)) {
      AuditModel.record({
        tenantId: req.user.tenantId,
        actorType: 'USER',
        actorId: req.user.id,
        action: 'ACCESS_DENIED',
        entityType: 'ENDPOINT',
        entityId: req.originalUrl,
        details: { requiredRoles: allowedRoles, actualRole: req.user.role },
      });

      return res.status(403).json({
        code: 'FORBIDDEN',
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

/**
 * Checks if user has a specific permission
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.SYSTEM_ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes('*') || permissions.includes(permission);
}
