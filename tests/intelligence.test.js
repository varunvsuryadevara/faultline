import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntent, INTENT_TYPES, ROUTING_OUTCOMES } from '../server/intelligence/intent.js';
import { searchKnowledge } from '../server/intelligence/knowledge.js';
import { getInvestigationMetrics, searchInvestigations, getInvestigationDetails, generateCaseSummary } from '../server/intelligence/investigation.js';
import { searchExhibits, extractFactualEntities, auditEvidenceCompleteness } from '../server/intelligence/evidence.js';
import { queryLegalIntelligence, compareJurisdictions } from '../server/intelligence/legal.js';
import { generateWorkflowChecklist, draftInvestigatorNotes } from '../server/intelligence/workflow.js';
import { resolveUserPermissions, requiresHumanConfirmation, ROLES } from '../server/intelligence/permissions.js';
import { validateResponse } from '../server/intelligence/validator.js';
import { getOrCreateConversation, appendMessage, clearConversation } from '../server/intelligence/context.js';
import { recordChatAudit, getAdminMetrics } from '../server/intelligence/audit.js';
import { executeTool } from '../server/intelligence/tools.js';
import { handleChatMessage } from '../server/intelligence/orchestrator.js';

test('Test A — Internal Intelligence Routing & Deterministic Knowledge', async (t) => {
  // 1. Investigation counts query -> Outcome A (Internal)
  const c1 = classifyIntent('How many investigations exist?');
  assert.equal(c1.outcome, ROUTING_OUTCOMES.OUTCOME_A_INTERNAL);
  assert.equal(c1.requiresClaude, false);
  assert.equal(c1.intent, INTENT_TYPES.INVESTIGATION_STATS);

  // 2. Application help query -> Outcome A (Internal)
  const c2 = classifyIntent('How does FaultLine work?');
  assert.equal(c2.outcome, ROUTING_OUTCOMES.OUTCOME_A_INTERNAL);
  assert.equal(c2.intent, INTENT_TYPES.APPLICATION_GUIDANCE);

  // 3. Knowledge Base Search
  const k1 = searchKnowledge('what is faultline');
  assert.ok(k1.content.includes('FaultLine is an enterprise-grade'));

  const k2 = searchKnowledge('how does the final claim decision work');
  assert.ok(k2.content.includes('APPROVE CLAIM'));
  assert.ok(k2.content.includes('REJECT CLAIM'));
  assert.ok(k2.content.includes('KEEP UNDER REVIEW'));
  assert.ok(k2.content.includes('Safeguard'));
});

test('Test B — Investigation Intelligence & Operational Metrics', async (t) => {
  const metrics = getInvestigationMetrics();
  assert.ok(metrics.total >= 266, 'Should index at least 266 scenarios');
  assert.ok(metrics.byIntent.genuine > 0, 'Genuine counts should be positive');
  assert.ok(metrics.byIntent.suspicious > 0, 'Suspicious counts should be positive');
  assert.ok(metrics.byIntent.staged > 0, 'Staged counts should be positive');
  assert.ok(metrics.byCountry.UK >= 17, 'UK scenarios should be indexed');

  // Lookup UK-001
  const uk001 = getInvestigationDetails('UK-001');
  assert.ok(uk001, 'UK-001 should exist');
  assert.equal(uk001.scenario.id, 'UK-001');
  assert.ok(uk001.caseFile.exhibits.length >= 2, 'UK-001 should have at least 2 exhibits');

  const summary = generateCaseSummary('UK-001');
  assert.ok(summary.includes('Investigation Dossier: UK-001'));
  assert.ok(summary.includes('Exhibit A'));
  assert.ok(summary.includes('Jurisdiction: UK'));
});

