// Express Router for FaultLine Intelligence Hybrid Chatbot API.
// Mounted at /api/intelligence.
// Provides endpoints for:
// 1. Status & Active Processing Mode
// 2. Chat Orchestrator (FaultLineIntelligenceOrchestrator)
// 3. Modular Native Intelligence (Timeline, Contradictions, Corroboration, Risk, Completeness, Policy, Report)
// 4. Intelligence Builder (Pattern Discovery, Proposals, Benchmark Validation, Governance Approval & Rollback)

import express from 'express';
import { handleChatMessage } from './orchestrator.js';
import { clearConversation, getConversationHistory, getSessionMetrics } from './context.js';
import { getAdminMetrics } from './audit.js';
import { TOOLS } from './tools.js';
import { verifyExhibitQuotes } from './validator.js';
import { queryInvestigationRAG } from './rag.js';

// Native Engines
import { constructNativeTimeline } from './native/timeline.js';
import { detectNativeContradictions } from './native/contradiction.js';
import { detectNativeCorroborations } from './native/corroboration.js';
import { evaluateNativeRiskIndicators } from './native/risk.js';
import { evaluateInvestigationCompleteness } from './native/completeness.js';
import { evaluatePolicyCompliance } from './native/policy.js';
import { generateNativeInvestigationReport } from './native/report.js';

// Evolution Engines: Hypotheses, Evidence Independence, Workflow Action Packs & Decision Memory
import { HYPOTHESIS_METADATA, evaluateCompetingHypotheses } from './hypothesis.js';
import { evaluateEvidenceIndependence } from './independence.js';
import { generateWorkflowChecklist, calculateStatutoryDeadline } from './workflow.js';
import { recordCaseDecisionMemory, getCaseDecisionMemory } from './decision-memory.js';
import { getInvestigationDetails } from './investigation.js';

// Local AI & Intelligence Builder
import { detectLocalAI } from './local.js';
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
} from './builder.js';

