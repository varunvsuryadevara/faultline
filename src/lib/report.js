import { EXHIBIT_KINDS } from '../../shared/constants.js';
import { consistencyScore } from './score.js';
import { CATEGORY_LABEL, SEVERITY_LABEL, prettyModel } from './format.js';
import { computeClaimDecision } from '../../shared/decision.js';

const KIND = Object.fromEntries(EXHIBIT_KINDS.map((k) => [k.value, k.label]));
const MATCH = { exact: 'verified word for word', close: 'close match', missing: 'not found in the exhibit' };
const REVIEW = { confirmed: 'Confirmed by reviewer', dismissed: 'Dismissed by reviewer' };

// Follow-up questions grouped by who should answer them, ready to paste into an email.
export function questionsText(result, review = {}) {
  const groups = new Map();
  for (const c of result.contradictions) {
    if (review[c.id] === 'dismissed' || !c.followUp.question) continue;
    const who = c.followUp.ask || 'Unassigned';
    if (!groups.has(who)) groups.set(who, []);
    groups.get(who).push(`${c.followUp.question} (re ${c.id}: ${c.title})`);
  }
  return [...groups.entries()]
    .map(([who, qs]) => `Questions for ${who}:\n${qs.map((q, i) => `${i + 1}. ${q}`).join('\n')}`)
    .join('\n\n');
}

