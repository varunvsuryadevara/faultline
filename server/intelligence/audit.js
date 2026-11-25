// ChatAuditService: Tracks chatbot operational metrics, escalation rates,
// token expenditures, latency, and tool invocations.

const AUDIT_METRICS = {
  totalRequests: 0,
  internalOnlyRequests: 0,
  claudeEscalatedRequests: 0,
  totalTokensEstimated: 0,
  totalLatencyMs: 0,
  escalationReasons: {},
  intentCounts: {},
  toolInvocations: {},
  failedRequests: 0,
  recentEvents: [],
};

const MAX_EVENT_LOGS = 100;
// Cost baseline: Claude 3.5 Sonnet input ~$3/M tokens, output ~$15/M tokens. Blended ~$6/M tokens ($0.000006/token)
const COST_PER_TOKEN = 0.000006;

/**
 * Records an audit event for a processed chat interaction.
 */
export function recordChatAudit({
  conversationId,
  intent,
  outcome,
  escalatedToClaude,
  escalationReason,
  durationMs,
  tokens,
  toolsUsed = [],
  error = null,
}) {
  AUDIT_METRICS.totalRequests++;
  AUDIT_METRICS.totalLatencyMs += (durationMs || 0);

  if (escalatedToClaude) {
    AUDIT_METRICS.claudeEscalatedRequests++;
    if (escalationReason) {
      AUDIT_METRICS.escalationReasons[escalationReason] = (AUDIT_METRICS.escalationReasons[escalationReason] || 0) + 1;
    }
  } else {
    AUDIT_METRICS.internalOnlyRequests++;
  }

  if (tokens?.total) {
    AUDIT_METRICS.totalTokensEstimated += tokens.total;
  }

  if (intent) {
    AUDIT_METRICS.intentCounts[intent] = (AUDIT_METRICS.intentCounts[intent] || 0) + 1;
  }

  if (Array.isArray(toolsUsed)) {
    toolsUsed.forEach((tool) => {
      AUDIT_METRICS.toolInvocations[tool] = (AUDIT_METRICS.toolInvocations[tool] || 0) + 1;
    });
  }

  if (error) {
    AUDIT_METRICS.failedRequests++;
  }

  // Record structured log event
  AUDIT_METRICS.recentEvents.unshift({
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    conversationId,
    intent,
    outcome,
    escalatedToClaude,
    durationMs,
    tokens: tokens?.total || 0,
    hasError: Boolean(error),
  });

  if (AUDIT_METRICS.recentEvents.length > MAX_EVENT_LOGS) {
    AUDIT_METRICS.recentEvents = AUDIT_METRICS.recentEvents.slice(0, MAX_EVENT_LOGS);
  }
}

/**
 * Returns aggregated administrative metrics for Phase 8.
 */
export function getAdminMetrics() {
  const avgLatency = AUDIT_METRICS.totalRequests > 0
    ? Math.round(AUDIT_METRICS.totalLatencyMs / AUDIT_METRICS.totalRequests)
    : 0;

  const internalRatio = AUDIT_METRICS.totalRequests > 0
    ? Math.round((AUDIT_METRICS.internalOnlyRequests / AUDIT_METRICS.totalRequests) * 100)
    : 100;

  const estimatedCost = (AUDIT_METRICS.totalTokensEstimated * COST_PER_TOKEN).toFixed(4);
  // Estimated cost saved by answering internally without Claude
  const savedCost = (AUDIT_METRICS.internalOnlyRequests * 800 * COST_PER_TOKEN).toFixed(4);

  return {
    totalRequests: AUDIT_METRICS.totalRequests,
    internalOnlyRequests: AUDIT_METRICS.internalOnlyRequests,
    claudeEscalatedRequests: AUDIT_METRICS.claudeEscalatedRequests,
    internalAnswerPercentage: `${internalRatio}%`,
    averageLatencyMs: avgLatency,
    estimatedTotalCostUSD: `$${estimatedCost}`,
    estimatedCostSavedUSD: `$${savedCost}`,
    intentDistribution: AUDIT_METRICS.intentCounts,
    escalationReasons: AUDIT_METRICS.escalationReasons,
    toolInvocations: AUDIT_METRICS.toolInvocations,
    failedRequests: AUDIT_METRICS.failedRequests,
    recentAuditLogs: AUDIT_METRICS.recentEvents.slice(0, 20),
  };
}
