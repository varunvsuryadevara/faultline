// PermissionResolver: Enforces role-based access control (RBAC),
// flags data-changing operations for confirmation, and prevents unauthorized investigation queries.

export const ROLES = {
  INVESTIGATOR: 'investigator',
  CLAIMS_MANAGER: 'claims_manager',
  ADMIN: 'admin',
  AUDITOR: 'auditor',
  GUEST: 'guest',
};

export const PERMISSIONS = {
  READ_KNOWLEDGE: 'READ_KNOWLEDGE',
  READ_SCENARIOS: 'READ_SCENARIOS',
  READ_EVIDENCE: 'READ_EVIDENCE',
  READ_LEGAL: 'READ_LEGAL',
  EXECUTE_AI_ESCALATION: 'EXECUTE_AI_ESCALATION',
  CONFIRM_DATA_CHANGES: 'CONFIRM_DATA_CHANGES',
  VIEW_ADMIN_METRICS: 'VIEW_ADMIN_METRICS',
};

const ROLE_PERMISSIONS = {
  [ROLES.GUEST]: [
    PERMISSIONS.READ_KNOWLEDGE,
    PERMISSIONS.READ_SCENARIOS,
    PERMISSIONS.READ_LEGAL,
  ],
  [ROLES.INVESTIGATOR]: [
    PERMISSIONS.READ_KNOWLEDGE,
    PERMISSIONS.READ_SCENARIOS,
    PERMISSIONS.READ_EVIDENCE,
    PERMISSIONS.READ_LEGAL,
    PERMISSIONS.EXECUTE_AI_ESCALATION,
  ],
  [ROLES.CLAIMS_MANAGER]: [
    PERMISSIONS.READ_KNOWLEDGE,
    PERMISSIONS.READ_SCENARIOS,
    PERMISSIONS.READ_EVIDENCE,
    PERMISSIONS.READ_LEGAL,
    PERMISSIONS.EXECUTE_AI_ESCALATION,
    PERMISSIONS.CONFIRM_DATA_CHANGES,
  ],
  [ROLES.ADMIN]: [
    PERMISSIONS.READ_KNOWLEDGE,
    PERMISSIONS.READ_SCENARIOS,
    PERMISSIONS.READ_EVIDENCE,
    PERMISSIONS.READ_LEGAL,
    PERMISSIONS.EXECUTE_AI_ESCALATION,
    PERMISSIONS.CONFIRM_DATA_CHANGES,
    PERMISSIONS.VIEW_ADMIN_METRICS,
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.READ_KNOWLEDGE,
    PERMISSIONS.READ_SCENARIOS,
    PERMISSIONS.READ_EVIDENCE,
    PERMISSIONS.READ_LEGAL,
    PERMISSIONS.VIEW_ADMIN_METRICS,
  ],
};

/**
 * Resolves permissions for a user given their role (defaults to INVESTIGATOR).
 */
export function resolveUserPermissions(user = {}) {
  const role = String(user.role || ROLES.INVESTIGATOR).toLowerCase();
  const granted = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.INVESTIGATOR];

  return {
    userId: user.id || 'usr-investigator-01',
    role,
    permissions: granted,
    canAccessEvidence: granted.includes(PERMISSIONS.READ_EVIDENCE),
    canEscalateToClaude: granted.includes(PERMISSIONS.EXECUTE_AI_ESCALATION),
    canModifyData: granted.includes(PERMISSIONS.CONFIRM_DATA_CHANGES),
    canViewAdminMetrics: granted.includes(PERMISSIONS.VIEW_ADMIN_METRICS),
  };
}

/**
 * Checks if a specific action requires explicit human confirmation.
 */
export function requiresHumanConfirmation(actionType) {
  const SENSITIVE_ACTIONS = [
    'UPDATE_INVESTIGATION_STATUS',
    'APPROVE_CLAIM',
    'REJECT_CLAIM',
    'DELETE_EVIDENCE',
    'PUBLISH_REGULATION',
    'MODIFY_SYSTEM_CONFIG',
  ];
  return SENSITIVE_ACTIONS.includes(actionType);
}