test('Test C — Evidence Intelligence & Entity Extraction', async (t) => {
  const sampleExhibits = [
    { label: 'Claimant Statement', kind: 'statement', text: 'I was driving my vehicle AB12 CDE at 30 mph on 14/05/2026. Damage was £2,500.' },
    { label: 'Telematics Log', kind: 'telematics', text: 'GPS recorded speed of 48 mph at 14:32:00. Bumper collision detected.' },
  ];

  const searchRes = searchExhibits(sampleExhibits, 'telematics');
  assert.equal(searchRes.matches.length, 1);
  assert.equal(searchRes.matches[0].exhibitId, 'B');

  const entities = extractFactualEntities(sampleExhibits);
  assert.ok(entities.speeds.some(s => s.includes('30 mph') || s.includes('48 mph')));
  assert.ok(entities.plates.some(p => p.includes('AB12 CDE')));
  assert.ok(entities.monetary.some(m => m.includes('£2,500') || m.includes('2,500')));

  const audit = auditEvidenceCompleteness(sampleExhibits);
  assert.ok(audit.present.some(p => p.includes('Telematics')));
  assert.ok(audit.missing.some(m => m.includes('Police')));
});

test('Test D — Legal Intelligence & Statutory Verification', async (t) => {
  const ukLaws = queryLegalIntelligence({ country: 'UK', limit: 2 });
  assert.equal(ukLaws.regulations.length, 2);
  assert.equal(ukLaws.regulations[0].countryCode, 'UK');
  assert.ok(ukLaws.regulations[0].legalReference.includes('Road Traffic Act'));
  assert.equal(ukLaws.regulations[0].status, 'VERIFIED');
  assert.ok(ukLaws.regulations[0].sourceUrl.startsWith('http'));

  const comparison = compareJurisdictions('UK', 'US');
  assert.equal(comparison.countryA.code, 'UK');
  assert.equal(comparison.countryB.code, 'US');
  assert.ok(comparison.countryA.statutesCount > 0);
  assert.ok(comparison.countryB.statutesCount > 0);
});

test('Test E — Workflow Intelligence & Verification Checklists', async (t) => {
  const sampleCase = {
    title: 'UK Roundabout Dispute',
    exhibits: [
      { label: 'Statement 1', text: 'Driver statement.' },
      { label: 'Statement 2', text: 'Insured statement.' },
    ],
  };

  const checklist = generateWorkflowChecklist({ caseFile: sampleCase });
  assert.ok(checklist.checklistItems.length >= 4);
  assert.ok(checklist.criticalGaps.length > 0, 'Should detect missing police/telematics');

  const notes = draftInvestigatorNotes({ caseFile: sampleCase });
  assert.ok(notes.includes('Investigator Field Case Note'));
  assert.ok(notes.includes('Exhibits Evaluated: 2 exhibits submitted'));
});

test('Test F — Conversation Memory & Active Context Preservation', async (t) => {
  const convId = `test-conv-${Date.now()}`;
  const s1 = getOrCreateConversation(convId, { activeCaseId: 'UK-001' });
  assert.equal(s1.activeCaseId, 'UK-001');

  appendMessage(convId, { role: 'user', content: 'Summarize UK-001' });
  appendMessage(convId, { role: 'assistant', content: 'Here is the summary' });

  // Second turn: does not mention UK-001, but context retains it
  const s2 = getOrCreateConversation(convId);
  assert.equal(s2.activeCaseId, 'UK-001');
  assert.equal(s2.messages.length, 2);

  clearConversation(convId);
  const s3 = getOrCreateConversation(convId);
  assert.equal(s3.messages.length, 0);
});

