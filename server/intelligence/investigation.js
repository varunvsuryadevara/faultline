// InvestigationIntelligenceService: Direct access to FaultLine's 266 benchmark scenarios,
// custom saved scenarios, metric aggregation, and structured case summaries.
// Enforces tenant isolation for database investigations.

import { SCENARIOS, getScenario } from '../../shared/scenarios/index.js';
import { scenarioCase } from '../../shared/scenarios/case.js';
import { queryScenarios, facetCounts } from '../../shared/scenarios/query.js';
import { listCustomScenarios, getCustomScenario } from '../custom-scenarios.js';
import { InvestigationModel } from '../db/models.js';

/**
 * Computes deterministic operational metrics across all available investigations.
 */
export function getInvestigationMetrics() {
  const custom = listCustomScenarios();
  const allScenarios = [...SCENARIOS, ...custom];
  const total = allScenarios.length;

  const byIntent = { genuine: 0, suspicious: 0, staged: 0 };
  const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
  const byCountry = {};
  const byStage = {};

  for (const s of allScenarios) {
    // Intent
    const rawIntent = (s.intent || '').toLowerCase();
    let intentKey = 'genuine';
    if (rawIntent.includes('staged') || rawIntent.includes('fraud') || rawIntent.includes('fabricat')) {
      intentKey = 'staged';
    } else if (rawIntent.includes('suspicious') || rawIntent.includes('exaggerat') || rawIntent.includes('inconsistent') || rawIntent.includes('uncertain')) {
      intentKey = 'suspicious';
    } else {
      intentKey = 'genuine';
    }
    byIntent[intentKey] = (byIntent[intentKey] || 0) + 1;

    // Risk
    const r = s.risk?.toLowerCase() || 'medium';
    if (byRisk[r] !== undefined) byRisk[r]++;

    // Country
    const c = s.country || 'UK';
    byCountry[c] = (byCountry[c] || 0) + 1;

    // Stage
    const stage = s.stage || 'Investigation';
    byStage[stage] = (byStage[stage] || 0) + 1;
  }

  // Under review estimation (suspicious scenarios require review)
  const underReview = byIntent.suspicious;
  const approvedLikely = byIntent.genuine;
  const rejectedLikely = byIntent.staged;

  return {
    total,
    libraryTotal: SCENARIOS.length,
    customTotal: custom.length,
    byIntent,
    byRisk,
    byCountry,
    byStage,
    estimatedDecisions: {
      underReview,
      approvedLikely,
      rejectedLikely,
    },
  };
}

/**
 * Searches scenarios by ID or text keywords.
 */
export function searchInvestigations(query, limit = 5) {
  const custom = listCustomScenarios();
  const pool = [...custom, ...SCENARIOS];
  const q = String(query || '').trim();

  // If query is an exact ID match
  const exact = pool.find((s) => s.id.toUpperCase() === q.toUpperCase());
  if (exact) {
    return [formatScenarioSummary(exact)];
  }

  const { items } = queryScenarios(pool, { q, sort: 'relevance' });
  return items.slice(0, limit).map(formatScenarioSummary);
}

/**
 * Retrieves a single scenario and builds its complete exhibit case file.
 * Strictly enforces tenant isolation when querying database investigations.
 */