export function intelligenceRouter({ getProvider, rateLimiter, timeoutMs }) {
  const router = express.Router();

  // GET /api/intelligence/status
  router.get('/status', async (req, res) => {
    const provider = getProvider ? getProvider() : null;
    const sessionMetrics = getSessionMetrics();
    const localAI = await detectLocalAI();
    const activeRules = getActiveRules();

    let currentMode = 'NATIVE INTELLIGENCE ACTIVE';
    if (provider?.configured) {
      currentMode = 'HYBRID (NATIVE + CLAUDE)';
    } else if (localAI.available) {
      currentMode = 'LOCAL AI CONNECTED';
    }

    res.json({
      ok: true,
      service: 'FaultLine Intelligence',
      version: '2.0.0',
      activeMode: currentMode,
      internalEngines: {
        applicationIntelligence: 'READY',
        investigationIntelligence: 'READY (266 scenarios indexed)',
        evidenceIntelligence: 'READY',
        timelineIntelligence: 'READY',
        contradictionIntelligence: 'READY',
        corroborationIntelligence: 'READY',
        riskIntelligence: 'READY',
        completenessIntelligence: 'READY',
        policyIntelligence: 'READY',
        legalIntelligence: 'READY (20 jurisdictions, 69 statutes)',
        workflowIntelligence: 'READY',
        reportIntelligence: 'READY',
      },
      provider: {
        id: provider?.id || 'none',
        name: provider?.name || 'Claude Sonnet',
        model: provider?.model || 'claude-sonnet-5-5',
        configured: Boolean(provider?.configured),
      },
      localAI: {
        available: localAI.available,
        provider: localAI.provider,
        models: localAI.models,
        baseUrl: localAI.baseUrl,
      },
      activeRulesCount: activeRules.length,
      activeSessions: sessionMetrics.activeSessionsCount,
    });
  });

  // GET /api/intelligence/providers
  router.get('/providers', async (req, res) => {
    const cloudProvider = getProvider ? getProvider() : null;
    const localAI = await detectLocalAI();

    const providers = [
      {
        id: 'native',
        name: 'FaultLine Native Intelligence Engine',
        type: 'deterministic',
        isLocal: true,
        configured: true,
        description: '100% offline rule-based deterministic forensic pipeline.',
      },
      {
        id: localAI.provider || 'ollama',
        name: localAI.name || 'Local AI (Ollama / LM Studio)',
        type: 'local_llm',
        isLocal: true,
        configured: localAI.available,
        baseUrl: localAI.baseUrl,
        models: localAI.models,
        defaultModel: localAI.defaultModel,
        description: localAI.available
          ? `Connected on ${localAI.baseUrl} with model ${localAI.defaultModel}`
          : 'Offline: Start Ollama (localhost:11434) or LM Studio (localhost:1234) for local inference.',
      },
      {
        id: cloudProvider?.id || 'anthropic',
        name: cloudProvider?.name || 'Anthropic Claude Sonnet',
        type: 'cloud_llm',
        isLocal: false,
        configured: Boolean(cloudProvider?.configured),
        model: cloudProvider?.model,
        description: cloudProvider?.configured
          ? `Configured (${cloudProvider?.name} ${cloudProvider?.model})`
          : 'Cloud provider not configured or missing API key.',
      },
    ];

    res.json({ ok: true, providers });
  });

  // POST /api/intelligence/verify-quote
  router.post('/verify-quote', (req, res) => {
    const { text = '', exhibits = [] } = req.body || {};
    const result = verifyExhibitQuotes(text, exhibits);
    res.json({ ok: true, ...result });
  });

  // POST /api/intelligence/rag/query
  router.post('/rag/query', (req, res) => {
    const { query = '', exhibits = [], topK = 4 } = req.body || {};
    const result = queryInvestigationRAG(query, exhibits, { topK });
    res.json({ ok: true, ...result });
  });

  // POST /api/intelligence/chat
  router.post('/chat', rateLimiter, async (req, res) => {
    const {
      message,
      conversationId = 'default',
      activeCaseId = null,
      caseFile = null,
      user = {},
      forceOffline = false,
    } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ code: 'INVALID_INPUT', error: 'Message text is required.' });
    }

    const effectiveUser = {
      ...(req.user || {}),
      ...(user || {}),
    };

    const clientGone = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) clientGone.abort();
    });

    const limitMs = (timeoutMs ? timeoutMs() : 60000);
    const timeout = AbortSignal.timeout(limitMs);
    const signal = AbortSignal.any([clientGone.signal, timeout]);

    try {
      const response = await handleChatMessage({
        message,
        conversationId,
        activeCaseId,
        caseFile,
        user: effectiveUser,
        getProvider,
        forceOffline,
        signal,
      });

      if (response.code === 'FORBIDDEN' || response.status === 403) {
        return res.status(403).json({
          ok: false,
          code: 'FORBIDDEN',
          error: response.text || 'Cross-tenant access violation: Case belongs to another organization.',
        });
      }

      return res.json({
        ok: true,
        ...response,
      });
    } catch (err) {
      if (err.code === 'FORBIDDEN' || err.status === 403) {
        return res.status(403).json({
          ok: false,
          code: 'FORBIDDEN',
          error: err.message || 'Cross-tenant access violation: Case belongs to another organization.',
        });
      }
      console.error('[intelligence-chat] Error:', err);
      return res.status(500).json({
        ok: false,
        code: 'INTELLIGENCE_ERROR',
        error: err.message || 'Something went wrong processing your request in FaultLine Intelligence.',
      });
    }
  });

  // =========================================================================
  // MODULAR NATIVE INTELLIGENCE ENDPOINTS (Layer A: 100% Offline Capable)
  // =========================================================================

  // POST /api/intelligence/native/timeline
  router.post('/native/timeline', (req, res) => {
    const { exhibits = [] } = req.body || {};
    const result = constructNativeTimeline(exhibits);
    res.json({ ok: true, source: 'NATIVE TIMELINE INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/contradictions
  router.post('/native/contradictions', (req, res) => {
    const { exhibits = [] } = req.body || {};
    const result = detectNativeContradictions(exhibits);
    res.json({ ok: true, source: 'NATIVE CONTRADICTION INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/corroborations
  router.post('/native/corroborations', (req, res) => {
    const { exhibits = [] } = req.body || {};
    const result = detectNativeCorroborations(exhibits);
    res.json({ ok: true, source: 'NATIVE CORROBORATION INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/risk
  router.post('/native/risk', (req, res) => {
    const { exhibits = [], context = '' } = req.body || {};
    const result = evaluateNativeRiskIndicators(exhibits, context);
    res.json({ ok: true, source: 'NATIVE RISK INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/completeness
  router.post('/native/completeness', (req, res) => {
    const { exhibits = [], context = '' } = req.body || {};
    const result = evaluateInvestigationCompleteness(exhibits, context);
    res.json({ ok: true, source: 'NATIVE COMPLETENESS INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/policy
  router.post('/native/policy', (req, res) => {
    const { exhibits = [], policyData = null } = req.body || {};
    const result = evaluatePolicyCompliance(exhibits, policyData);
    res.json({ ok: true, source: 'NATIVE POLICY INTELLIGENCE', ...result });
  });

  // POST /api/intelligence/native/report
  router.post('/native/report', (req, res) => {
    const { caseFile = {}, scenario = null, jurisdiction = 'UK' } = req.body || {};
    const result = generateNativeInvestigationReport({ caseFile, scenario, jurisdiction });
    res.json({ ok: true, source: 'NATIVE REPORT INTELLIGENCE', ...result });
  });

  // =========================================================================
  // EVOLUTION ENGINES (Hypotheses, Independence, Action Packs & Decision Memory)
  // =========================================================================

  // GET /api/intelligence/hypotheses
  router.get('/hypotheses', (req, res) => {
    res.json({ ok: true, hypotheses: Object.values(HYPOTHESIS_METADATA) });
  });

  // POST /api/intelligence/hypotheses/evaluate
  router.post('/hypotheses/evaluate', (req, res) => {
    try {
      const { exhibits = [], caseId = null } = req.body || {};
      let targetExhibits = exhibits;

      if (caseId && (!targetExhibits || targetExhibits.length === 0)) {
        const details = getInvestigationDetails(caseId, req.user || {});
        if (!details) {
          return res.status(404).json({ ok: false, error: `Investigation ${caseId} not found.` });
        }
        targetExhibits = details.caseFile?.exhibits || [];
      }

      const result = evaluateCompetingHypotheses(targetExhibits);
      res.json({ ok: true, source: 'COMPETING HYPOTHESIS WORKSPACE', ...result });
    } catch (err) {
      if (err.code === 'FORBIDDEN' || err.status === 403) {
        return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: err.message });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/independence
  router.post('/independence', (req, res) => {
    const { exhibitIds = [], exhibits = [] } = req.body || {};
    const result = evaluateEvidenceIndependence(exhibitIds, exhibits);
    res.json({ ok: true, source: 'EVIDENCE INDEPENDENCE ENGINE', ...result });
  });

  // POST /api/intelligence/actions/next-steps
  router.post('/actions/next-steps', (req, res) => {
    try {
      const { caseFile = {}, scenario = null, jurisdiction = 'UK', caseId = null } = req.body || {};
      let effectiveCaseFile = caseFile;
      let effectiveScenario = scenario;

      if (caseId && (!effectiveCaseFile || !effectiveCaseFile.exhibits)) {
        const details = getInvestigationDetails(caseId, req.user || {});
        if (!details) {
          return res.status(404).json({ ok: false, error: `Investigation ${caseId} not found.` });
        }
        effectiveCaseFile = details.caseFile;
        effectiveScenario = details.scenario;
      }

      const result = generateWorkflowChecklist({
        caseFile: effectiveCaseFile,
        scenario: effectiveScenario,
        jurisdiction,
      });

      res.json({ ok: true, source: 'WORKFLOW ACTION INTELLIGENCE', ...result });
    } catch (err) {
      if (err.code === 'FORBIDDEN' || err.status === 403) {
        return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: err.message });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/decision-memory
  router.post('/decision-memory', (req, res) => {
    try {
      const {
        investigationId,
        selectedHypothesis = null,
        hypothesisRationale = '',
        reviewedFindings = {},
        nextActionPlan = [],
      } = req.body || {};

      if (!investigationId) {
        return res.status(400).json({ ok: false, error: 'investigationId is required.' });
      }

      const result = recordCaseDecisionMemory({
        investigationId,
        selectedHypothesis,
        hypothesisRationale,
        reviewedFindings,
        nextActionPlan,
        user: req.user || {},
      });

      res.json(result);
    } catch (err) {
      if (err.code === 'FORBIDDEN' || err.status === 403) {
        return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: err.message });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/intelligence/decision-memory/:caseId
  router.get('/decision-memory/:caseId', (req, res) => {
    try {
      const result = getCaseDecisionMemory(req.params.caseId, req.user || {});
      if (!result) return res.status(404).json({ ok: false, error: 'Case not found.' });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.code === 'FORBIDDEN' || err.status === 403) {
        return res.status(403).json({ ok: false, code: 'FORBIDDEN', error: err.message });
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // =========================================================================
  // INTELLIGENCE BUILDER — GOVERNED SELF-IMPROVEMENT (Sections 11-15)
  // =========================================================================

  // GET /api/intelligence/builder/patterns
  router.get('/builder/patterns', (req, res) => {
    const patterns = discoverPatterns();
    res.json({ ok: true, ...patterns });
  });

  // GET /api/intelligence/builder/proposals
  router.get('/builder/proposals', (req, res) => {
    const proposals = listProposals();
    res.json({ ok: true, proposals });
  });

  // GET /api/intelligence/builder/proposals/:id
  router.get('/builder/proposals/:id', (req, res) => {
    const proposal = getProposal(req.params.id);
    if (!proposal) return res.status(404).json({ ok: false, error: 'Proposal not found' });
    res.json({ ok: true, proposal });
  });

  // POST /api/intelligence/builder/proposals/:id/validate
  router.post('/builder/proposals/:id/validate', (req, res) => {
    try {
      const validation = validateProposalAgainstBenchmarks(req.params.id);
      res.json({ ok: true, validation });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/builder/proposals/:id/approve (Human-in-the-Loop Governance Gate)
  router.post('/builder/proposals/:id/approve', (req, res) => {
    try {
      const { reviewerNotes = '', approvedBy = 'Claims Forensics Lead' } = req.body || {};
      const updated = approveProposal(req.params.id, { reviewerNotes, approvedBy });
      res.json({ ok: true, proposal: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/builder/proposals/:id/reject
  router.post('/builder/proposals/:id/reject', (req, res) => {
    try {
      const { reviewerNotes = '', rejectedBy = 'Claims Committee' } = req.body || {};
      const updated = rejectProposal(req.params.id, { reviewerNotes, rejectedBy });
      res.json({ ok: true, proposal: updated });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/builder/proposals/:id/activate
  router.post('/builder/proposals/:id/activate', (req, res) => {
    try {
      const { user = 'Claims Admin' } = req.body || {};
      const rule = activateRule(req.params.id, { user });
      res.json({ ok: true, rule });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // POST /api/intelligence/builder/proposals/:id/rollback
  router.post('/builder/proposals/:id/rollback', (req, res) => {
    try {
      const { reason = 'Operational adjustment', user = 'Claims Admin' } = req.body || {};
      const result = rollbackRule(req.params.id, { reason, user });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /api/intelligence/builder/rules
  router.get('/builder/rules', (req, res) => {
    const rules = getActiveRules();
    res.json({ ok: true, rules });
  });

  // GET /api/intelligence/builder/audit
  router.get('/builder/audit', (req, res) => {
    const audit = getBuilderAuditHistory();
    res.json({ ok: true, audit });
  });

  // GET /api/intelligence/conversations/:id
  router.get('/conversations/:id', (req, res) => {
    const history = getConversationHistory(req.params.id);
    res.json({ ok: true, conversationId: req.params.id, messages: history });
  });

  // POST /api/intelligence/conversations/:id/clear
  router.post('/conversations/:id/clear', (req, res) => {
    const result = clearConversation(req.params.id);
    res.json(result);
  });

  // GET /api/intelligence/admin/metrics
  router.get('/admin/metrics', (req, res) => {
    const metrics = getAdminMetrics();
    res.json({ ok: true, metrics });
  });

  // GET /api/intelligence/tools
  router.get('/tools', (req, res) => {
    const schemas = TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      readOnly: t.readOnly,
      parameters: t.parameters,
    }));
    res.json({ ok: true, tools: schemas });
  });

  return router;
}
