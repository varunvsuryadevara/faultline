// ToolRegistry: Controlled backend tool execution framework with permission checks
// and explicit confirmation guards for state-modifying actions.
// Supports standard tool definition formatting for Ollama and Claude function calling.

import { searchInvestigations, getInvestigationDetails, getInvestigationMetrics } from './investigation.js';
import { searchExhibits, auditEvidenceCompleteness } from './evidence.js';
import { queryLegalIntelligence, compareJurisdictions } from './legal.js';
import { generateWorkflowChecklist, draftInvestigatorNotes } from './workflow.js';
import { searchKnowledge } from './knowledge.js';
import { requiresHumanConfirmation } from './permissions.js';
import { queryInvestigationRAG } from './rag.js';
import { verifyExhibitQuotes } from './validator.js';

export const TOOLS = [
  {
    name: 'search_investigations',
    description: 'Search FaultLine scenarios and investigations by identifier, title, claimant, or keywords.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or scenario ID (e.g. UK-001, roundabout, rear-end)' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 5)' },
      },
      required: ['query'],
    },
    execute: async ({ query, limit = 5 }) => searchInvestigations(query, limit),
  },

  {
    name: 'get_investigation_metrics',
    description: 'Retrieve live aggregate operational metrics across the 266 benchmark scenarios and custom cases.',
    readOnly: true,
    parameters: { type: 'object', properties: {} },
    execute: async () => getInvestigationMetrics(),
  },

  {
    name: 'get_investigation_details',
    description: 'Retrieve full case file exhibits and metadata for an investigation ID.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Scenario ID (e.g. UK-001, US-010)' },
      },
      required: ['id'],
    },
    execute: async ({ id }) => getInvestigationDetails(id),
  },

  {
    name: 'query_evidence_rag',
    description: 'Executes BM25 hybrid lexical and entity search over case exhibits to retrieve ranked factual passages.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Forensic question or fact to search for in exhibits' },
        caseId: { type: 'string', description: 'Optional case identifier' },
        topK: { type: 'number', description: 'Number of chunks to return (default: 4)' },
      },
      required: ['query'],
    },
    execute: async ({ query, caseId = null, topK = 4 }, context = {}) => {
      let exhibits = context.caseFile?.exhibits;
      if (!exhibits && caseId) {
        const details = getInvestigationDetails(caseId);
        exhibits = details?.caseFile?.exhibits;
      }
      return queryInvestigationRAG(query, exhibits || [], { topK });
    },
  },

  {
    name: 'search_legal_regulations',
    description: 'Query verified motor insurance laws across 20 jurisdictions and 16 master legal categories.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Topic or statute name' },
        country: { type: 'string', description: 'Two-letter country code (UK, US, IN, CA, AU, etc.)' },
        category: { type: 'string', description: 'Category identifier (e.g. mandatory-insurance)' },
      },
    },
    execute: async (params) => queryLegalIntelligence(params),
  },

  {
    name: 'generate_workflow_checklist',
    description: 'Generate a step-by-step evidence verification checklist and identify missing evidence.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'Optional case identifier' },
      },
    },
    execute: async ({ caseId }, context = {}) => {
      const details = caseId ? getInvestigationDetails(caseId) : null;
      return generateWorkflowChecklist({
        caseFile: details?.caseFile || context.caseFile,
        scenario: details?.scenario,
      });
    },
  },

  {
    name: 'verify_claimant_quote',
    description: 'Performs deterministic substring validation of an assertion against an exhibit text.',
    readOnly: true,
    parameters: {
      type: 'object',
      properties: {
        quoteText: { type: 'string', description: 'Quoted string to verify' },
        exhibitId: { type: 'string', description: 'Exhibit letter (e.g. A, B, C)' },
      },
      required: ['quoteText', 'exhibitId'],
    },
    execute: async ({ quoteText, exhibitId }, context = {}) => {
      const exhibits = context.caseFile?.exhibits || [];
      const testString = `Exhibit ${exhibitId}: "${quoteText}"`;
      return verifyExhibitQuotes(testString, exhibits);
    },
  },

  {
    name: 'request_case_action',
    description: 'Requests a sensitive state-changing action (e.g. change status, add note) requiring human confirmation.',
    readOnly: false,
    parameters: {
      type: 'object',
      properties: {
        actionType: { type: 'string', enum: ['UPDATE_INVESTIGATION_STATUS', 'ADD_OFFICIAL_NOTE'] },
        caseId: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['actionType', 'caseId'],
    },
    execute: async ({ actionType, caseId, payload }, context = {}) => {
      if (requiresHumanConfirmation(actionType)) {
        return {
          status: 'AWAITING_CONFIRMATION',
          requiresConfirmation: true,
          actionType,
          caseId,
          payload,
          message: `The action '${actionType}' on case ${caseId} requires human claims examiner confirmation before applying changes.`,
        };
      }
      return { status: 'EXECUTED', ok: true };
    },
  },
];

/**
 * Executes a tool by name with parameter validation and permission checks.
 */
export async function executeTool(name, params = {}, context = {}) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool '${name}' not found in registry.`);
  }

  // Permission check for modifying tools
  if (!tool.readOnly && !context.permissions?.canModifyData) {
    throw new Error(`User does not have permission to execute state-changing tool '${name}'.`);
  }

  return tool.execute(params, context);
}

/**
 * Returns tool schemas in format expected by LLM tool/function calling.
 */
export function getToolDefinitions(format = 'openai') {
  if (format === 'anthropic') {
    return TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));
  }

  // OpenAI / Ollama format
  return TOOLS.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
