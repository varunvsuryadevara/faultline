// IntentClassifier: Forensically categorizes user messages to enforce:
// FAULTLINE NATIVE INTELLIGENCE FIRST -> INTERNAL DATA RETRIEVAL SECOND -> LOCAL/EXTERNAL AI WHEN APPROPRIATE

export const INTENT_TYPES = {
  APPLICATION_GUIDANCE: 'APPLICATION_GUIDANCE',
  INVESTIGATION_STATS: 'INVESTIGATION_STATS',
  INVESTIGATION_LOOKUP: 'INVESTIGATION_LOOKUP',
  EVIDENCE_LOOKUP: 'EVIDENCE_LOOKUP',
  TIMELINE_CONSTRUCTION: 'TIMELINE_CONSTRUCTION',
  CONTRADICTION_DETECTION: 'CONTRADICTION_DETECTION',
  CORROBORATION_DETECTION: 'CORROBORATION_DETECTION',
  RISK_ANALYSIS: 'RISK_ANALYSIS',
  COMPLETENESS_AUDIT: 'COMPLETENESS_AUDIT',
  WORKFLOW_CHECKLIST: 'WORKFLOW_CHECKLIST',
  POLICY_COMPLIANCE: 'POLICY_COMPLIANCE',
  LEGAL_LOOKUP: 'LEGAL_LOOKUP',
  REPORT_GENERATION: 'REPORT_GENERATION',
  BUILDER_IMPROVEMENTS: 'BUILDER_IMPROVEMENTS',
  COMPETING_HYPOTHESES: 'COMPETING_HYPOTHESES',
  EVIDENCE_REASONING: 'EVIDENCE_REASONING',
  NARRATIVE_GENERATION: 'NARRATIVE_GENERATION',
  EXTERNAL_RESEARCH: 'EXTERNAL_RESEARCH',
  UNKNOWN: 'UNKNOWN',
};

export const ROUTING_OUTCOMES = {
  OUTCOME_A_INTERNAL: 'OUTCOME_A_INTERNAL', // 100% deterministic native logic
  OUTCOME_B_HYBRID: 'OUTCOME_B_HYBRID',     // Native retrieval + AI reasoning
  OUTCOME_C_RESEARCH: 'OUTCOME_C_RESEARCH', // Legal research scope disclosure
  // Advanced routing modes
  NATIVE_ONLY: 'OUTCOME_A_INTERNAL',
  LOCAL_AI: 'LOCAL_AI',
  EXTERNAL_AI: 'OUTCOME_B_HYBRID',
  HYBRID: 'OUTCOME_B_HYBRID',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  REQUIRES_HUMAN_REVIEW: 'REQUIRES_HUMAN_REVIEW',
};

/**
 * Classifies user intent and determines routing mode.
 */