test('Test G — Security, Role Permissions & Secret Sanitization', async (t) => {
  // 1. Roles
  const investigator = resolveUserPermissions({ role: ROLES.INVESTIGATOR });
  assert.equal(investigator.canAccessEvidence, true);
  assert.equal(investigator.canModifyData, false);

  const manager = resolveUserPermissions({ role: ROLES.CLAIMS_MANAGER });
  assert.equal(manager.canModifyData, true);

  // 2. Sensitive confirmation guard
  assert.equal(requiresHumanConfirmation('UPDATE_INVESTIGATION_STATUS'), true);
  assert.equal(requiresHumanConfirmation('APPROVE_CLAIM'), true);
  assert.equal(requiresHumanConfirmation('SEARCH_INVESTIGATIONS'), false);

  // 3. Secrets Sanitization
  const responseWithSecret = 'The model result is sk-ant-api03-abcdef12345678901234567890 and Exhibit A is valid.';
  const val = validateResponse({ text: responseWithSecret, activeCase: { exhibits: [{ text: 'Ex A' }] } });
  assert.ok(!val.sanitizedText.includes('sk-ant-api03'), 'API key must be redacted');
  assert.ok(val.sanitizedText.includes('[REDACTED_API_KEY]'));

  // 4. Exhibit Hallucination Check
  const hallucinatedResp = 'According to Exhibit Z, the driver was speeding.';
  const val2 = validateResponse({ text: hallucinatedResp, activeCase: { exhibits: [{ text: 'Ex A' }] } });
  assert.equal(val2.citationsValid, false);
  assert.ok(val2.invalidExhibits.includes('Exhibit Z'));
});

test('Test H — Tool Registry Execution', async (t) => {
  const metricsResult = await executeTool('get_investigation_metrics');
  assert.ok(metricsResult.total >= 266);

  const searchResult = await executeTool('search_investigations', { query: 'UK-001' });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].id, 'UK-001');

  // Attempt state change without manager permissions
  await assert.rejects(
    async () => {
      await executeTool('request_case_action', { actionType: 'UPDATE_INVESTIGATION_STATUS', caseId: 'UK-001' }, { permissions: { canModifyData: false } });
    },
    /permission/i
  );
});

test('Test I — Full Orchestrator End-to-End Chat Flow (Outcome A & B Fallbacks)', async (t) => {
  // 1. Query: Stats (Outcome A - Internal Intelligence, 0 Claude tokens)
  const r1 = await handleChatMessage({
    message: 'How many investigations are under review?',
    conversationId: 'test-orchestrator',
  });
  assert.equal(r1.routingOutcome, ROUTING_OUTCOMES.OUTCOME_A_INTERNAL);
  assert.equal(r1.escalatedToClaude, false);
  assert.ok(r1.sources.includes('INTERNAL INTELLIGENCE'));
  assert.ok(r1.text.includes('FaultLine Investigation Operations Metrics'));

  // 2. Query: Scenario Lookup (Outcome A - Internal Database)
  const r2 = await handleChatMessage({
    message: 'Summarize UK-001',
    conversationId: 'test-orchestrator',
  });
  assert.equal(r2.routingOutcome, ROUTING_OUTCOMES.OUTCOME_A_INTERNAL);
  assert.equal(r2.activeCaseId, 'UK-001');
  assert.ok(r2.text.includes('Investigation Dossier: UK-001'));

  // 3. Query: Multi-turn Follow-up Context (Should retain UK-001)
  const r3 = await handleChatMessage({
    message: 'What evidence is missing?',
    conversationId: 'test-orchestrator',
  });
  assert.equal(r3.activeCaseId, 'UK-001');
  assert.ok(r3.text.includes('UK-001'));

  // 4. Query: Complex Reasoning without live provider (Outcome B with safe local fallback)
  const r4 = await handleChatMessage({
    message: 'Compare the witness statements and explain the contradiction',
    conversationId: 'test-orchestrator',
    getProvider: () => ({ configured: false }),
  });
  assert.equal(r4.routingOutcome, ROUTING_OUTCOMES.OUTCOME_B_HYBRID);
  assert.equal(r4.escalatedToClaude, false);
  assert.ok(r4.sources.includes('FALLBACK INTERNAL'));
  assert.ok(r4.text.includes('Investigation Dossier: UK-001') || r4.text.includes('Investigation Analysis'));

  // 5. Admin Metrics
  const admin = getAdminMetrics();
  assert.ok(admin.totalRequests >= 4);
  assert.ok(admin.internalAnswerPercentage !== undefined);
});

