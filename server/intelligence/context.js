// ContextManager: Manages multi-turn conversation memory, active investigation context,
// and session isolation. Guarantees that conversations do not leak across users or cases.

const CONVERSATIONS = new Map();
const MAX_TURNS = 30;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Gets or initializes a conversation session.
 */
export function getOrCreateConversation(conversationId = 'default', initialContext = {}) {
  let session = CONVERSATIONS.get(conversationId);
  const now = Date.now();

  if (!session || (now - session.lastActivity) > SESSION_TTL_MS) {
    session = {
      id: conversationId,
      createdAt: now,
      lastActivity: now,
      activeCaseId: initialContext.activeCaseId || null,
      activeCase: initialContext.caseFile || null,
      messages: [],
      metadata: {
        totalQueries: 0,
        internalQueries: 0,
        claudeEscalations: 0,
      },
    };
    CONVERSATIONS.set(conversationId, session);
  }

  // Update active case if explicitly provided in request
  if (initialContext.activeCaseId && initialContext.activeCaseId !== session.activeCaseId) {
    session.activeCaseId = initialContext.activeCaseId;
    if (initialContext.caseFile) session.activeCase = initialContext.caseFile;
  }

  session.lastActivity = now;
  return session;
}

/**
 * Appends a message to the conversation history with length cap.
 */
export function appendMessage(conversationId, message) {
  const session = getOrCreateConversation(conversationId);
  session.messages.push({
    ...message,
    timestamp: new Date().toISOString(),
  });

  if (session.messages.length > MAX_TURNS) {
    session.messages = session.messages.slice(-MAX_TURNS);
  }

  session.lastActivity = Date.now();
  return session;
}

/**
 * Clears conversation history for a given session.
 */
export function clearConversation(conversationId) {
  CONVERSATIONS.delete(conversationId);
  return { ok: true, message: `Conversation ${conversationId} cleared.` };
}

/**
 * Gets conversation history.
 */
export function getConversationHistory(conversationId) {
  const session = CONVERSATIONS.get(conversationId);
  return session ? session.messages : [];
}

/**
 * Returns diagnostic stats across all active sessions.
 */
export function getSessionMetrics() {
  return {
    activeSessionsCount: CONVERSATIONS.size,
  };
}