export function classifyIntent(message, context = {}) {
  const text = String(message || '').trim().toLowerCase();

  // 1. Investigation Stats & Metrics
  if (
    /how many (investigations|claims|cases|scenarios)/i.test(text) ||
    /how many (are under review|approved|rejected|staged|genuine)/i.test(text) ||
    /investigation (counts|statistics|metrics|breakdown|summary stats)/i.test(text) ||
    /total (claims|investigations|cases)/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.INVESTIGATION_STATS,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Deterministic metric aggregation over indexed scenario database.',
      requiresClaude: false,
    };
  }

  // 2. Timeline Construction
  if (
    /timeline|chronology|sequence of events|when did (the accident|it|impact) happen|reconstruct (the )?events/i.test(text) ||
    /build (the )?timeline/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.TIMELINE_CONSTRUCTION,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Timeline Intelligence extracts, normalizes, and sequences event chronologies without external AI.',
      requiresClaude: false,
    };
  }

  // 3. Evidence Reasoning & Comparative Explanation
  if (
    /compare .* and explain/i.test(text) ||
    /explain (the )?(contradiction|inconsistency|discrepancy)/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.EVIDENCE_REASONING,
      outcome: ROUTING_OUTCOMES.OUTCOME_B_HYBRID,
      reason: 'Cross-exhibit comparative explanation and reasoning.',
      requiresClaude: true,
    };
  }

  // 4. Contradiction Detection
  if (
    /contradict|inconsisten|conflicting|where do (they|the stories|exhibits) not line up|discrepanc/i.test(text) ||
    /find contradictions|check contradictions/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.CONTRADICTION_DETECTION,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Contradiction Intelligence cross-compares factual statements deterministically.',
      requiresClaude: false,
    };
  }

  // 4. Corroboration Detection
  if (
    /corroborat|supported by multiple|independently verified|confirm(ed)? facts/i.test(text) ||
    /check corroboration/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.CORROBORATION_DETECTION,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Corroboration Intelligence verifies independent multi-source alignment.',
      requiresClaude: false,
    };
  }

  // 4.1 Competing Hypothesis Evaluation
  if (
    /hypothes(is|es)|competing (theories|explanations|hypotheses)|could this be staged|alternative explanation|innocent variance|is this genuine or staged|evaluate hypotheses/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.COMPETING_HYPOTHESES,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Competing Hypothesis Workspace evaluates multiple causal explanations against evidence.',
      requiresClaude: false,
    };
  }

  // 5. Risk Analysis & Fraud Typologies
  if (
    /risk indicators?|fraud indicators?|what are the (current )?risk indicators|is there fraud|staged collision indicators?/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.RISK_ANALYSIS,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Risk Intelligence evaluates rule-based forensic typologies.',
      requiresClaude: false,
    };
  }

  // 6. Completeness Audit & Missing Evidence
  if (
    /how complete is (this|the) investigation|investigation completeness|completeness audit|what evidence is missing|missing information/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.COMPLETENESS_AUDIT,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Completeness Intelligence audits dossier against insurance evidence standards.',
      requiresClaude: false,
    };
  }

  // 7. Report Generation (Native)
  if (
    /generate (an? )?(investigation )?report|create report|export report|native report|summary report|recommended (claim )?disposition|claim decision recommendation|decision recommendation/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.REPORT_GENERATION,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Report Intelligence compiles audit-ready forensic report without external AI.',
      requiresClaude: false,
    };
  }

  // 8. Intelligence Builder & Improvement Proposals
  if (
    /improvement proposals?|pattern discovery|detected patterns|rules builder|active rules|governed self-improvement/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.BUILDER_IMPROVEMENTS,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Intelligence Builder retrieves empirical patterns, proposals, and active governed rules.',
      requiresClaude: false,
    };
  }

  // 9. Workflow & Next Action Checklist
  if (
    /what (should|to) (the investigator|i|we) (do|verify) next|what are the next steps|prepare (an? )?evidence checklist|investigation checklist/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.WORKFLOW_CHECKLIST,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Structured procedural rules and missing evidence checklist generated by Workflow Intelligence.',
      requiresClaude: false,
    };
  }

  // 10. Policy Compliance & Coverage
  if (
    /policy (conditions?|clauses?|coverage|limits)|is (the claim|it) covered under the policy|breach of policy/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.POLICY_COMPLIANCE,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Native Policy Intelligence compares known facts against standard policy warranties.',
      requiresClaude: false,
    };
  }

  // 11. Specific Case Lookup
  const caseIdMatch = text.match(/\b([A-Z]{2}-\d{3}|FL-\d{4})\b/i);
  if (
    /show (my )?recent investigations/i.test(text) ||
    /recent claims/i.test(text) ||
    (/summarize|tell me about|status of|open|look up/i.test(text) && caseIdMatch) ||
    /list (all )?scenarios/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.INVESTIGATION_LOOKUP,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      targetCaseId: caseIdMatch ? caseIdMatch[1].toUpperCase() : null,
      reason: 'Direct scenario and case database retrieval.',
      requiresClaude: false,
    };
  }

  // 12. Legal & Regulatory Lookups
  if (
    /regulations (in|for)|laws (in|for)|motor law|statute|traffic act/i.test(text) ||
    /reporting obligations in|mandatory insurance in/i.test(text) ||
    /compare (regulations|laws|jurisdictions)/i.test(text) ||
    /baremo|loi badinter|road traffic act|california insurance code/i.test(text)
  ) {
    if (/latest (changes|updates|amendments) in 2026|new regulatory requirements/i.test(text)) {
      return {
        intent: INTENT_TYPES.EXTERNAL_RESEARCH,
        outcome: ROUTING_OUTCOMES.OUTCOME_C_RESEARCH,
        reason: 'Current external statutory intelligence requested.',
        requiresClaude: false,
      };
    }
    return {
      intent: INTENT_TYPES.LEGAL_LOOKUP,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Pre-indexed, verified statutory database query covering 20 jurisdictions and 69 master statutes.',
      requiresClaude: false,
    };
  }

  // 13. Evidence Extraction & Metadata Lookup
  if (
    /what evidence has been (submitted|uploaded)/i.test(text) ||
    /list exhibits/i.test(text) ||
    /search (for )?(police report|telematics|witness statement|photos)/i.test(text) ||
    /find evidence/i.test(text) ||
    /what files are attached/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.EVIDENCE_LOOKUP,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Direct exhibit manifest and metadata inspection.',
      requiresClaude: false,
    };
  }

  // 14. Application Guidance & Navigation FAQs
  if (
    /what is faultline/i.test(text) ||
    /how does faultline work/i.test(text) ||
    /how (do i|to) (create|start|new) (an investigation|a claim|case)/i.test(text) ||
    /how (do i|to) upload evidence/i.test(text) ||
    /how (does|do) (document extraction|ocr) work/i.test(text) ||
    /what (is|are) the (cross-examination network|network graph|findings)/i.test(text) ||
    /how does the final (claim )?decision (engine |process )?work/i.test(text) ||
    /how (do i|to) export (reports|a report|pdf|word)/i.test(text) ||
    /where is the (legal|regulatory) library/i.test(text) ||
    /what does (keep under review|approve|reject) mean/i.test(text) ||
    /how to switch themes|dark mode|light mode/i.test(text) ||
    /troubleshoot|supported (file )?formats/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.APPLICATION_GUIDANCE,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Standard application guidance and documentation answered via internal knowledge base.',
      requiresClaude: false,
    };
  }

  // 15. Narrative Drafting
  if (
    /draft (a )?(case narrative|investigation narrative|report narrative|manager summary|memo)/i.test(text) ||
    /write an executive summary/i.test(text) ||
    /prepare a formal claims memo/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.NARRATIVE_GENERATION,
      outcome: ROUTING_OUTCOMES.OUTCOME_B_HYBRID,
      reason: 'High-fidelity professional narrative drafting requires advanced language generation.',
      requiresClaude: true,
    };
  }

  // 16. Open-Ended Case Reasoning
  if (
    /deep analysis|open-ended reasoning|synthesize the whole story|narrative interpretation/i.test(text)
  ) {
    return {
      intent: INTENT_TYPES.EVIDENCE_REASONING,
      outcome: ROUTING_OUTCOMES.OUTCOME_B_HYBRID,
      reason: 'Open-ended reasoning over unstructured narrative exhibits.',
      requiresClaude: true,
    };
  }

  // Default: If an active case exists and user asks general question about it, try native analysis first!
  if (context.activeCaseId || context.caseFile) {
    return {
      intent: INTENT_TYPES.INVESTIGATION_LOOKUP,
      outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
      reason: 'Active case inquiry routed to Native Intelligence first.',
      requiresClaude: false,
    };
  }

  // General FAQ fallback
  return {
    intent: INTENT_TYPES.APPLICATION_GUIDANCE,
    outcome: ROUTING_OUTCOMES.OUTCOME_A_INTERNAL,
    reason: 'General inquiry resolved via internal application knowledge.',
    requiresClaude: false,
  };
}
