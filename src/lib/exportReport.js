import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { computeClaimDecision, DECISION_OUTCOMES, DECISION_LABELS } from '../../shared/decision.js';
import { EXHIBIT_KINDS } from '../../shared/constants.js';
import { CATEGORY_LABEL, SEVERITY_LABEL, prettyModel } from './format.js';
import { consistencyScore } from './score.js';
import { getRelevantRegulationsForCase } from '../../shared/regulations/query.js';

const KIND_LABELS = Object.fromEntries(EXHIBIT_KINDS.map((k) => [k.value, k.label]));
const MATCH_LABELS = { exact: 'verified word for word', close: 'close match', missing: 'not found in exhibit' };
const REVIEW_LABELS = { confirmed: 'Confirmed by reviewer', dismissed: 'Dismissed by reviewer' };

export const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'case';

/**
 * Normalizes all possible inputs (from cross-examination Findings, ScenarioAssessment,
 * raw case files, or predefined library scenarios) into a unified dataset.
 */
export function normalizeReportData({
  title = 'Untitled Case',
  context = '',
  scenarioId: propScenarioId = null,
  result = null,
  review = {},
  decision: providedDecision = null,
  caseFile = null,
  scenario = null,
  reviewerNotes = null,
  isReviewed = null,
  reviewerName = null,
  reviewedAt = null,
} = {}) {
  const scenarioTitle = scenario?.title || title || 'Untitled Case';
  const scenarioId = propScenarioId || scenario?.id || providedDecision?.investigation_id || caseFile?.id || (title?.match(/^[A-Z]{2}-\d{3}/i) ? title.match(/^[A-Z]{2}-\d{3}/i)[0].toUpperCase() : null);
  const scenarioContext = context || scenario?.case?.context || caseFile?.context || '';
  const jurisdiction = scenario?.country || caseFile?.country || 'UK / Cross-Jurisdiction';
  const claimType = scenario?.category || scenario?.claimType || caseFile?.category || 'Motor Comprehensive';

  // Extract exhibits
  const rawExhibits =
    result?.meta?.exhibits ||
    caseFile?.exhibits ||
    scenario?.case?.exhibits ||
    [];

  const exhibits = rawExhibits.map((e, idx) => ({
    id: e.id || String.fromCharCode(65 + idx),
    label: e.label || `Exhibit ${String.fromCharCode(65 + idx)}`,
    kind: e.kind || 'statement',
    text: e.text || e.rawText || '',
  }));

  // Resolve or compute decision
  const decision =
    providedDecision ||
    computeClaimDecision({
      analysis: result?.contradictions ? result : undefined,
      assessment: result?.intent ? result : undefined,
      caseFile: caseFile || { title: scenarioTitle, context: scenarioContext, exhibits },
      scenario,
      review,
    });

  // Cross-examination analysis fields
  const contradictions = Array.isArray(result?.contradictions) ? result.contradictions : [];
  const timeline = Array.isArray(result?.timeline) ? result.timeline : [];
  const corroborations = Array.isArray(result?.corroborations) ? result.corroborations : [];
  const gaps = Array.isArray(result?.gaps) ? result.gaps : [];
  const nextSteps = Array.isArray(result?.nextSteps) ? result.nextSteps : [];

  // Triage assessment fields
  const supporting = Array.isArray(result?.supporting) ? result.supporting : [];
  const against = Array.isArray(result?.against) ? result.against : [];
  const indicators = Array.isArray(result?.indicators) ? result.indicators : [];
  const missing = Array.isArray(result?.missing) ? result.missing : [];
  const questions = Array.isArray(result?.questions) ? result.questions : [];

  const quoteCheck = result?.quoteCheck || { exact: 0, total: 0, close: 0, missing: 0 };
  const model = result?.meta?.model ? prettyModel(result.meta.model) : 'FaultLine AI Forensic Engine';
  const generatedAt = result?.meta?.generatedAt || new Date().toISOString();

  // Consistency score calculation if contradictions exist
  let score = null;
  let verdict = null;
  if (contradictions.length > 0) {
    const scored = consistencyScore(contradictions, review);
    score = scored.score;
    verdict = scored.verdict;
  }

  // Resolve applicable statutory regulations
  const countryCode =
    scenario?.country ||
    caseFile?.country ||
    (scenarioId?.match(/^[A-Z]{2}/) ? scenarioId.match(/^[A-Z]{2}/)[0].toUpperCase() : 'UK');

  const matchedRegs = getRelevantRegulationsForCase({
    country: countryCode,
    category: claimType,
    claimType,
    tags: scenario?.tags || caseFile?.tags || [],
    context: scenarioContext,
    title: scenarioTitle,
  });

  const applicableRegulations =
    Array.isArray(providedDecision?.applicableRegulations) && providedDecision.applicableRegulations.length > 0
      ? providedDecision.applicableRegulations
      : matchedRegs.map((m) => m.regulation);

  const finalReviewerNotes = reviewerNotes || providedDecision?.reviewerNotes || {};
  const finalIsReviewed = isReviewed ?? providedDecision?.isReviewed ?? false;
  const finalReviewerName = reviewerName || providedDecision?.reviewerName || 'Senior Claims Reviewer';
  const finalReviewedAt = reviewedAt || providedDecision?.reviewedAt || null;

  return {
    scenarioId,
    title: scenarioTitle,
    context: scenarioContext,
    jurisdiction,
    claimType,
    decision,
    contradictions,
    timeline,
    corroborations,
    gaps,
    nextSteps,
    supporting,
    against,
    indicators,
    missing,
    questions,
    quoteCheck,
    model,
    generatedAt,
    exhibits,
    review,
    score,
    verdict,
    scenario,
    applicableRegulations,
    reviewerNotes: finalReviewerNotes,
    isReviewed: finalIsReviewed,
    reviewerName: finalReviewerName,
    reviewedAt: finalReviewedAt,
  };
}

/**
 * Standardized filename generation according to specification:
 * e.g., FaultLine_Investigation_UK-001.txt, .pdf, .docx, .md
 */
export function getReportFilename(data, ext) {
  const norm = data.decision ? data : normalizeReportData(data);
  const identifier = norm.scenarioId ? norm.scenarioId : slug(norm.title);
  return `FaultLine_Investigation_${identifier}.${ext.replace(/^\./, '')}`;
}