export function getInvestigationDetails(id, user = {}) {
  if (!id) return null;
  const rawId = String(id).trim();
  const cleanId = rawId.toUpperCase();

  // 1. Check database investigations first
  try {
    const dbInv = InvestigationModel.findById(rawId) ||
                  InvestigationModel.findById(cleanId) ||
                  InvestigationModel.findByClaimReference(cleanId);
    if (dbInv) {
      const userTenant = user?.tenantId;
      const userRole = user?.role;
      // If user has a tenant and case has a tenant, verify tenant match (unless SYSTEM_ADMIN)
      if (userTenant && dbInv.tenantId && dbInv.tenantId !== userTenant && userRole !== 'SYSTEM_ADMIN') {
        const error = new Error(`Cross-tenant access violation: Case ${cleanId} belongs to another organization.`);
        error.code = 'FORBIDDEN';
        error.status = 403;
        throw error;
      }

      const fullDetails = InvestigationModel.getWithDetails(dbInv.id);
      return {
        scenario: {
          id: fullDetails.claimReference || fullDetails.id,
          title: fullDetails.title,
          country: fullDetails.country,
          risk: fullDetails.risk,
          stage: fullDetails.status,
          claimant: fullDetails.claim?.claimantName,
        },
        caseFile: {
          id: fullDetails.id,
          title: fullDetails.title,
          context: fullDetails.context,
          country: fullDetails.country,
          exhibits: (fullDetails.exhibits || []).map((e, idx) => ({
            id: e.exhibitLetter || String.fromCharCode(65 + idx),
            label: e.label || `Exhibit ${e.exhibitLetter || String.fromCharCode(65 + idx)}`,
            kind: e.kind || 'statement',
            text: e.text || '',
          })),
        },
        tenantId: fullDetails.tenantId,
      };
    }
  } catch (err) {
    if (err.code === 'FORBIDDEN') throw err;
  }

  // 2. Custom or Predefined Benchmark Scenario
  const scenario = getCustomScenario(cleanId) || getScenario(cleanId);
  if (!scenario) return null;

  const caseFile = scenarioCase(scenario);
  return {
    scenario,
    caseFile,
    tenantId: null, // Shared benchmark library
  };
}

/**
 * Formats a scenario summary object.
 */
function formatScenarioSummary(s) {
  return {
    id: s.id,
    title: s.title,
    country: s.country,
    category: s.category || s.claimType,
    risk: s.risk || 'medium',
    intent: s.intent || 'genuine',
    claimant: s.claimant,
    stage: s.stage,
  };
}

/**
 * Generates a structured investigation summary dossier for the chatbot.
 */
export function generateCaseSummary(idOrCase, caseFileParam = null, user = {}) {
  let scenario = null;
  let caseFile = caseFileParam;

  if (typeof idOrCase === 'string') {
    const details = getInvestigationDetails(idOrCase, user);
    if (!details) return `No investigation found matching identifier **${idOrCase}**.`;
    scenario = details.scenario;
    caseFile = details.caseFile;
  } else if (idOrCase && typeof idOrCase === 'object') {
    scenario = idOrCase;
    if (!caseFile && scenario) caseFile = scenarioCase(scenario);
  }

  const title = scenario?.title || caseFile?.title || 'Active Investigation';
  const id = scenario?.id || 'ACTIVE-CASE';
  const country = scenario?.country || 'UK';
  const risk = scenario?.risk?.toUpperCase() || 'MEDIUM';
  const intent = scenario?.intent?.toUpperCase() || 'REVIEW';
  const exhibits = caseFile?.exhibits || [];

  const exhibitsList = exhibits.length > 0
    ? exhibits.map((e, i) => `  - **Exhibit ${String.fromCharCode(65 + i)}** (${e.label || e.kind}): ${e.text.slice(0, 110).replace(/\n/g, ' ')}...`).join('\n')
    : '  - No exhibits loaded in this case file.';

  const inconsistencies = (scenario?.inconsistencies || scenario?.indicators || [])
    .slice(0, 4)
    .map((inc) => `  - ${inc}`)
    .join('\n') || '  - None formally indexed. Check cross-examination results.';

  const missing = (scenario?.missing || [])
    .slice(0, 3)
    .map((m) => `  - ${m}`)
    .join('\n') || '  - No critical evidence flagged as missing in pre-assessment.';

  const steps = (scenario?.steps || [])
    .slice(0, 3)
    .map((st) => `  - ${st}`)
    .join('\n') || '  - Complete witness cross-examination and cross-reference physical telematics.';

  return `### Investigation Dossier: ${id} — ${title}\n\n` +
    `• **Jurisdiction: ${country}**\n` +
    `• **Risk Classification: ${risk}**\n` +
    `• **Forensic Disposition:** ${intent}\n` +
    `• **Exhibits Manifest (${exhibits.length} exhibits):**\n${exhibitsList}\n\n` +
    `**Key Inconsistencies & Contradictions:**\n${inconsistencies}\n\n` +
    `**Missing or Required Evidence:**\n${missing}\n\n` +
    `**Recommended Verification Steps:**\n${steps}`;
}