export function buildReport({ title, context, result = null, review = {}, decision: providedDecision = null, caseFile = null, scenario = null }) {
  const safeContradictions = Array.isArray(result?.contradictions) ? result.contradictions : [];
  const safeExhibits = result?.meta?.exhibits || caseFile?.exhibits || scenario?.case?.exhibits || [];
  const safeQuoteCheck = result?.quoteCheck || { exact: 0, total: 0 };
  const safeMeta = result?.meta || { generatedAt: new Date().toISOString(), model: 'FaultLine AI Engine' };

  const decision = providedDecision || computeClaimDecision({
    analysis: result?.contradictions ? result : undefined,
    assessment: result?.intent ? result : undefined,
    review,
    caseFile: caseFile || { title: title || scenario?.title, context: context || scenario?.case?.context, exhibits: safeExhibits },
    scenario,
  });

  const { score, verdict } = safeContradictions.length
    ? consistencyScore(safeContradictions, review)
    : { score: 100, verdict: 'Agreed' };

  const exhibitName = (id) => {
    const e = safeExhibits.find((x) => x.id === id);
    return e ? `Exhibit ${id} (${e.label})` : `Exhibit ${id}`;
  };

  const lines = [];
  lines.push(`# FAULTLINE FORENSIC INVESTIGATION REPORT`);
  lines.push(`## Claim: ${title || scenario?.title || 'Untitled Claim'}`);
  lines.push('');
  lines.push(
    `Generated ${new Date(safeMeta.generatedAt).toLocaleString('en-GB')} via FaultLine AI Investigation Engine (${prettyModel(safeMeta.model)}). ` +
      (safeContradictions.length ? `Consistency score ${score}/100 (${verdict.toLowerCase()}). ` : '') +
      (safeQuoteCheck.total ? `${safeQuoteCheck.exact} of ${safeQuoteCheck.total} quotes mechanically verified against source exhibits.` : ''),
  );
  if (context || scenario?.case?.context) lines.push('', `**Case Context:** ${context || scenario?.case?.context}`);

  // SECTION 1: FINAL CLAIM DECISION
  lines.push('', '---');
  lines.push('## 1. FINAL CLAIM DECISION & RECOMMENDATION');
  lines.push('');
  lines.push(`### RECOMMENDED OUTCOME: **${decision.decision_label}**`);
  lines.push(`- **AI ASSESSMENT CONFIDENCE:** ${decision.confidence}/100`);
  lines.push(`  _${decision.confidence_explanation}_`);
  lines.push(`- **RISK LEVEL:** ${decision.risk_level}`);
  lines.push(`- **INVESTIGATION COMPLETENESS:** ${decision.investigation_completeness}%`);
  if (decision.review_priority) {
    lines.push(`- **Review Priority:** ${decision.review_priority}`);
  }
  lines.push('');
  lines.push('#### EXECUTIVE SUMMARY');
  lines.push(decision.executive_summary);
  lines.push('');
  lines.push('#### DECISION RATIONALE');
  for (const r of decision.decision_rationale) {
    lines.push(`- ${r}`);
  }

  // SECTION 2: PRIORITIZED ACTION PLAN (When UNDER REVIEW or with settlement requirements)
  if (decision.recommended_actions?.length) {
    lines.push('', '---');
    lines.push('## 2. PRIORITIZED REVIEW ACTION PLAN');
    lines.push('');
    for (const a of decision.recommended_actions) {
      lines.push(`### Priority ${a.priority}: ${a.issue}`);
      lines.push(`- **Action Required:** ${a.action}`);
      lines.push(`- **Responsible Party:** ${a.responsibleParty}`);
      lines.push(`- **Evidence Needed:** ${a.evidenceNeeded}`);
      lines.push(`- **Expected Outcome:** ${a.expectedOutcome}`);
      lines.push(`- **Impact on Claim Decision:** ${a.impactOnDecision}`);
      lines.push('');
    }
  }

  // SECTION 3: DETAILED CONFLICTS & CONTRADICTIONS
  lines.push('---');
  lines.push('## 3. IDENTIFIED CONFLICTS & CONTRADICTIONS', '');
  if (!safeContradictions.length) lines.push('No material contradictions detected across submitted accounts.');
  for (const c of safeContradictions) {
    lines.push(`### ${c.id}. ${c.title}`);
    lines.push(
      `${SEVERITY_LABEL[c.severity] || c.severity} severity, ${CATEGORY_LABEL[c.category]?.toLowerCase() || c.category}, confidence ${Math.round(c.confidence * 100)}%` +
        (review[c.id] ? `. [${REVIEW[review[c.id]]}].` : '.'),
    );
    lines.push('', c.explanation, '');
    for (const ev of c.evidence || []) lines.push(`- ${exhibitName(ev.exhibit)}: "${ev.quote}" (${MATCH[ev.match?.status] || 'cited'})`);
    if (c.innocentExplanation) lines.push('', `**Possible innocent explanation.** ${c.innocentExplanation}`);
    if (c.followUp?.question) lines.push('', `**Ask ${c.followUp.ask || 'next'}.** ${c.followUp.question}`);
    lines.push('');
  }

  // SECTION 4: TIMELINE RECONSTRUCTION
  lines.push('---');
  lines.push('## 4. CHRONOLOGICAL TIMELINE RECONSTRUCTION', '', '| Time | Event | Exhibits | Status |', '| --- | --- | --- | --- |');
  const safeTimeline = Array.isArray(result?.timeline) ? result.timeline : [];
  for (const e of safeTimeline) {
    const status = e.status === 'disputed' ? `Disputed${e.conflicts?.length ? ` (${e.conflicts.join(', ')})` : ''}` : e.status === 'corroborated' ? 'Corroborated' : 'One source';
    lines.push(`| ${e.time || '?'} | ${(e.event || '').replace(/\|/g, '/')} | ${(e.exhibits || []).join(', ')} | ${status} |`);
  }
  if (!safeTimeline.length) {
    lines.push('| N/A | No sequential timeline reconstruction available | None | Unrecorded |');
  }

  // SECTION 5: VERIFIED FACTS & CORROBORATIONS
  lines.push('', '---');
  lines.push('## 5. VERIFIED FACTS & CORROBORATING EVIDENCE', '');
  const safeCorroborations = Array.isArray(result?.corroborations) ? result.corroborations : [];
  for (const k of safeCorroborations) lines.push(`- **[VERIFIED FACT]** ${k.fact} (${(k.exhibits || []).map((x) => `Exhibit ${x}`).join(', ')})`);
  if (!safeCorroborations.length && decision.verified_facts?.length) {
    for (const vf of decision.verified_facts) lines.push(`- **[VERIFIED FACT]** ${vf.statement} (${vf.source})`);
  } else if (!safeCorroborations.length && !decision.verified_facts?.length) {
    lines.push('No independently corroborated facts identified.');
  }

  // SECTION 6: UNRESOLVED ISSUES & GAPS
  lines.push('', '---');
  lines.push('## 6. UNRESOLVED ISSUES & MISSING EVIDENCE', '');
  const safeGaps = Array.isArray(result?.gaps) ? result.gaps : [];
  for (const g of safeGaps) lines.push(`- **[GAP]** ${g.gap}${g.request ? ` (Required: ${g.request})` : ''}`);
  if (!safeGaps.length && !decision.missing_evidence?.length) lines.push('No material evidentiary gaps identified.');
  if (decision.missing_evidence?.length) {
    for (const m of decision.missing_evidence) {
      lines.push(`- **[MISSING EVIDENCE]** ${m.item}: ${m.why}`);
    }
  }

  // SECTION 7: EVIDENCE INVENTORY
  lines.push('', '---');
  lines.push('## 7. EVIDENCE INVENTORY', '');
  for (const e of safeExhibits) lines.push(`- **Exhibit ${e.id}:** ${e.label} (${KIND[e.kind] ?? e.kind})`);

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('> **DISCLAIMER: AI-assisted recommendation requiring authorized human claims handler review.**');
  lines.push('> FaultLine synthesizes submitted evidence, calculates corroborations, and flags discrepancies to assist claims triage. Final indemnity, repudiation, and subrogation decisions must be authorized by a licensed claims professional.');
  lines.push('');
  return lines.join('\n');
}

export function downloadText(filename, text, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand?.('copy') ?? false;
    area.remove();
    return ok;
  }
}

export const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'case';