// ---------------------------------------------------------------------------
// 1. PLAIN TEXT EXPORT (.TXT)
// ---------------------------------------------------------------------------
export function generatePlainTextReport(rawInput) {
  const d = normalizeReportData(rawInput);
  const dateStr = new Date(d.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sep = '='.repeat(80);
  const subSep = '-'.repeat(80);
  const lines = [];

  lines.push(sep);
  lines.push('FAULTLINE FORENSIC INVESTIGATION REPORT');
  lines.push(sep);
  lines.push(`Investigation ID:  ${d.scenarioId || 'N/A'}`);
  lines.push(`Claim Reference:   ${d.title}`);
  lines.push(`Jurisdiction:      ${d.jurisdiction}`);
  lines.push(`Claim Category:    ${d.claimType}`);
  lines.push(`Generated:         ${dateStr}`);
  lines.push(`Platform Engine:   ${d.model}`);
  if (d.score !== null) {
    lines.push(`Consistency Score: ${d.score}/100 (${d.verdict})`);
  }
  lines.push(subSep);
  lines.push('CASE CONTEXT & CIRCUMSTANCES:');
  lines.push(d.context ? d.context : 'No additional incident context provided.');
  lines.push('');

  // 1. FINAL CLAIM DECISION
  lines.push(sep);
  lines.push('1. FINAL CLAIM DECISION & RECOMMENDATION');
  lines.push(sep);
  lines.push(`RECOMMENDED OUTCOME:      ${d.decision.decision_label}`);
  lines.push(`AI ASSESSMENT CONFIDENCE: ${d.decision.confidence}/100`);
  lines.push(`CONFIDENCE EXPLANATION:   ${d.decision.confidence_explanation}`);
  lines.push(`RISK LEVEL:               ${d.decision.risk_level}`);
  lines.push(`INVESTIGATION COMPLETION: ${d.decision.investigation_completeness}%`);
  lines.push(`SUPPORTING FINDINGS:      ${d.decision.supporting_count ?? (d.decision.supporting_evidence?.length || 0)}`);
  lines.push(`ACTIVE CONTRADICTIONS:    ${d.decision.contradictions_count ?? (d.decision.unresolved_issues?.length || 0)}`);
  lines.push(`UNRESOLVED ISSUES:        ${d.decision.unresolved_count ?? ((d.decision.unresolved_issues?.length || 0) + (d.decision.missing_evidence?.length || 0))}`);
  if (d.decision.review_priority) {
    lines.push(`REVIEW PRIORITY:          ${d.decision.review_priority}`);
  }
  lines.push('');
  lines.push('WHY THIS DECISION? (DETAILED EXPLANATION):');
  lines.push(d.decision.decision_explanation || d.decision.executive_summary);
  lines.push('');
  lines.push('KEY REASONS FOR RECOMMENDATION:');
  (d.decision.key_reasons || d.decision.decision_rationale || []).forEach((r, idx) => {
    lines.push(`  ${idx + 1}. ${r}`);
  });
  if (d.decision.what_could_change_decision?.length) {
    lines.push('');
    lines.push('WHAT COULD CHANGE THE DECISION:');
    d.decision.what_could_change_decision.forEach((c) => {
      lines.push(`  • [${c.path || c.outcome}] ${c.condition}: ${c.details}`);
    });
  }
  if (d.decision.policy_coverage_notes) {
    lines.push('');
    lines.push(`POLICY & COVERAGE NOTES: ${d.decision.policy_coverage_notes}`);
  }
  lines.push('');

  // APPLICABLE STATUTORY & REGULATORY CONTEXT
  if (d.applicableRegulations?.length) {
    lines.push(sep);
    lines.push('APPLICABLE STATUTORY & REGULATORY CONTEXT');
    lines.push(sep);
    lines.push(`Jurisdiction: ${d.jurisdiction}`);
    if (d.decision.legalDecisionImpact?.affectingParagraph) {
      lines.push('');
      lines.push('HOW APPLICABLE RULES AFFECT THIS DECISION:');
      lines.push(d.decision.legalDecisionImpact.affectingParagraph);
    }
    if (d.decision.legalDecisionImpact?.considerations?.length) {
      lines.push('');
      lines.push('LEGAL & REGULATORY CONSIDERATIONS:');
      d.decision.legalDecisionImpact.considerations.forEach((c) => {
        lines.push(`  • ${c}`);
      });
    }
    lines.push('');
    d.applicableRegulations.forEach((reg, idx) => {
      lines.push(`[STATUTE ${idx + 1}] ${reg.title}`);
      lines.push(`  Citation:       ${reg.legalReference}`);
      lines.push(`  Authority:      ${reg.authority} (${reg.status || 'VERIFIED'})`);
      if (reg.assessmentStatus) {
        lines.push(`  Compliance:     ${reg.assessmentStatus}`);
      }
      lines.push(`  Legal Summary:  ${reg.summary}`);
      if (reg.whatRuleRequires && reg.whatRuleRequires !== reg.summary) {
        lines.push(`  Rule Mandate:   ${reg.whatRuleRequires}`);
      }
      if (reg.evidenceAvailable?.length) {
        lines.push(`  Evidence Proof: ${Array.isArray(reg.evidenceAvailable) ? reg.evidenceAvailable.join('; ') : reg.evidenceAvailable}`);
      }
      if (reg.evidenceGap) {
        lines.push(`  Evidence Gap:   ${reg.evidenceGap}`);
      }
      if (reg.claimsImplications) {
        lines.push(`  Claims Impact:  ${reg.claimsImplications}`);
      }
      if (reg.investigationImplications || reg.investigationImplication) {
        lines.push(`  Audit Check:    ${reg.investigationImplications || reg.investigationImplication}`);
      }
      if (d.reviewerNotes && d.reviewerNotes[reg.id]) {
        lines.push(`  Reviewer Note:  ${d.reviewerNotes[reg.id]}`);
      }
      if (reg.sourceUrl) lines.push(`  Official Link:  ${reg.sourceUrl}`);
      lines.push('');
    });
  }

  // HUMAN CLAIMS REVIEWER WORKSPACE & SIGN-OFF
  if (d.isReviewed || d.reviewerNotes?.global) {
    lines.push(sep);
    lines.push('HUMAN CLAIMS REVIEWER WORKSPACE & SIGN-OFF');
    lines.push(sep);
    lines.push(`Review Status:     ${d.isReviewed ? 'REVIEW COMPLETED & SIGNED OFF' : 'PENDING HUMAN REVIEW'}`);
    if (d.reviewerName) lines.push(`Reviewer Identity: ${d.reviewerName}`);
    if (d.reviewedAt) lines.push(`Timestamp:         ${new Date(d.reviewedAt).toLocaleString()}`);
    if (d.reviewerNotes?.global) {
      lines.push('');
      lines.push('INVESTIGATOR FINAL NOTES:');
      lines.push(d.reviewerNotes.global);
    }
    lines.push('');
  }

  // 2. PRIORITIZED ACTION PLAN
  if (d.decision.recommended_actions?.length) {
    lines.push(sep);
    lines.push('2. PRIORITIZED REVIEW ACTION PLAN');
    lines.push(sep);
    d.decision.recommended_actions.forEach((act) => {
      lines.push(`[PRIORITY ${act.priority}] ${act.issue}`);
      lines.push(`  Action Required:   ${act.action}`);
      lines.push(`  Responsible Party: ${act.responsibleParty}`);
      lines.push(`  Evidence Needed:   ${act.evidenceNeeded}`);
      lines.push(`  Expected Outcome:  ${act.expectedOutcome}`);
      lines.push(`  Decision Impact:   ${act.impactOnDecision}`);
      lines.push('');
    });
  }

  // 3. INVESTIGATION FINDINGS & EVIDENCE CLASSIFICATION
  lines.push(sep);
  lines.push('3. EVIDENCE ANALYSIS & FINDINGS CLASSIFICATION');
  lines.push(sep);

  lines.push('[VERIFIED FACTS & INDEPENDENT CORROBORATIONS]');
  if (d.decision.verified_facts?.length) {
    d.decision.verified_facts.forEach((vf, i) => {
      lines.push(`  ${i + 1}. ${vf.statement} (Source: ${vf.source})`);
    });
  } else if (d.corroborations.length) {
    d.corroborations.forEach((cb, i) => {
      lines.push(`  ${i + 1}. ${cb.fact} (Corroborated by: ${cb.exhibits.join(', ')})`);
    });
  } else {
    lines.push('  No independently corroborated facts recorded.');
  }
  lines.push('');

  lines.push('[EVIDENCE SUPPORTING APPROVAL]');
  if (d.decision.supporting_evidence?.length) {
    d.decision.supporting_evidence.forEach((s) => {
      lines.push(`  - Exhibit ${s.exhibit}: ${s.statement || s.finding} [${s.reliability}]`);
      if (s.quote) lines.push(`    Verbatim quote: "${s.quote}"`);
    });
  } else if (d.supporting.length) {
    d.supporting.forEach((s) => {
      lines.push(`  - Exhibit ${s.exhibit}: ${s.point}`);
      if (s.quote) lines.push(`    Verbatim quote: "${s.quote}"`);
    });
  } else {
    lines.push('  None identified.');
  }
  lines.push('');

  lines.push('[EVIDENCE OPPOSING CLAIM / CONTRADICTING]');
  if (d.decision.contradicting_evidence?.length) {
    d.decision.contradicting_evidence.forEach((c) => {
      lines.push(`  - Exhibit ${c.exhibit}: ${c.finding || c.name} [${c.reliability}]`);
      if (c.quote) lines.push(`    Verbatim quote: "${c.quote}"`);
    });
  } else if (d.against.length) {
    d.against.forEach((c) => {
      lines.push(`  - Exhibit ${c.exhibit}: ${c.point}`);
      if (c.quote) lines.push(`    Verbatim quote: "${c.quote}"`);
    });
  } else {
    lines.push('  None identified.');
  }
  lines.push('');

  lines.push('[SUSPICIOUS INDICATORS & WARNING SIGNS]');
  if (d.decision.suspicious_indicators?.length) {
    d.decision.suspicious_indicators.forEach((si) => {
      lines.push(`  - ${si.indicator} (${si.weight} weight)`);
    });
  } else if (d.indicators.length) {
    d.indicators.forEach((si) => {
      lines.push(`  - ${si.point} (${si.weight} weight)`);
    });
  } else {
    lines.push('  No suspicious indicators detected.');
  }
  lines.push('');

  // 4. DETAILED CONTRADICTIONS
  lines.push(sep);
  lines.push('4. IDENTIFIED CONFLICTS & CONTRADICTIONS');
  lines.push(sep);
  if (d.contradictions.length) {
    d.contradictions.forEach((c) => {
      const status = d.review[c.id] ? `[${REVIEW_LABELS[d.review[c.id]] || d.review[c.id]}]` : '[UNRESOLVED]';
      lines.push(`### ${c.id}: ${c.title} ${status}`);
      lines.push(`Severity:   ${SEVERITY_LABEL[c.severity] || c.severity} | Category: ${CATEGORY_LABEL[c.category] || c.category}`);
      lines.push(`Confidence: ${Math.round(c.confidence * 100)}%`);
      lines.push(`Summary:    ${c.explanation}`);
      lines.push('Quotes cited:');
      (c.evidence || []).forEach((ev) => {
        lines.push(`  * Exhibit ${ev.exhibit}: "${ev.quote}" (${MATCH_LABELS[ev.match?.status] || 'cited'})`);
      });
      if (c.innocentExplanation) {
        lines.push(`Possible Innocent Explanation: ${c.innocentExplanation}`);
      }
      if (c.followUp?.question) {
        lines.push(`Recommended Follow-up (${c.followUp.ask || 'Investigator'}): ${c.followUp.question}`);
      }
      lines.push('');
    });
  } else {
    lines.push('No material contradictions detected across submitted accounts.');
    lines.push('');
  }

  // 5. TIMELINE RECONSTRUCTION
  if (d.timeline.length) {
    lines.push(sep);
    lines.push('5. CHRONOLOGICAL TIMELINE RECONSTRUCTION');
    lines.push(sep);
    d.timeline.forEach((t) => {
      lines.push(`[${t.time || 'Time Unknown'}] ${t.event}`);
      lines.push(`  Sources: Exhibits ${t.exhibits.join(', ')} | Status: ${t.status}`);
    });
    lines.push('');
  }

  // 6. MISSING EVIDENCE & GAPS
  lines.push(sep);
  lines.push('6. UNRESOLVED ISSUES & MISSING EVIDENCE');
  lines.push(sep);
  const missingItems = [
    ...(d.decision.missing_evidence || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.missing || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.gaps || []).map((g) => `${g.gap} (Request: ${g.request || 'Collect documentation'})`),
  ];
  if (missingItems.length) {
    missingItems.forEach((m, idx) => {
      lines.push(`  ${idx + 1}. ${m}`);
    });
  } else {
    lines.push('No critical evidentiary gaps or missing items reported.');
  }
  lines.push('');

  // 7. EVIDENCE INVENTORY
  lines.push(sep);
  lines.push('7. EVIDENCE INVENTORY');
  lines.push(sep);
  d.exhibits.forEach((e) => {
    lines.push(`Exhibit ${e.id}: ${e.label} [${KIND_LABELS[e.kind] || e.kind}]`);
  });
  lines.push('');

  // DISCLAIMER
  lines.push(sep);
  lines.push('HUMAN REVIEW & STATUTORY DISCLAIMER');
  lines.push(sep);
  lines.push('IMPORTANT: AI-assisted recommendation requiring authorized human claims handler review.');
  lines.push('FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies');
  lines.push('to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be');
  lines.push('authorized by a licensed claims professional.');
  lines.push(sep);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. MARKDOWN EXPORT (.MD)
// ---------------------------------------------------------------------------
export function generateMarkdownReport(rawInput) {
  const d = normalizeReportData(rawInput);
  const dateStr = new Date(d.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [];
  lines.push('# FaultLine Investigation Report');
  lines.push('');
  lines.push('## Investigation Details');
  lines.push('');
  lines.push(`- **Investigation ID:** ${d.scenarioId || 'N/A'}`);
  lines.push(`- **Claim Reference:** ${d.title}`);
  lines.push(`- **Jurisdiction:** ${d.jurisdiction}`);
  lines.push(`- **Claim Category:** ${d.claimType}`);
  lines.push(`- **Generated At:** ${dateStr}`);
  lines.push(`- **Platform Engine:** ${d.model}`);
  if (d.score !== null) {
    lines.push(`- **Consistency Score:** ${d.score}/100 (${d.verdict})`);
  }
  if (d.context) {
    lines.push('');
    lines.push(`**Case Context:** ${d.context}`);
  }
  lines.push('');

  // Final Decision
  lines.push('## Final Decision');
  lines.push('');
  lines.push(`### Recommended Outcome: **${d.decision.decision_label}**`);
  lines.push('');
  lines.push(`- **AI Assessment Confidence:** ${d.decision.confidence}/100`);
  lines.push(`  _${d.decision.confidence_explanation}_`);
  lines.push(`- **Risk Level:** ${d.decision.risk_level}`);
  lines.push(`- **Investigation Completeness:** ${d.decision.investigation_completeness}%`);
  lines.push(`- **Supporting Findings:** ${d.decision.supporting_count ?? (d.decision.supporting_evidence?.length || 0)}`);
  lines.push(`- **Active Contradictions:** ${d.decision.contradictions_count ?? (d.decision.unresolved_issues?.length || 0)}`);
  lines.push(`- **Unresolved Issues:** ${d.decision.unresolved_count ?? ((d.decision.unresolved_issues?.length || 0) + (d.decision.missing_evidence?.length || 0))}`);
  if (d.decision.review_priority) {
    lines.push(`- **Review Priority:** ${d.decision.review_priority}`);
  }
  lines.push('');

  // Why This Decision?
  lines.push('## Why This Decision?');
  lines.push('');
  lines.push(d.decision.decision_explanation || d.decision.executive_summary);
  lines.push('');

  // Key Reasons
  lines.push('## Key Reasons for Recommendation');
  lines.push('');
  (d.decision.key_reasons || d.decision.decision_rationale || []).forEach((r) => {
    lines.push(`- ${r}`);
  });
  lines.push('');

  // What Could Change the Decision
  if (d.decision.what_could_change_decision?.length) {
    lines.push('## What Could Change the Decision?');
    lines.push('');
    d.decision.what_could_change_decision.forEach((c) => {
      lines.push(`- **${c.path || c.outcome}** — _${c.condition}_: ${c.details}`);
    });
    lines.push('');
  }

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(d.decision.executive_summary);
  lines.push('');

  // Decision Rationale
  lines.push('## Final Decision Rationale');
  lines.push('');
  (d.decision.decision_rationale || []).forEach((r) => {
    lines.push(`- ${r}`);
  });
  if (d.decision.policy_coverage_notes) {
    lines.push('');
    lines.push(`> **Policy & Coverage Note:** ${d.decision.policy_coverage_notes}`);
  }
  lines.push('');

  // Applicable Statutory & Regulatory Context
  if (d.applicableRegulations?.length) {
    lines.push('## Applicable Statutory & Regulatory Context');
    lines.push('');
    lines.push(`This claim is evaluated under the statutory motor insurance framework of **${d.jurisdiction}**:`);
    lines.push('');
    if (d.decision.legalDecisionImpact?.affectingParagraph) {
      lines.push('### How Applicable Rules Affect This Decision');
      lines.push('');
      lines.push(d.decision.legalDecisionImpact.affectingParagraph);
      lines.push('');
    }
    if (d.decision.legalDecisionImpact?.considerations?.length) {
      lines.push('### Legal & Regulatory Considerations');
      lines.push('');
      d.decision.legalDecisionImpact.considerations.forEach((c) => {
        lines.push(`- ${c}`);
      });
      lines.push('');
    }
    d.applicableRegulations.forEach((reg) => {
      lines.push(`### ${reg.title}`);
      lines.push(`- **Legal Citation:** \`${reg.legalReference}\``);
      lines.push(`- **Regulatory Authority:** ${reg.authority} (${reg.status || 'Verified'})`);
      if (reg.assessmentStatus) {
        lines.push(`- **Compliance Assessment:** \`${reg.assessmentStatus}\``);
      }
      lines.push(`- **Summary:** ${reg.summary}`);
      if (reg.whatRuleRequires && reg.whatRuleRequires !== reg.summary) {
        lines.push(`- **Rule Mandate:** ${reg.whatRuleRequires}`);
      }
      if (reg.evidenceAvailable?.length) {
        lines.push(`- **Evidence Available:** ${Array.isArray(reg.evidenceAvailable) ? reg.evidenceAvailable.join('; ') : reg.evidenceAvailable}`);
      }
      if (reg.evidenceGap) {
        lines.push(`- **Evidence Gap:** ${reg.evidenceGap}`);
      }
      if (reg.claimsImplications) {
        lines.push(`- **Claims Implications:** ${reg.claimsImplications}`);
      }
      if (reg.investigationImplications || reg.investigationImplication) {
        lines.push(`- **Investigative Audit Checklist:** ${reg.investigationImplications || reg.investigationImplication}`);
      }
      if (d.reviewerNotes && d.reviewerNotes[reg.id]) {
        lines.push(`- **Investigator Note:** _${d.reviewerNotes[reg.id]}_`);
      }
      if (reg.sourceUrl) lines.push(`- **Official Source:** [${reg.sourceUrl}](${reg.sourceUrl})`);
      lines.push('');
    });
  }

  // Human Reviewer Sign-Off & Notes
  if (d.isReviewed || d.reviewerNotes?.global) {
    lines.push('## Human Claims Reviewer Sign-Off');
    lines.push('');
    lines.push(`- **Review Status:** ${d.isReviewed ? '✅ **REVIEW COMPLETED & SIGNED OFF**' : '⚠️ **PENDING HUMAN REVIEW**'}`);
    if (d.reviewerName) lines.push(`- **Reviewer Identity:** ${d.reviewerName}`);
    if (d.reviewedAt) lines.push(`- **Review Timestamp:** ${new Date(d.reviewedAt).toLocaleString()}`);
    if (d.reviewerNotes?.global) {
      lines.push('');
      lines.push('### Investigator Final Claim Notes');
      lines.push('');
      lines.push(d.reviewerNotes.global);
    }
    lines.push('');
  }

  // Recommended Actions
  if (d.decision.recommended_actions?.length) {
    lines.push('## Recommended Actions');
    lines.push('');
    lines.push('| Priority | Issue | Action Required | Responsible Party | Evidence Needed | Impact on Decision |');
    lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
    d.decision.recommended_actions.forEach((act) => {
      lines.push(
        `| **${act.priority}** | ${act.issue.replace(/\|/g, '-')} | ${act.action.replace(/\|/g, '-')} | ${act.responsibleParty} | ${act.evidenceNeeded.replace(/\|/g, '-')} | ${act.impactOnDecision.replace(/\|/g, '-')} |`
      );
    });
    lines.push('');
  }

  // Evidence Analysis
  lines.push('## Evidence Analysis');
  lines.push('');

  // Verified Facts
  lines.push('### Verified Facts');
  lines.push('');
  if (d.decision.verified_facts?.length) {
    d.decision.verified_facts.forEach((vf) => {
      lines.push(`- **[VERIFIED FACT]** ${vf.statement} _(${vf.source})_`);
    });
  } else if (d.corroborations.length) {
    d.corroborations.forEach((cb) => {
      lines.push(`- **[VERIFIED FACT]** ${cb.fact} _(Exhibits: ${cb.exhibits.join(', ')})_`);
    });
  } else {
    lines.push('_No independently corroborated facts recorded._');
  }
  lines.push('');

  // Supporting Evidence
  lines.push('### Supporting Evidence');
  lines.push('');
  if (d.decision.supporting_evidence?.length) {
    d.decision.supporting_evidence.forEach((s) => {
      lines.push(`- **Exhibit ${s.exhibit}** (${s.reliability}): ${s.statement || s.finding}`);
      if (s.quote) lines.push(`  > "${s.quote}"`);
    });
  } else if (d.supporting.length) {
    d.supporting.forEach((s) => {
      lines.push(`- **Exhibit ${s.exhibit}**: ${s.point}`);
      if (s.quote) lines.push(`  > "${s.quote}"`);
    });
  } else {
    lines.push('_No direct supporting evidence identified._');
  }
  lines.push('');

  // Contradicting Evidence
  lines.push('### Contradicting Evidence');
  lines.push('');
  if (d.decision.contradicting_evidence?.length) {
    d.decision.contradicting_evidence.forEach((c) => {
      lines.push(`- **Exhibit ${c.exhibit}** (${c.reliability}): ${c.finding || c.name}`);
      if (c.quote) lines.push(`  > "${c.quote}"`);
    });
  } else if (d.against.length) {
    d.against.forEach((c) => {
      lines.push(`- **Exhibit ${c.exhibit}**: ${c.point}`);
      if (c.quote) lines.push(`  > "${c.quote}"`);
    });
  } else {
    lines.push('_No direct contradicting evidence reported._');
  }
  lines.push('');

  // Suspicious Indicators
  lines.push('### Suspicious Indicators');
  lines.push('');
  if (d.decision.suspicious_indicators?.length) {
    d.decision.suspicious_indicators.forEach((si) => {
      lines.push(`- ⚠️ **${si.indicator}** _(${si.weight} weight)_`);
    });
  } else if (d.indicators.length) {
    d.indicators.forEach((si) => {
      lines.push(`- ⚠️ **${si.point}** _(${si.weight} weight)_`);
    });
  } else {
    lines.push('_No suspicious indicators detected._');
  }
  lines.push('');

  // Unresolved Issues
  lines.push('## Unresolved Issues');
  lines.push('');
  if (d.contradictions.length) {
    d.contradictions.forEach((c) => {
      const rev = d.review[c.id] ? ` [${REVIEW_LABELS[d.review[c.id]] || d.review[c.id]}]` : ' [Unresolved]';
      lines.push(`### ${c.id}. ${c.title}${rev}`);
      lines.push(`- **Severity:** ${SEVERITY_LABEL[c.severity] || c.severity}`);
      lines.push(`- **Category:** ${CATEGORY_LABEL[c.category] || c.category}`);
      lines.push(`- **Confidence:** ${Math.round(c.confidence * 100)}%`);
      lines.push('');
      lines.push(`${c.explanation}`);
      lines.push('');
      (c.evidence || []).forEach((ev) => {
        lines.push(`- Exhibit ${ev.exhibit}: _"${ev.quote}"_ (${MATCH_LABELS[ev.match?.status] || 'cited'})`);
      });
      if (c.innocentExplanation) {
        lines.push('');
        lines.push(`*Possible innocent explanation:* ${c.innocentExplanation}`);
      }
      if (c.followUp?.question) {
        lines.push('');
        lines.push(`*Recommended question for ${c.followUp.ask || 'interview'}:* ${c.followUp.question}`);
      }
      lines.push('');
    });
  } else if (d.decision.unresolved_issues?.length) {
    d.decision.unresolved_issues.forEach((iss) => {
      lines.push(`- **${iss.title}** (${iss.severity}): ${iss.whyItMatters}`);
      lines.push(`  *Resolution:* ${iss.recommendedResolution}`);
    });
    lines.push('');
  } else {
    lines.push('No material unresolved contradictions remain.');
    lines.push('');
  }

  // Missing Evidence
  lines.push('## Missing Evidence');
  lines.push('');
  const missingArr = [
    ...(d.decision.missing_evidence || []).map((m) => `**${m.item}:** ${m.why}`),
    ...(d.missing || []).map((m) => `**${m.item}:** ${m.why}`),
    ...(d.gaps || []).map((g) => `**${g.gap}:** Required document: ${g.request || 'Request from claimant'}`),
  ];
  if (missingArr.length) {
    missingArr.forEach((m) => lines.push(`- ${m}`));
  } else {
    lines.push('_No critical evidentiary gaps or missing items._');
  }
  lines.push('');

  // Timeline
  if (d.timeline.length) {
    lines.push('## Chronological Timeline Reconstruction');
    lines.push('');
    lines.push('| Time | Incident Event | Source Exhibits | Verification Status |');
    lines.push('| :--- | :--- | :--- | :--- |');
    d.timeline.forEach((t) => {
      lines.push(`| ${t.time || '?'} | ${t.event.replace(/\|/g, '-')} | ${t.exhibits.join(', ')} | ${t.status} |`);
    });
    lines.push('');
  }

  // Evidence Inventory
  lines.push('## Evidence Inventory');
  lines.push('');
  d.exhibits.forEach((e) => {
    lines.push(`- **Exhibit ${e.id}:** ${e.label} _(${KIND_LABELS[e.kind] || e.kind})_`);
  });
  lines.push('');

  // Disclaimer
  lines.push('## Human Review Disclaimer');
  lines.push('');
  lines.push('> **DISCLAIMER:** AI-assisted recommendation requiring authorized human claims handler review.');
  lines.push('> FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be authorized by a licensed claims professional.');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 3. WORD EXPORT (.DOCX)
// ---------------------------------------------------------------------------
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildDocxXml(d) {
  const dateStr = new Date(d.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const outcomeColor =
    d.decision.decision === DECISION_OUTCOMES.APPROVE
      ? '16A34A'
      : d.decision.decision === DECISION_OUTCOMES.REJECT
        ? 'DC2626'
        : 'D97706';

  const paragraphs = [];

  // Title
  paragraphs.push(`
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:before="0" w:after="80"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:color w:val="0F172A"/>
          <w:sz w:val="44"/>
        </w:rPr>
        <w:t>FaultLine Forensic Investigation Report</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:color w:val="4F6BFF"/>
          <w:b/>
          <w:sz w:val="24"/>
        </w:rPr>
        <w:t>${escapeXml(d.title)} ${d.scenarioId ? '(' + escapeXml(d.scenarioId) + ')' : ''}</w:t>
      </w:r>
    </w:p>
  `);

  // Metadata Table
  paragraphs.push(`
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9360" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Investigation ID</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(d.scenarioId || 'N/A')}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Date &amp; Time</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(dateStr)}</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Jurisdiction</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(d.jurisdiction)}</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Claim Category</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:tcW w:w="2340" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(d.claimType)}</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  `);

  // Decision Banner Box
  paragraphs.push(`
    <w:p><w:pPr><w:spacing w:before="240" w:after="60"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9360" w:type="dxa"/>
        <w:tblCellMar>
          <w:top w:w="160" w:type="dxa"/>
          <w:bottom w:w="160" w:type="dxa"/>
          <w:left w:w="240" w:type="dxa"/>
          <w:right w:w="240" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9360" w:type="dxa"/>
            <w:shd w:val="clear" w:fill="${outcomeColor}"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="40"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="32"/></w:rPr>
              <w:t>RECOMMENDED OUTCOME: ${escapeXml(d.decision.decision_label)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr>
            <w:r>
              <w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="22"/></w:rPr>
              <w:t>AI Confidence: ${d.decision.confidence}/100   |   Risk: ${escapeXml(d.decision.risk_level)}   |   Completeness: ${d.decision.investigation_completeness}%   |   Supporting: ${d.decision.supporting_count ?? (d.decision.supporting_evidence?.length || 0)}   |   Conflicts: ${d.decision.contradictions_count ?? (d.decision.unresolved_issues?.length || 0)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  // Why This Decision? (Detailed Explanation Paragraph)
  paragraphs.push(`
    <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Why This Decision?</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="160"/><w:ind w:left="240" w:right="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(d.decision.decision_explanation || d.decision.executive_summary)}</w:t></w:r>
    </w:p>
  `);

  // Key Reasons
  if (d.decision.key_reasons?.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="240" w:after="100"/></w:pPr><w:r><w:t>Key Reasons for Recommendation</w:t></w:r></w:p>
    `);
    d.decision.key_reasons.forEach((r, idx) => {
      paragraphs.push(`
        <w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:ind w:left="360"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="4F6BFF"/><w:sz w:val="22"/></w:rPr><w:t>• </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(r)}</w:t></w:r>
        </w:p>
      `);
    });
  }

  // What Could Change the Decision
  if (d.decision.what_could_change_decision?.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="240" w:after="100"/></w:pPr><w:r><w:t>What Could Change the Decision?</w:t></w:r></w:p>
    `);
    d.decision.what_could_change_decision.forEach((c) => {
      paragraphs.push(`
        <w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:ind w:left="360"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="4F6BFF"/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(c.path || c.outcome)}: </w:t></w:r>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(c.condition)} - </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(c.details)}</w:t></w:r>
        </w:p>
      `);
    });
  }

  // Executive Summary Section
  paragraphs.push(`
    <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Executive Summary</w:t></w:r></w:p>
    <w:p><w:pPr><w:spacing w:before="0" w:after="160"/><w:ind w:left="240" w:right="240"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:i/></w:rPr><w:t>${escapeXml(d.decision.executive_summary)}</w:t></w:r>
    </w:p>
  `);

  // Decision Rationale
  paragraphs.push(`
    <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="240" w:after="100"/></w:pPr><w:r><w:t>Decision Rationale &amp; Grounds</w:t></w:r></w:p>
  `);
  (d.decision.decision_rationale || []).forEach((r, idx) => {
    paragraphs.push(`
      <w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:ind w:left="360"/></w:pPr>
        <w:r><w:rPr><w:b/><w:color w:val="4F6BFF"/><w:sz w:val="22"/></w:rPr><w:t>${idx + 1}.  </w:t></w:r>
        <w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>${escapeXml(r)}</w:t></w:r>
      </w:p>
    `);
  });

  // Applicable Statutory Context
  if (d.applicableRegulations?.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Applicable Statutory &amp; Regulatory Context</w:t></w:r></w:p>
    `);
    d.applicableRegulations.forEach((reg) => {
      paragraphs.push(`
        <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="2563EB"/></w:rPr><w:t>${escapeXml(reg.title)}</w:t></w:r>
        </w:p>
        <w:p><w:pPr><w:ind w:left="240"/><w:spacing w:before="0" w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Citation: </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(reg.legalReference)} (${escapeXml(reg.authority)}) — Assessment: ${escapeXml(reg.assessmentStatus || reg.status || 'Verified')}</w:t></w:r>
        </w:p>
        <w:p><w:pPr><w:ind w:left="240"/><w:spacing w:before="0" w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Legal Summary: </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(reg.summary)}</w:t></w:r>
        </w:p>
        <w:p><w:pPr><w:ind w:left="240"/><w:spacing w:before="0" w:after="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Claims Impact: </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(reg.claimsImplications)}</w:t></w:r>
        </w:p>
      `);
    });
  }

  // Action Plan Table
  if (d.decision.recommended_actions?.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Prioritized Review Action Plan</w:t></w:r></w:p>
      <w:tbl>
        <w:tblPr>
          <w:tblW w:w="9360" w:type="dxa"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          </w:tblBorders>
        </w:tblPr>
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Priority</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Investigative Issue</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Action &amp; Evidence Required</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Assignee</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1560" w:type="dxa"/><w:shd w:val="clear" w:fill="0F172A"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t>Decision Impact</w:t></w:r></w:p></w:tc>
        </w:tr>
    `);
    d.decision.recommended_actions.forEach((act) => {
      paragraphs.push(`
        <w:tr>
          <w:tc><w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Priority ${act.priority}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(act.issue)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(act.action)} (Needs: ${escapeXml(act.evidenceNeeded)})</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(act.responsibleParty)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:tcPr><w:tcW w:w="1560" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(act.impactOnDecision)}</w:t></w:r></w:p></w:tc>
        </w:tr>
      `);
    });
    paragraphs.push(`</w:tbl>`);
  }

  // Evidence Tables
  paragraphs.push(`
    <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Evidence Analysis &amp; Findings</w:t></w:r></w:p>
  `);

  // Verified Facts
  paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="120" w:after="60"/></w:pPr><w:r><w:t>Verified Facts</w:t></w:r></w:p>`);
  if (d.decision.verified_facts?.length) {
    d.decision.verified_facts.forEach((vf) => {
      paragraphs.push(`
        <w:p><w:pPr><w:ind w:left="240"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="16A34A"/><w:sz w:val="20"/></w:rPr><w:t>[VERIFIED FACT] </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(vf.statement)} (${escapeXml(vf.source)})</w:t></w:r>
        </w:p>
      `);
    });
  } else {
    paragraphs.push(`<w:p><w:pPr><w:ind w:left="240"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr><w:t>No corroborated facts recorded.</w:t></w:r></w:p>`);
  }

  // Supporting Evidence
  paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:t>Supporting Evidence</w:t></w:r></w:p>`);
  if (d.decision.supporting_evidence?.length) {
    d.decision.supporting_evidence.forEach((s) => {
      paragraphs.push(`
        <w:p><w:pPr><w:ind w:left="240"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>Exhibit ${escapeXml(s.exhibit)}: </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(s.statement || s.finding)} [${escapeXml(s.reliability)}]</w:t></w:r>
        </w:p>
      `);
      if (s.quote) {
        paragraphs.push(`
          <w:p><w:pPr><w:ind w:left="480"/></w:pPr>
            <w:r><w:rPr><w:i/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr><w:t>"${escapeXml(s.quote)}"</w:t></w:r>
          </w:p>
        `);
      }
    });
  }

  // Contradicting Evidence
  paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="140" w:after="60"/></w:pPr><w:r><w:t>Opposing &amp; Contradicting Evidence</w:t></w:r></w:p>`);
  if (d.decision.contradicting_evidence?.length) {
    d.decision.contradicting_evidence.forEach((c) => {
      paragraphs.push(`
        <w:p><w:pPr><w:ind w:left="240"/></w:pPr>
          <w:r><w:rPr><w:b/><w:color w:val="DC2626"/><w:sz w:val="20"/></w:rPr><w:t>Exhibit ${escapeXml(c.exhibit)}: </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(c.finding || c.name)} [${escapeXml(c.reliability)}]</w:t></w:r>
        </w:p>
      `);
      if (c.quote) {
        paragraphs.push(`
          <w:p><w:pPr><w:ind w:left="480"/></w:pPr>
            <w:r><w:rPr><w:i/><w:color w:val="475569"/><w:sz w:val="20"/></w:rPr><w:t>"${escapeXml(c.quote)}"</w:t></w:r>
          </w:p>
        `);
      }
    });
  }

  // Contradictions Table
  if (d.contradictions.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Identified Contradictions &amp; Conflicts</w:t></w:r></w:p>
    `);
    d.contradictions.forEach((c) => {
      const rev = d.review[c.id] ? ` [${REVIEW_LABELS[d.review[c.id]] || d.review[c.id]}]` : '';
      paragraphs.push(`
        <w:p><w:pPr><w:spacing w:before="120" w:after="40"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="DC2626"/></w:rPr><w:t>${escapeXml(c.id)}. ${escapeXml(c.title)}${escapeXml(rev)}</w:t></w:r>
        </w:p>
        <w:p><w:pPr><w:ind w:left="240"/><w:spacing w:before="0" w:after="40"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>Severity: ${escapeXml(SEVERITY_LABEL[c.severity] || c.severity)}  |  Category: ${escapeXml(CATEGORY_LABEL[c.category] || c.category)}</w:t></w:r>
        </w:p>
        <w:p><w:pPr><w:ind w:left="240"/><w:spacing w:before="0" w:after="60"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(c.explanation)}</w:t></w:r>
        </w:p>
      `);
      (c.evidence || []).forEach((ev) => {
        paragraphs.push(`
          <w:p><w:pPr><w:ind w:left="480"/></w:pPr>
            <w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t>Exhibit ${escapeXml(ev.exhibit)}: "${escapeXml(ev.quote)}" (${escapeXml(MATCH_LABELS[ev.match?.status] || 'cited')})</w:t></w:r>
          </w:p>
        `);
      });
    });
  }

  // Missing Evidence Table
  const missingItems = [
    ...(d.decision.missing_evidence || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.missing || []).map((m) => `${m.item}: ${m.why}`),
  ];
  if (missingItems.length) {
    paragraphs.push(`
      <w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="260" w:after="100"/></w:pPr><w:r><w:t>Missing Evidence &amp; Unresolved Gaps</w:t></w:r></w:p>
    `);
    missingItems.forEach((m, idx) => {
      paragraphs.push(`
        <w:p><w:pPr><w:ind w:left="240"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t>${idx + 1}. </w:t></w:r>
          <w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(m)}</w:t></w:r>
        </w:p>
      `);
    });
  }

  // Disclaimer Box
  paragraphs.push(`
    <w:p><w:pPr><w:spacing w:before="360" w:after="100"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9360" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="140" w:type="dxa"/>
          <w:bottom w:w="140" w:type="dxa"/>
          <w:left w:w="200" w:type="dxa"/>
          <w:right w:w="200" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:shd w:val="clear" w:fill="F8FAFC"/></w:tcPr>
          <w:p>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="334155"/></w:rPr><w:t>HUMAN REVIEW &amp; STATUTORY DISCLAIMER</w:t></w:r>
          </w:p>
          <w:p>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>AI-assisted forensic recommendation requiring authorized human claims handler review. FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be authorized by a licensed claims professional.</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
  `);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

export async function generateWordDocx(rawInput) {
  const d = normalizeReportData(rawInput);
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  // 3. word/_rels/document.xml.rels
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  // 4. word/styles.xml
  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="1F2937"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="36"/><w:color w:val="0F172A"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="28"/><w:color w:val="2563EB"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:spacing w:before="140" w:after="60"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:color w:val="334155"/></w:rPr>
  </w:style>
</w:styles>`
  );

  // 5. word/document.xml
  zip.file('word/document.xml', buildDocxXml(d));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const filename = getReportFilename(d, 'docx');
  return { blob, filename, d };
}

