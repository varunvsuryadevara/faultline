// FaultLineIntelligenceOrchestrator: Central coordinator for FaultLine Intelligence.
// Implements the master architectural principle:
// FAULTLINE NATIVE INTELLIGENCE FIRST -> LOCAL AI WHEN AVAILABLE -> CLAUDE SONNET WHEN NECESSARY -> GROUNDED VALIDATION.
//
// Provider-independent, explainable, secure, and 100% offline capable.

import { classifyIntent, INTENT_TYPES, ROUTING_OUTCOMES } from './intent.js';
import { getOrCreateConversation, appendMessage } from './context.js';
import { resolveUserPermissions } from './permissions.js';
import { searchKnowledge } from './knowledge.js';
import { getInvestigationMetrics, searchInvestigations, getInvestigationDetails, generateCaseSummary } from './investigation.js';
import { searchExhibits, auditEvidenceCompleteness, extractFactualEntities } from './evidence.js';
import { queryLegalIntelligence, compareJurisdictions } from './legal.js';
import { generateWorkflowChecklist, draftInvestigatorNotes } from './workflow.js';
import { escalateToClaude } from './escalation.js';
import { validateResponse } from './validator.js';
import { recordChatAudit } from './audit.js';
import { queryInvestigationRAG } from './rag.js';

// Native Intelligence Engines (Layer A: 100% Deterministic & Offline)
import { constructNativeTimeline } from './native/timeline.js';
import { detectNativeContradictions } from './native/contradiction.js';
import { detectNativeCorroborations } from './native/corroboration.js';
import { evaluateNativeRiskIndicators } from './native/risk.js';
import { evaluateInvestigationCompleteness } from './native/completeness.js';
import { evaluatePolicyCompliance } from './native/policy.js';
import { generateNativeInvestigationReport } from './native/report.js';
import { evaluateCompetingHypotheses } from './hypothesis.js';

// Local AI (Layer B) & Governed Self-Improvement
import { detectLocalAI, queryLocalAI } from './local.js';
import { discoverPatterns, listProposals, getActiveRules } from './builder.js';