// ---------------------------------------------------------------------------
// 4. PDF EXPORT (.PDF)
// ---------------------------------------------------------------------------
export function generatePdfDocument(rawInput) {
  const d = normalizeReportData(rawInput);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;
  const marginTop = 50;
  const marginBottom = 50;
  let y = marginTop;

  const dateStr = new Date(d.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
      renderPageHeader();
    }
  };

  const renderPageHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('FAULTLINE FORENSIC INVESTIGATION REPORT', marginX, 32);
    doc.setFont('helvetica', 'normal');
    doc.text(`Claim: ${d.scenarioId || d.title}`, pageWidth - marginX, 32, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(marginX, 38, pageWidth - marginX, 38);
  };

  // Render First Page Header
  renderPageHeader();

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('Forensic Claim Investigation Report', marginX, y + 16);
  y += 24;

  // Claim Title Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(79, 107, 255);
  doc.text(`${d.title} ${d.scenarioId ? '(' + d.scenarioId + ')' : ''}`, marginX, y + 12);
  y += 24;

  // Metadata Strip
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${dateStr}   |   Jurisdiction: ${d.jurisdiction}   |   Engine: ${d.model}`, marginX, y + 8);
  y += 18;

  // Decision Banner Box
  const outcomeColors = {
    [DECISION_OUTCOMES.APPROVE]: [34, 197, 94],
    [DECISION_OUTCOMES.REJECT]: [239, 68, 68],
    [DECISION_OUTCOMES.REVIEW]: [245, 158, 11],
  };
  const [r, g, b] = outcomeColors[d.decision.decision] || [245, 158, 11];

  checkPageBreak(70);
  doc.setFillColor(r, g, b);
  doc.roundedRect(marginX, y, contentWidth, 58, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`RECOMMENDED OUTCOME: ${d.decision.decision_label}`, marginX + 16, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `AI Confidence: ${d.decision.confidence}/100   |   Risk Level: ${d.decision.risk_level}   |   Completeness: ${d.decision.investigation_completeness}%${d.decision.review_priority ? '   |   Priority: ' + d.decision.review_priority : ''}`,
    marginX + 16,
    y + 44
  );
  y += 72;

  // Section Heading helper
  const drawSectionHeading = (title) => {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), marginX, y + 12);
    doc.setDrawColor(79, 107, 255);
    doc.setLineWidth(1.2);
    doc.line(marginX, y + 17, marginX + 32, y + 17);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX + 34, y + 17, pageWidth - marginX, y + 17);
    y += 28;
  };

  // 1. Why This Decision? (Detailed Explanation Paragraph)
  drawSectionHeading('1. Why This Decision?');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const explanationLines = doc.splitTextToSize(d.decision.decision_explanation || d.decision.executive_summary, contentWidth - 16);
  checkPageBreak(explanationLines.length * 13 + 18);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, y, contentWidth, explanationLines.length * 13 + 14, 3, 3, 'FD');
  doc.text(explanationLines, marginX + 8, y + 15);
  y += explanationLines.length * 13 + 24;

  // 2. Key Reasons
  if (d.decision.key_reasons?.length) {
    drawSectionHeading('2. Key Reasons for Recommendation');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    d.decision.key_reasons.forEach((r, idx) => {
      const textLines = doc.splitTextToSize(`•  ${r}`, contentWidth - 10);
      checkPageBreak(textLines.length * 13 + 4);
      doc.text(textLines, marginX + 4, y);
      y += textLines.length * 13 + 4;
    });
    y += 10;
  }

  // 3. What Could Change the Decision
  if (d.decision.what_could_change_decision?.length) {
    drawSectionHeading('3. What Could Change the Decision?');
    d.decision.what_could_change_decision.forEach((c) => {
      checkPageBreak(40);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, y, contentWidth, 36, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 107, 255);
      doc.text(`${c.path || c.outcome}: ${c.condition}`, marginX + 8, y + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const detailLines = doc.splitTextToSize(c.details, contentWidth - 16);
      doc.text(detailLines, marginX + 8, y + 24);
      y += 42;
    });
    y += 6;
  }

  // 4. Decision Grounds & Rationale
  drawSectionHeading('4. Decision Grounds & Findings Summary');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  (d.decision.decision_rationale || []).forEach((rat, i) => {
    const textLines = doc.splitTextToSize(`${i + 1}.  ${rat}`, contentWidth - 10);
    checkPageBreak(textLines.length * 13 + 4);
    doc.text(textLines, marginX + 4, y);
    y += textLines.length * 13 + 4;
  });
  y += 10;

  // Applicable Statutory Context
  if (d.applicableRegulations?.length) {
    drawSectionHeading('5. Applicable Statutory & Regulatory Context');
    d.applicableRegulations.forEach((reg) => {
      checkPageBreak(50);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, y, contentWidth, 46, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(`${reg.title} — ${reg.legalReference}`, marginX + 8, y + 13);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const sumLines = doc.splitTextToSize(reg.summary, contentWidth - 16);
      doc.text(sumLines.slice(0, 2), marginX + 8, y + 25);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Authority: ${reg.authority}   |   Assessment: ${reg.assessmentStatus || reg.status || 'Verified'}`, marginX + 8, y + 39);
      y += 52;
    });
    y += 6;
  }

  // 3. Recommended Actions
  if (d.decision.recommended_actions?.length) {
    drawSectionHeading('3. Prioritized Review Action Plan');
    d.decision.recommended_actions.forEach((act) => {
      checkPageBreak(52);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(marginX, y, contentWidth, 48, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 107, 255);
      doc.text(`PRIORITY ${act.priority}: ${act.issue}`, marginX + 8, y + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Action: ${act.action}   |   Assigned: ${act.responsibleParty}`, marginX + 8, y + 28);
      doc.text(`Evidence Needed: ${act.evidenceNeeded}   |   Decision Impact: ${act.impactOnDecision}`, marginX + 8, y + 40);
      y += 56;
    });
    y += 6;
  }

  // 4. Evidence Analysis
  drawSectionHeading('4. Evidence Analysis & Findings');

  // Verified Facts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  checkPageBreak(24);
  doc.text('VERIFIED FACTS & CORROBORATING EVIDENCE', marginX, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const facts = d.decision.verified_facts?.length
    ? d.decision.verified_facts.map((f) => `${f.statement} (${f.source})`)
    : d.corroborations.map((c) => `${c.fact} (Exhibits: ${c.exhibits.join(', ')})`);

  if (facts.length) {
    facts.forEach((f) => {
      const flines = doc.splitTextToSize(`• ${f}`, contentWidth - 10);
      checkPageBreak(flines.length * 12 + 2);
      doc.text(flines, marginX + 6, y);
      y += flines.length * 12 + 2;
    });
  } else {
    doc.text('No independently corroborated facts recorded.', marginX + 6, y);
    y += 14;
  }
  y += 10;

  // Supporting vs Opposing summary
  if (d.decision.supporting_evidence?.length) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text(`EVIDENCE SUPPORTING APPROVAL (${d.decision.supporting_evidence.length})`, marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    d.decision.supporting_evidence.forEach((s) => {
      const sLines = doc.splitTextToSize(`• Exhibit ${s.exhibit} [${s.reliability}]: ${s.statement || s.finding}`, contentWidth - 10);
      checkPageBreak(sLines.length * 12 + (s.quote ? 14 : 2));
      doc.text(sLines, marginX + 6, y);
      y += sLines.length * 12 + 2;
      if (s.quote) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        const qLines = doc.splitTextToSize(`  "${s.quote}"`, contentWidth - 20);
        doc.text(qLines, marginX + 14, y);
        y += qLines.length * 12 + 2;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
      }
    });
    y += 10;
  }

  if (d.decision.contradicting_evidence?.length) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(220, 38, 38);
    doc.text(`EVIDENCE OPPOSING CLAIM (${d.decision.contradicting_evidence.length})`, marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    d.decision.contradicting_evidence.forEach((c) => {
      const cLines = doc.splitTextToSize(`• Exhibit ${c.exhibit} [${c.reliability}]: ${c.finding || c.name}`, contentWidth - 10);
      checkPageBreak(cLines.length * 12 + (c.quote ? 14 : 2));
      doc.text(cLines, marginX + 6, y);
      y += cLines.length * 12 + 2;
      if (c.quote) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        const qLines = doc.splitTextToSize(`  "${c.quote}"`, contentWidth - 20);
        doc.text(qLines, marginX + 14, y);
        y += qLines.length * 12 + 2;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
      }
    });
    y += 10;
  }

  // 5. Contradictions
  if (d.contradictions.length) {
    drawSectionHeading('5. Identified Contradictions & Conflicts');
    d.contradictions.forEach((c) => {
      const rev = d.review[c.id] ? ` [${REVIEW_LABELS[d.review[c.id]] || d.review[c.id]}]` : '';
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(220, 38, 38);
      doc.text(`${c.id}. ${c.title}${rev}`, marginX, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Severity: ${SEVERITY_LABEL[c.severity] || c.severity}   |   Category: ${CATEGORY_LABEL[c.category] || c.category}`, marginX, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const expLines = doc.splitTextToSize(c.explanation, contentWidth - 10);
      checkPageBreak(expLines.length * 12 + 10);
      doc.text(expLines, marginX + 6, y);
      y += expLines.length * 12 + 8;
    });
    y += 8;
  }

  // 6. Missing Evidence
  const missingArr = [
    ...(d.decision.missing_evidence || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.missing || []).map((m) => `${m.item}: ${m.why}`),
  ];
  if (missingArr.length) {
    drawSectionHeading('6. Missing Evidence & Gaps');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    missingArr.forEach((m) => {
      const mLines = doc.splitTextToSize(`• ${m}`, contentWidth - 10);
      checkPageBreak(mLines.length * 12 + 2);
      doc.text(mLines, marginX + 6, y);
      y += mLines.length * 12 + 2;
    });
    y += 10;
  }

  // 7. Evidence Inventory
  drawSectionHeading('7. Submitted Evidence Inventory');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  d.exhibits.forEach((e) => {
    checkPageBreak(14);
    doc.text(`Exhibit ${e.id}: ${e.label} (${KIND_LABELS[e.kind] || e.kind})`, marginX + 6, y);
    y += 13;
  });
  y += 18;

  // Disclaimer Box
  checkPageBreak(50);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, y, contentWidth, 42, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('HUMAN REVIEW & STATUTORY DISCLAIMER', marginX + 10, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const discLines = doc.splitTextToSize(
    'AI-assisted forensic recommendation requiring authorized human claims handler review. FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be authorized by a licensed claims professional.',
    contentWidth - 20
  );
  doc.text(discLines, marginX + 10, y + 25);

  // Total page count footer loop
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 22, { align: 'right' });
    doc.text('FaultLine AI Forensic Investigation Platform — Confidential Claims Document', marginX, pageHeight - 22);
  }

  const filename = getReportFilename(d, 'pdf');
  const blob = doc.output('blob');
  return { doc, blob, filename, d };
}