export async function handleChatMessage({
  message,
  conversationId = 'default',
  activeCaseId = null,
  caseFile = null,
  user = {},
  getProvider = null,
  forceOffline = false,
  signal = null,
}) {
  const startTime = Date.now();
  const rawQuery = String(message || '').trim();

  if (!rawQuery) {
    return {
      text: 'Please provide an investigative question or request for FaultLine Intelligence.',
      sources: ['NATIVE INTELLIGENCE'],
      routingOutcome: ROUTING_OUTCOMES.NATIVE_ONLY,
      processingMode: 'OFFLINE_NATIVE',
      escalatedToClaude: false,
      usedLocalAI: false,
    };
  }

  // STEP 1 — PERMISSION VALIDATION
  const permissions = resolveUserPermissions(user);

  // STEP 2 — CONTEXT RESOLUTION & DOSSIER RECONSTRUCTION
  const session = getOrCreateConversation(conversationId, { activeCaseId, caseFile });
  const effectiveCaseId = activeCaseId || session.activeCaseId;
  const effectiveCaseFile = caseFile || session.activeCase;

  let activeDetails = null;
  if (effectiveCaseId && (!effectiveCaseFile || !effectiveCaseFile.exhibits)) {
    try {
      activeDetails = getInvestigationDetails(effectiveCaseId, user);
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        return {
          text: `### ⛔ Access Denied: Cross-Tenant Security Violation\n\nYou do not have authorization to access investigation **${effectiveCaseId}** as it belongs to a different organizational tenant. This security violation has been logged to the immutable audit trail.`,
          sources: ['SECURITY GATE'],
          routingOutcome: ROUTING_OUTCOMES.NATIVE_ONLY,
          processingMode: 'OFFLINE_NATIVE',
          escalatedToClaude: false,
          usedLocalAI: false,
          code: 'FORBIDDEN',
          status: 403,
        };
      }
      throw err;
    }
  }

  const currentCase = effectiveCaseFile || activeDetails?.caseFile || null;
  const currentScenario = activeDetails?.scenario || null;
  const exhibits = currentCase?.exhibits || [];

  // STEP 3 — HYBRID LOCAL RAG (BM25 Lexical + Entity Matching)
  let ragResults = null;
  if (exhibits.length > 0) {
    ragResults = queryInvestigationRAG(rawQuery, exhibits, { topK: 3 });
  }

  // STEP 4 — REQUEST INTENT CLASSIFICATION
  const classification = classifyIntent(rawQuery, {
    activeCaseId: effectiveCaseId,
    caseFile: currentCase,
  });

  const intent = classification.intent;
  let routingOutcome = forceOffline ? ROUTING_OUTCOMES.NATIVE_ONLY : classification.outcome;
  const toolsUsed = [];
  let responseText = '';
  const sources = [];
  let escalatedToClaude = false;
  let usedLocalAI = false;
  let tokens = null;
  let reasoningClassification = 'EXTRACTED FACT';
  let processingMode = 'OFFLINE_NATIVE';

  // Check Local AI Availability (Layer B: Ollama / LM Studio)
  const localAIStatus = forceOffline ? { available: false } : await detectLocalAI();

  // =========================================================================
  // PIPELINE BRANCH A: NATIVE DETERMINISTIC LOGIC (100% Offline Capable)
  // =========================================================================
  if (routingOutcome === ROUTING_OUTCOMES.OUTCOME_A_INTERNAL || routingOutcome === ROUTING_OUTCOMES.NATIVE_ONLY) {
    sources.push('INTERNAL INTELLIGENCE', 'NATIVE INTELLIGENCE');
    processingMode = 'OFFLINE_NATIVE';

    switch (intent) {
      // 1. Timeline Construction
      case INTENT_TYPES.TIMELINE_CONSTRUCTION: {
        toolsUsed.push('construct_native_timeline');
        sources.push('TIMELINE INTELLIGENCE');

        if (exhibits.length === 0) {
          responseText = `### Forensic Incident Timeline\n\nNo exhibits are currently loaded in the active workspace. Open a benchmark scenario (e.g. UK-001) or upload exhibits to reconstruct an event timeline.`;
        } else {
          const timeline = constructNativeTimeline(exhibits);
          reasoningClassification = timeline.hasTimestampConflicts ? 'POTENTIAL CONTRADICTION' : 'VERIFIED FACT';

          responseText = `### Forensic Event Timeline: ${currentCase.title || 'Active Investigation'} (${timeline.totalEvents} Key Events)\n\n`;
          if (timeline.events.length > 0) {
            timeline.events.forEach((ev) => {
              responseText += `• **[${ev.time || 'Time Unspecified'}] ${ev.eventType}** (\`${ev.classification}\`)\n` +
                `  - Source: ${ev.exhibitLabel} (${ev.kind})\n` +
                `  - Factual Snippet: *"${ev.snippet}"*\n` +
                (ev.speed ? `  - Recorded Speed: **${ev.speed}**\n` : '') +
                `\n`;
            });
          } else {
            responseText += `*No chronological date/time markers were identifiable in the current exhibit text.*\n\n`;
          }

          if (timeline.hasTimestampConflicts) {
            responseText += `\n#### ⚠ Conflicting Timestamp Analysis:\n`;
            timeline.conflictingTimestamps.forEach((tc) => {
              responseText += `• **${tc.id}:** ${tc.description} (\`${tc.verificationStatus}\`)\n`;
            });
          }

          if (timeline.timelineGaps.length > 0) {
            responseText += `\n#### 🔍 Custody & Timeline Gaps:\n`;
            timeline.timelineGaps.forEach((g) => {
              responseText += `• **${g.type}:** ${g.description} — *Action: ${g.recommendedAction}*\n`;
            });
          }
        }
        break;
      }

      // 2. Contradiction Detection
      case INTENT_TYPES.CONTRADICTION_DETECTION: {
        toolsUsed.push('detect_native_contradictions');
        sources.push('CONTRADICTION INTELLIGENCE');

        if (exhibits.length < 2) {
          responseText = `At least 2 exhibits are required to perform factual cross-examination. Current exhibits on file: ${exhibits.length}.`;
        } else {
          const result = detectNativeContradictions(exhibits);
          reasoningClassification = result.total > 0 ? 'POTENTIAL CONTRADICTION' : 'VERIFIED FACT';

          responseText = `### Native Cross-Examination Contradiction Audit (${result.total} Identified)\n\n`;
          if (result.total > 0) {
            result.contradictions.forEach((c) => {
              responseText += `#### Finding ${c.id}: ${c.type} (\`${c.severity}\`)\n` +
                `• **Conflict Summary:** ${c.description}\n` +
                `• **Primary Assertions:**\n` +
                `  - Source A (${c.sourceA}): "${c.quoteA || 'Recorded statement'}"\n` +
                `  - Source B (${c.sourceB}): "${c.quoteB || 'Recorded statement'}"\n` +
                `• **Verification Status:** \`${c.verificationStatus}\` | **Materiality:** \`${c.materiality}\`\n` +
                `• **Investigative Limitation:** ${c.limitations}\n` +
                `• **Recommended Action:** ${c.recommendedNextStep}\n\n`;
            });
          } else {
            responseText += `✔ **No direct factual contradictions identified.** Statements and telemetry exhibits appear aligned within standard variance.`;
          }
        }
        break;
      }

      // 3. Corroboration Detection
      case INTENT_TYPES.CORROBORATION_DETECTION: {
        toolsUsed.push('detect_native_corroborations');
        sources.push('CORROBORATION INTELLIGENCE');

        if (exhibits.length < 2) {
          responseText = `Corroboration requires at least two independent exhibits to compare against each other.`;
        } else {
          const result = detectNativeCorroborations(exhibits);
          reasoningClassification = 'POTENTIAL CORROBORATION';

          responseText = `### Evidence Corroboration Analysis (${result.total} Independent Alignments)\n\n`;
          if (result.total > 0) {
            result.corroborations.forEach((cb) => {
              responseText += `• **Corroborated Fact:** ${cb.fact}\n` +
                `  - Supporting Exhibits: ${cb.sources.join(', ')}\n` +
                `  - Source Independence: **${cb.isIndependent ? 'VERIFIED INDEPENDENT' : 'DEPENDENT (Cites shared source)'}**\n` +
                `  - Forensic Confidence: ${(cb.confidenceScore * 100).toFixed(0)}%\n` +
                `  - Notes / Limitations: *${cb.limitations}*\n\n`;
            });
          } else {
            responseText += `*No multi-source factual corroborations detected. The file currently relies on single-source assertions.*`;
          }
        }
        break;
      }

      // 4. Risk Analysis & Fraud Typologies
      case INTENT_TYPES.RISK_ANALYSIS: {
        toolsUsed.push('evaluate_native_risk_indicators');
        sources.push('RISK INTELLIGENCE');
        const result = evaluateNativeRiskIndicators(exhibits, currentCase?.context);
        reasoningClassification = result.hasCriticalRisk ? 'SUSPICIOUS INDICATOR' : 'VERIFIED FACT';

        responseText = `### Explainable Forensic Risk Indicators: Overall Risk \`${result.overallRisk}\`\n\n`;
        if (result.total > 0) {
          result.indicators.forEach((ri) => {
            responseText += `#### [${ri.severity}] ${ri.title} (\`${ri.id}\`)\n` +
              `• **Forensic Explanation:** ${ri.explanation}\n` +
              `• **Triggering Rule:** \`${ri.triggeringRule}\`\n` +
              `• **Triggering Exhibits:** ${ri.triggeringEvidence.join(', ')}\n` +
              `• **Fairness & Limitation Safeguard:** ${ri.limitations}\n` +
              `• **Required Follow-up:** ${ri.recommendedAction}\n\n`;
          });
          responseText += `\n*Rule: Under FaultLine's Bad-Faith Litigation Guard, suspicious risk indicators alone never constitute proof of fraud. Rejection requires objective physical proof.*`;
        } else {
          responseText += `✔ **No fraud or staged collision indicators triggered.** Baseline accident profile exhibits standard collision dynamics.`;
        }
        break;
      }

      // 5. Completeness Audit & Missing Evidence
      case INTENT_TYPES.COMPLETENESS_AUDIT: {
        toolsUsed.push('evaluate_investigation_completeness');
        sources.push('COMPLETENESS INTELLIGENCE');
        const result = evaluateInvestigationCompleteness(exhibits, currentCase?.context);
        reasoningClassification = result.isSufficientForDecision ? 'VERIFIED FACT' : 'MISSING INFORMATION';

        responseText = `### Investigation Completeness Audit for ${effectiveCaseId || currentCase?.title || 'Active Investigation'}: ${result.completenessRatio} (${result.completenessPercentage}%)\n\n` +
          `• **Decision Readiness:** ${result.isSufficientForDecision ? '✔ COMPLETE FOR HUMAN SIGN-OFF' : '⚠ INSUFFICIENT FILE (Gaps Exist)'}\n\n` +
          `#### Evidence Checklist Status:\n`;

        result.requirements.forEach((req) => {
          responseText += `[${req.status === 'PRESENT' ? '✔' : ' '}] **${req.item}** (\`${req.level}\` — \`${req.status}\`)\n    *${req.rationale}*\n\n`;
        });

        if (result.missingRequired.length > 0) {
          responseText += `**Mandatory Evidence Missing Before Final Decision:**\n` +
            result.missingRequired.map((m) => `• Request: **${m}**`).join('\n') + `\n\n`;
        }

        responseText += `*${result.safeguardNotice}*`;
        break;
      }

      // 6. Policy Intelligence & Coverage
      case INTENT_TYPES.POLICY_COMPLIANCE: {
        toolsUsed.push('evaluate_policy_compliance');
        sources.push('POLICY INTELLIGENCE');
        const result = evaluatePolicyCompliance(exhibits);

        responseText = `### Policy Condition & Warranty Audit (${result.totalClausesChecked} Conditions Reviewed)\n\n`;
        result.clauses.forEach((c) => {
          responseText += `• **${c.title}** (\`${c.clauseId}\`): **\`${c.status}\`**\n` +
            `  - Rule: ${c.rule}\n` +
            `  - Analysis: ${c.details}\n\n`;
        });

        if (result.hasCoverageQuestions) {
          responseText += `\n**Coverage Questions Raised for Underwriting:**\n`;
          result.coverageQuestions.forEach((q) => {
            responseText += `• **${q.title}:** ${q.details} (*${q.recommendedAction}*)\n`;
          });
        }
        break;
      }

      // 7. Report Generation (Native Offline)
      case INTENT_TYPES.REPORT_GENERATION: {
        toolsUsed.push('generate_native_investigation_report');
        sources.push('REPORT INTELLIGENCE', 'NATIVE INTELLIGENCE');
        const rep = generateNativeInvestigationReport({
          caseFile: currentCase || { title: 'Case ' + effectiveCaseId, exhibits: [] },
          scenario: currentScenario,
          jurisdiction: currentScenario?.country || 'UK',
        });
        responseText = rep.markdown;
        break;
      }

      // 8. Intelligence Builder & Self-Improvement
      case INTENT_TYPES.BUILDER_IMPROVEMENTS: {
        toolsUsed.push('intelligence_builder_status');
        sources.push('INTERNAL KNOWLEDGE', 'INTELLIGENCE BUILDER');
        const proposals = listProposals();
        const activeRules = getActiveRules();
        const patterns = discoverPatterns();

        responseText = `### FaultLine Intelligence Builder — Governed Self-Improvement\n\n` +
          `• **Active Governed Rules:** ${activeRules.length} versioned rules currently operating in Native Engine\n` +
          `• **Improvement Proposals:** ${proposals.length} structured proposals on file\n` +
          `• **Benchmark Scenarios Indexed:** ${patterns.scenariosAnalyzed} scenarios analyzed for pattern discovery\n\n` +
          `#### Active Versioned Rules:\n` +
          activeRules.map((r) => `• **${r.ruleId} (${r.version}):** *${r.title}*\n  Rule: "${r.ruleText}"\n  Activated by: ${r.activatedBy} on ${r.activatedAt.slice(0, 10)}`).join('\n\n') +
          `\n\n#### Latest Improvement Proposals Under Governance:\n` +
          proposals.map((p) => `• **${p.id}** — *${p.title}* (\`${p.approvalStatus}\` • Score: ${p.validationScore || 'Pending'}%)\n  Pattern: ${p.pattern.slice(0, 140)}...\n  False-Positive Risk: ${p.falsePositiveRisk}`).join('\n\n') +
          `\n\n*Strict Safety Constraint: The Intelligence Builder cannot rewrite source code or alter production claim decisions autonomously. All rules require human approval.*`;
        break;
      }

      // 9. Investigation Stats & Metrics
      case INTENT_TYPES.INVESTIGATION_STATS: {
        toolsUsed.push('get_investigation_metrics');
        sources.push('INTERNAL DATABASE');
        const metrics = getInvestigationMetrics();

        responseText = `### FaultLine Investigation Operations Metrics\n\n` +
          `• **Total Registered Investigations:** ${metrics.total} (${metrics.libraryTotal} benchmark library, ${metrics.customTotal} custom)\n` +
          `• **Forensic Disposition Breakdown:**\n` +
          `  - **Genuine Claims:** ${metrics.byIntent.genuine} claims (likely APPROVE)\n` +
          `  - **Suspicious Claims (Under Review):** ${metrics.byIntent.suspicious} claims (require manual forensic verification)\n` +
          `  - **Staged / Fabricated Fraud:** ${metrics.byIntent.staged} claims (verified fraud, grounds for REJECT)\n\n` +
          `• **Risk Distribution:**\n` +
          `  - Low Risk: ${metrics.byRisk.low} | Medium Risk: ${metrics.byRisk.medium} | High Risk: ${metrics.byRisk.high} | Critical Risk: ${metrics.byRisk.critical}\n\n` +
          `• **Top Jurisdictions:**\n` +
          Object.entries(metrics.byCountry).slice(0, 5).map(([c, count]) => `  - **${c}:** ${count} cases`).join('\n') +
          `\n\n*All statistics are generated directly from live indexed scenario records.*`;
        break;
      }

      // 10. Specific Investigation Lookup
      case INTENT_TYPES.INVESTIGATION_LOOKUP: {
        toolsUsed.push('search_investigations');
        sources.push('INTERNAL DATABASE');
        const targetId = classification.targetCaseId || effectiveCaseId;

        if (targetId) {
          responseText = generateCaseSummary(targetId);
          session.activeCaseId = targetId;
        } else if (/recent/i.test(rawQuery)) {
          const recentMatches = searchInvestigations('', 5);
          responseText = `### Recent Benchmark Investigations in FaultLine:\n\n` +
            recentMatches.map((m) => `• **${m.id}** — *${m.title}* (${m.country}, Risk: ${m.risk.toUpperCase()}, Category: ${m.category})`).join('\n') +
            `\n\n*Type "Summarize [ID]" (e.g. "Summarize UK-001") to inspect the complete exhibit dossier.*`;
        } else {
          const searchMatches = searchInvestigations(rawQuery, 4);
          if (searchMatches.length > 0) {
            responseText = `### Matching Investigations for "${rawQuery}":\n\n` +
              searchMatches.map((m) => `• **${m.id}** — *${m.title}* (${m.country}, Risk: ${m.risk.toUpperCase()})`).join('\n');
          } else {
            responseText = `No investigations found matching "${rawQuery}". Try specifying a known ID like **UK-001**, **US-010**, or **IN-001**.`;
          }
        }
        break;
      }

      // 11. Evidence Manifest & RAG Search
      case INTENT_TYPES.EVIDENCE_LOOKUP: {
        toolsUsed.push('search_evidence', 'query_evidence_rag');
        sources.push('EVIDENCE RETRIEVAL', 'HYBRID BM25 RAG');

        if (exhibits.length === 0) {
          responseText = `There are currently no exhibits loaded in the active case workspace. Open an investigation from the Scenario Library or create a new case to review evidence.`;
        } else {
          const searchRes = searchExhibits(exhibits, rawQuery.replace(/search|find|evidence|exhibits|for/gi, '').trim());
          const completeness = auditEvidenceCompleteness(exhibits);
          const entities = extractFactualEntities(exhibits);

          responseText = `### Evidence Manifest for Active Case (${exhibits.length} Exhibits)\n\n` +
            `• **Evidence Completeness:** ${completeness.completenessRatio} (${completeness.completenessPercentage}%)\n` +
            `• **Present Sources:** ${completeness.present.join(', ') || 'None'}\n` +
            `• **Missing Critical Evidence:** ${completeness.missing.join(', ') || 'None'}\n\n` +
            `#### Key Extracted Physical Entities:\n` +
            (entities.dates.length > 0 ? `• **Dates/Times:** ${entities.dates.slice(0, 4).join(', ')}\n` : '') +
            (entities.speeds.length > 0 ? `• **Speeds:** ${entities.speeds.join(', ')}\n` : '') +
            (entities.plates.length > 0 ? `• **Vehicle Plates:** ${entities.plates.join(', ')}\n` : '') +
            (entities.monetary.length > 0 ? `• **Amounts:** ${entities.monetary.join(', ')}\n\n` : '\n') +
            `#### Exhibits Matching Query:\n` +
            searchRes.matches.map((m) => `• **Exhibit ${m.exhibitId}** (${m.label} - ${m.kind}): *"${m.snippet}"*`).join('\n');
        }
        break;
      }

      // 12. Legal & Regulatory Lookup
      case INTENT_TYPES.LEGAL_LOOKUP: {
        toolsUsed.push('search_legal_regulations');
        sources.push('LEGAL LIBRARY');

        if (/compare/i.test(rawQuery)) {
          const compareRes = compareJurisdictions('UK', 'US');
          responseText = `### Cross-Jurisdiction Statutory Comparison: ${compareRes.countryA.name} vs ${compareRes.countryB.name}\n\n` +
            `• **${compareRes.countryA.name} (${compareRes.countryA.code}):** ${compareRes.countryA.legalSystem} framework with ${compareRes.countryA.statutesCount} pre-indexed verified statutes. Sample statutory anchor: *${compareRes.countryA.primarySample}*.\n\n` +
            `• **${compareRes.countryB.name} (${compareRes.countryB.code}):** ${compareRes.countryB.legalSystem} framework with ${compareRes.countryB.statutesCount} pre-indexed verified statutes. Sample statutory anchor: *${compareRes.countryB.primarySample}*.\n\n` +
            `*Full comparative matrix with all 20 jurisdictions is available on the dedicated Legal & Regulatory Library page.*`;
        } else {
          const countryMatch = rawQuery.match(/\b(UK|US|IN|CA|AU|DE|FR|SG|JP|AE|ZA|IE|NZ|BR|NG|KE|MY|NL|IT|ES)\b/i);
          const country = countryMatch ? countryMatch[1].toUpperCase() : (currentScenario?.country || 'UK');
          const cleanQ = rawQuery.replace(/regulations|laws|statutes|in|for|show|me/gi, '').trim();

          const legalRes = queryLegalIntelligence({ query: cleanQ, country, limit: 3 });
          if (legalRes.regulations.length > 0) {
            responseText = `### Verified Motor Insurance Regulations (${legalRes.country}):\n\n` +
              legalRes.regulations.map((r) =>
                `• **${r.legalReference}** — *${r.title}*\n` +
                `  - **Category:** ${r.category}\n` +
                `  - **Status:** \`${r.status}\` | **Authority:** ${r.authority}\n` +
                `  - **Requirement:** ${r.summary}\n` +
                `  - **Investigation Implications:** ${r.investigationImplications}\n` +
                `  - **Official Source:** [${r.sourceUrl}](${r.sourceUrl})`
              ).join('\n\n');
          } else {
            responseText = `No statutory records in the local library directly matched "${rawQuery}". The library holds 69 verified statutes across 20 jurisdictions.`;
          }
        }
        break;
      }

      // 13. Procedural Workflow, Action Packs & Statutory Deadlines
      case INTENT_TYPES.WORKFLOW_CHECKLIST: {
        toolsUsed.push('generate_workflow_checklist');
        sources.push('WORKFLOW INTELLIGENCE');
        const effectiveJur = currentScenario?.country || currentCase?.country || 'UK';
        const checklist = generateWorkflowChecklist({
          caseFile: currentCase,
          scenario: currentScenario,
          jurisdiction: effectiveJur,
        });

        responseText = `### Investigation Workflow & Prioritized Action Pack: ${checklist.investigationTitle}\n\n` +
          `• **Jurisdiction:** ${checklist.jurisdiction} | **Statutory Window:** ${checklist.statutoryDeadline?.statutoryWindow} (Deadline: **${checklist.statutoryDeadline?.deadlineDate}**, ${checklist.statutoryDeadline?.remainingDays} days remaining)\n` +
          `• **Governing Regulation:** *${checklist.statutoryDeadline?.regulation}*\n` +
          `• **Risk Classification:** ${checklist.riskClassification} | **Evidence Completeness:** ${checklist.evidenceCompletenessRatio} (${checklist.evidenceCompletenessPercentage}%)\n\n` +
          `#### 🎯 Prioritized Investigative Action Pack:\n`;

        checklist.prioritizedActions.forEach((act, idx) => {
          responseText += `**${idx + 1}. [${act.badge}] ${act.title}** (\`${act.assignedRole}\`)\n` +
            `   - Target: ${act.target}\n` +
            `   - Objective: *${act.objective}*\n` +
            `   - Due Date: \`${act.deadline}\`\n\n`;
        });

        responseText += `#### Baseline Procedural Checklist:\n` +
          checklist.checklistItems.map((item) => `[${item.status === 'COMPLETED' ? '✔' : ' '}] **${item.task}** (\`${item.status}\`)\n   ${item.details}`).join('\n\n') +
          (checklist.criticalGaps.length > 0 ? `\n\n**⚠ Critical Evidence Missing Before Decision:**\n` + checklist.criticalGaps.map((g) => `  - ${g}`).join('\n') : '') +
          `\n\n*Rule: Under FaultLine's forensic safeguards, missing evidence requires "KEEP UNDER REVIEW" rather than automatic claim rejection.*`;
        break;
      }

      // 14. Competing Hypothesis Workspace
      case INTENT_TYPES.COMPETING_HYPOTHESES: {
        toolsUsed.push('evaluate_competing_hypotheses');
        sources.push('HYPOTHESIS WORKSPACE');

        if (exhibits.length === 0) {
          responseText = `### Competing Hypothesis Workspace\n\nNo exhibits are currently loaded in the active workspace. Open a benchmark scenario (e.g. UK-001) or upload exhibits to evaluate competing explanations.`;
        } else {
          const evalResult = evaluateCompetingHypotheses(exhibits);
          reasoningClassification = 'STRUCTURED HYPOTHESIS COMPARISON';

          responseText = `### Competing Hypothesis Workspace (${evalResult.hypotheses.length} Explanations Evaluated)\n\n` +
            `• **Primary Supported Hypothesis:** \`${evalResult.primaryHypothesis.title}\` (Net Evidence Score: **${evalResult.primaryHypothesis.netEvidenceScore}**)\n` +
            `• **Viable Alternative:** \`${evalResult.competingAlternative.title}\` (Net Evidence Score: **${evalResult.competingAlternative.netEvidenceScore}**)\n\n` +
            `> *Forensic Summary:* ${evalResult.investigatorSummary}\n\n`;

          evalResult.hypotheses.forEach((hypo) => {
            responseText += `#### [${hypo.code}] ${hypo.title} — Status: \`${hypo.status}\` (Score: ${hypo.netEvidenceScore})\n` +
              `• *${hypo.description}*\n` +
              `• **Supporting Evidence (${hypo.supportingEvidence.length}):**\n` +
              (hypo.supportingEvidence.length > 0
                ? hypo.supportingEvidence.map((s) => `  - **Exhibit ${s.exhibitId}** (${s.label}): "${s.quote}" — *${s.rationale}*`).join('\n') + '\n'
                : '  - None identified.\n') +
              `• **Contradicting Evidence (${hypo.contradictingEvidence.length}):**\n` +
              (hypo.contradictingEvidence.length > 0
                ? hypo.contradictingEvidence.map((c) => `  - **Exhibit ${c.exhibitId}** (${c.label}): "${c.quote}" — *${c.rationale}*`).join('\n') + '\n'
                : '  - None identified.\n') +
              `• **Decisive Discriminators:**\n` +
              hypo.discriminators.map((d) => `  - 🔬 ${d}`).join('\n') + '\n\n';
          });

          responseText += `\n*${evalResult.safeguardNotice}*`;
        }
        break;
      }

      // 14. Application Guidance & Docs
      case INTENT_TYPES.APPLICATION_GUIDANCE:
      default: {
        const fallback = searchKnowledge(rawQuery);
        responseText = fallback.content;
        break;
      }
    }
  }

  // =========================================================================
  // PIPELINE BRANCH B: LOCAL AI FIRST -> CLAUDE HYBRID -> SAFE NATIVE FALLBACK
  // =========================================================================
  else if (routingOutcome === ROUTING_OUTCOMES.OUTCOME_B_HYBRID || routingOutcome === ROUTING_OUTCOMES.HYBRID) {
    sources.push('INTERNAL RETRIEVAL', 'HYBRID BM25 RAG');
    const provider = getProvider ? getProvider() : null;

    // Build grounded RAG context for prompt grounding
    const ragContext = ragResults?.contextSnippet
      ? `### RETRIEVED FORENSIC CASE EVIDENCE (BM25 Grounded Passages):\n${ragResults.contextSnippet}\n\n`
      : '';

    // 1. ATTEMPT LOCAL AI FIRST (100% Offline Capable)
    if (localAIStatus.available) {
      sources.push('LOCAL AI', `LOCAL MODEL: ${localAIStatus.defaultModel || 'Ollama'}`);
      processingMode = 'LOCAL_AI';

      const localPrompt = `${ragContext}` +
        `User Investigation Request:\n${rawQuery}\n\n` +
        `Active Case Overview:\n${generateCaseSummary(currentScenario || currentCase || effectiveCaseId)}\n\n` +
        `Instructions: Ground your response strictly in the provided evidence. Cite exact exhibits (e.g. Exhibit A, Exhibit B) with verbatim phrases. Frame your assessment as objective decision support for the claims handler.`;

      const localResult = await queryLocalAI({
        prompt: localPrompt,
        conversationHistory: session.messages.slice(-4),
        signal,
      });

      if (localResult.success && localResult.text.trim()) {
        usedLocalAI = true;
        responseText = localResult.text;
      } else {
        // Fall back gracefully
        usedLocalAI = false;
      }
    }

    // 2. ATTEMPT EXTERNAL CLAUDE IF CONFIGURED (Hybrid Mode)
    if (!usedLocalAI && provider && provider.configured) {
      escalatedToClaude = true;
      processingMode = 'HYBRID';
      sources.push('CLAUDE SONNET', 'CLOUD REASONING');

      const legalContext = queryLegalIntelligence({
        country: currentScenario?.country || 'UK',
        limit: 2,
      });

      const escalationResult = await escalateToClaude({
        provider,
        userMessage: `${ragContext}${rawQuery}`,
        intent,
        activeCase: currentCase,
        scenario: currentScenario,
        regulations: legalContext.regulations,
        conversationHistory: session.messages,
        signal,
      });

      if (escalationResult.success) {
        responseText = escalationResult.text;
        tokens = escalationResult.tokens;
        sources.push('VALIDATED CITATIONS');
      } else {
        // Fall back to safe Native Report
        sources.push('NATIVE INTELLIGENCE (FALLBACK)');
        processingMode = 'OFFLINE_NATIVE';
        responseText = `### Advanced AI Reasoning Temporarily Unavailable\n\n` +
          `*Note: The AI escalation encountered an issue (${escalationResult.error}). Operating seamlessly in Native Intelligence mode without interruption.*\n\n` +
          generateCaseSummary(currentScenario || currentCase || effectiveCaseId);
      }
    } else if (!usedLocalAI) {
      // 3. 100% OFFLINE NATIVE FALLBACK (Zero Cloud Data Egress)
      sources.push('FALLBACK INTERNAL', 'NATIVE INTELLIGENCE (OFFLINE MODE)');
      processingMode = 'OFFLINE_NATIVE';
      const nativeRep = generateNativeInvestigationReport({
        caseFile: currentCase || { title: 'Case ' + effectiveCaseId, exhibits: [] },
        scenario: currentScenario,
        jurisdiction: currentScenario?.country || 'UK',
      });
      responseText = `### Investigation Analysis (Native Intelligence Engine)\n\n` +
        `*Notice: Operating 100% offline using FaultLine's deterministic forensic engine with zero data egress.*\n\n` +
        nativeRep.markdown;
    }
  }

  // =========================================================================
  // PIPELINE BRANCH C: STATUTORY RESEARCH DISCLOSURE
  // =========================================================================
  else {
    sources.push('LEGAL LIBRARY', 'PARTIALLY VERIFIED');
    processingMode = 'OFFLINE_NATIVE';
    responseText = `### Statutory Intelligence Scope & Verification Disclosure\n\n` +
      `FaultLine maintains **69 verified statutory records across 20 jurisdictions** (including the UK Road Traffic Act 1988, California Insurance Code § 1871.4, Indian Motor Vehicles Act 1988/2019, Spanish Baremo Ley 35/2015, and French Loi Badinter).\n\n` +
      `**Limitation Note:** The native engine does not fabricate unverified legal amendments. All legal requirements displayed in FaultLine are cross-referenced directly against official legislative registries.`;
  }

  // STEP 7 — RESPONSE VALIDATION (quote checking, secret protection, grounding score)
  const validation = validateResponse({
    text: responseText,
    activeCase: currentCase,
  });

  const durationMs = Date.now() - startTime;

  // STEP 8 — RESPONSE & AUDIT RECORDING
  appendMessage(conversationId, {
    role: 'user',
    content: rawQuery,
  });

  appendMessage(conversationId, {
    role: 'assistant',
    content: validation.sanitizedText,
    sources,
    intent,
    outcome: routingOutcome,
    processingMode,
    escalatedToClaude,
    usedLocalAI,
    groundingScore: validation.groundingScore,
    reasoningClassification,
    durationMs,
  });

  recordChatAudit({
    conversationId,
    intent,
    outcome: routingOutcome,
    escalatedToClaude,
    usedLocalAI,
    processingMode,
    escalationReason: classification.reason,
    durationMs,
    tokens,
    toolsUsed,
    groundingScore: validation.groundingScore,
  });

  return {
    conversationId,
    text: validation.sanitizedText,
    sources,
    intent,
    routingOutcome,
    processingMode,
    escalatedToClaude,
    usedLocalAI,
    reasoningClassification,
    durationMs,
    tokens,
    validation,
    activeCaseId: session.activeCaseId,
  };
}