// ---------------------------------------------------------------------------
// 5. PRINT HELPERS
// ---------------------------------------------------------------------------

/**
 * Clean, printer-friendly investigation report view
 */
export function printInvestigationReport(rawInput) {
  const d = normalizeReportData(rawInput);
  const markdown = generateMarkdownReport(d);

  const missingItems = [
    ...(d.decision.missing_evidence || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.missing || []).map((m) => `${m.item}: ${m.why}`),
    ...(d.gaps || []).map((g) => `${g.gap} (Request: ${g.request || 'Collect documentation'})`),
  ];

  const dateStr = new Date(d.generatedAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const outcomeColors = {
    [DECISION_OUTCOMES.APPROVE]: '#16A34A',
    [DECISION_OUTCOMES.REJECT]: '#DC2626',
    [DECISION_OUTCOMES.REVIEW]: '#D97706',
  };
  const color = outcomeColors[d.decision.decision] || '#D97706';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>FaultLine Report - ${escapeXml(d.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 1.8cm 1.5cm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 20pt;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .header .subtitle {
      font-size: 12pt;
      color: #2563eb;
      font-weight: 600;
      margin: 0 0 6px 0;
    }
    .header .meta {
      font-size: 9pt;
      color: #64748b;
    }
    .decision-banner {
      background-color: ${color};
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .decision-banner h2 {
      margin: 0 0 6px 0;
      font-size: 15pt;
      color: #ffffff;
    }
    .decision-banner .metrics {
      font-size: 10pt;
      opacity: 0.95;
    }
    h2 {
      font-size: 13pt;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 11pt;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    .callout {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      margin: 12px 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
    }
    ul, ol {
      margin: 6px 0 14px 20px;
      padding: 0;
    }
    li {
      margin-bottom: 4px;
    }
    .disclaimer {
      margin-top: 32px;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
      color: #64748b;
      border-radius: 4px;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="meta">FAULTLINE FORENSIC INVESTIGATION REPORT</div>
    <h1>${escapeXml(d.title)}</h1>
    <div class="subtitle">${escapeXml(d.scenarioId ? d.scenarioId + ' — ' : '')}${escapeXml(d.claimType)} (${escapeXml(d.jurisdiction)})</div>
    <div class="meta">Generated: ${escapeXml(dateStr)} | Engine: ${escapeXml(d.model)}</div>
  </div>

  <div class="decision-banner">
    <h2>RECOMMENDED OUTCOME: ${escapeXml(d.decision.decision_label)}</h2>
    <div class="metrics">
      AI Confidence: ${d.decision.confidence}/100 &nbsp;|&nbsp;
      Risk Level: ${escapeXml(d.decision.risk_level)} &nbsp;|&nbsp;
      Completeness: ${d.decision.investigation_completeness}% &nbsp;|&nbsp;
      Supporting: ${d.decision.supporting_count ?? (d.decision.supporting_evidence?.length || 0)} &nbsp;|&nbsp;
      Conflicts: ${d.decision.contradictions_count ?? (d.decision.unresolved_issues?.length || 0)}
      ${d.decision.review_priority ? '&nbsp;|&nbsp; Priority: ' + escapeXml(d.decision.review_priority) : ''}
    </div>
  </div>

  <h2>Why This Decision?</h2>
  <div class="callout" style="border-left-color: ${color}; font-size: 10.5pt; line-height: 1.6;">
    ${escapeXml(d.decision.decision_explanation || d.decision.executive_summary)}
  </div>

  ${
    d.decision.key_reasons?.length
      ? `<h2>Key Reasons for Recommendation</h2>
      <ul>
        ${d.decision.key_reasons.map((r) => `<li>${escapeXml(r)}</li>`).join('')}
      </ul>`
      : ''
  }

  ${
    d.decision.what_could_change_decision?.length
      ? `<h2>What Could Change the Decision?</h2>
      <table>
        <thead>
          <tr>
            <th>Scenario / Path</th>
            <th>Trigger Condition</th>
            <th>Expected Outcome &amp; Details</th>
          </tr>
        </thead>
        <tbody>
          ${d.decision.what_could_change_decision
            .map(
              (c) => `<tr>
            <td><strong>${escapeXml(c.path || c.outcome)}</strong></td>
            <td>${escapeXml(c.condition)}</td>
            <td>${escapeXml(c.details)}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : ''
  }

  <h2>Executive Summary</h2>
  <div class="callout">
    ${escapeXml(d.decision.executive_summary)}
  </div>

  <h2>Decision Grounds &amp; Rationale</h2>
  <ol>
    ${(d.decision.decision_rationale || []).map((r) => `<li>${escapeXml(r)}</li>`).join('')}
  </ol>

  ${
    d.applicableRegulations?.length
      ? `<h2>Applicable Statutory &amp; Regulatory Context</h2>
      <div style="display: grid; gap: 10px; margin-bottom: 20px;">
        ${d.applicableRegulations
          .map(
            (reg) => `
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; page-break-inside: avoid;">
            <div style="font-weight: 700; color: #2563eb; font-size: 11pt;">${escapeXml(reg.title)}</div>
            <div style="font-family: monospace; font-size: 9.5pt; color: #0f172a; margin: 2px 0 4px 0;">${escapeXml(reg.legalReference)} &bull; ${escapeXml(reg.authority)}</div>
            <div style="font-size: 9.5pt; color: #334155; margin-bottom: 4px;">${escapeXml(reg.summary)}</div>
            <div style="font-size: 8.5pt; color: #64748b;"><strong>Claims Impact:</strong> ${escapeXml(reg.claimsImplications)}</div>
          </div>
        `
          )
          .join('')}
      </div>`
      : ''
  }

  ${
    d.decision.recommended_actions?.length
      ? `<h2>3. Prioritized Review Action Plan</h2>
      <table>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Issue</th>
            <th>Action Required</th>
            <th>Responsible Party</th>
            <th>Decision Impact</th>
          </tr>
        </thead>
        <tbody>
          ${d.decision.recommended_actions
            .map(
              (act) => `<tr>
            <td><strong>Priority ${act.priority}</strong></td>
            <td>${escapeXml(act.issue)}</td>
            <td>${escapeXml(act.action)}</td>
            <td>${escapeXml(act.responsibleParty)}</td>
            <td>${escapeXml(act.impactOnDecision)}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>`
      : ''
  }

  <h2>4. Evidence Analysis &amp; Verified Facts</h2>
  <h3>Verified Facts</h3>
  <ul>
    ${
      d.decision.verified_facts?.length
        ? d.decision.verified_facts.map((vf) => `<li><strong>[VERIFIED]</strong> ${escapeXml(vf.statement)} <em>(${escapeXml(vf.source)})</em></li>`).join('')
        : '<li>No independently corroborated facts recorded.</li>'
    }
  </ul>

  ${
    d.decision.supporting_evidence?.length
      ? `<h3>Evidence Supporting Approval</h3>
      <ul>
        ${d.decision.supporting_evidence.map((s) => `<li>Exhibit ${escapeXml(s.exhibit)}: ${escapeXml(s.statement || s.finding)}${s.quote ? `<br><em>"${escapeXml(s.quote)}"</em>` : ''}</li>`).join('')}
      </ul>`
      : ''
  }

  ${
    d.decision.contradicting_evidence?.length
      ? `<h3>Evidence Opposing Claim</h3>
      <ul>
        ${d.decision.contradicting_evidence.map((c) => `<li>Exhibit ${escapeXml(c.exhibit)}: ${escapeXml(c.finding || c.name)}${c.quote ? `<br><em>"${escapeXml(c.quote)}"</em>` : ''}</li>`).join('')}
      </ul>`
      : ''
  }

  ${
    d.contradictions?.length
      ? `<h2>5. Identified Contradictions</h2>
      ${d.contradictions
        .map(
          (c) => `<div style="margin-bottom: 12px; page-break-inside: avoid;">
        <strong>${escapeXml(c.id)}. ${escapeXml(c.title)}</strong> [${escapeXml(SEVERITY_LABEL[c.severity] || c.severity)}]
        <p style="margin: 4px 0;">${escapeXml(c.explanation)}</p>
      </div>`
        )
        .join('')}`
      : ''
  }

  ${
    missingItems.length
      ? `<h2>6. Missing Evidence &amp; Unresolved Gaps</h2>
      <ul>
        ${missingItems.map((m) => `<li>${escapeXml(m)}</li>`).join('')}
      </ul>`
      : ''
  }

  <h2>7. Submitted Exhibits Inventory</h2>
  <ul>
    ${d.exhibits.map((e) => `<li>Exhibit ${escapeXml(e.id)}: ${escapeXml(e.label)} (${escapeXml(KIND_LABELS[e.kind] || e.kind)})</li>`).join('')}
  </ul>

  <div class="disclaimer">
    <strong>HUMAN REVIEW &amp; STATUTORY DISCLAIMER:</strong> AI-assisted recommendation requiring authorized human claims handler review. FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be authorized by a licensed claims professional.
  </div>
</body>
</html>`;

  if (typeof document === 'undefined') return html;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 250);

  return html;
}

/**
 * Print entire investigation page as currently viewed, unhiding all key tabs
 */
export function printEntireInvestigationPage() {
  if (typeof window === 'undefined') return;
  document.body.classList.add('printing-full-investigation');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('printing-full-investigation');
  }, 1000);
}

/**
 * Universal browser file download trigger
 */
export function downloadBlob(filename, blob) {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  downloadBlob(filename, blob);
}
