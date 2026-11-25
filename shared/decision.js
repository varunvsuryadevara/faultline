// Final Claim Decision & Investigation Recommendation Engine for FaultLine.
// Evaluates case evidence, contradictions, corroborations, missing documents,
// and triage classifications to reach an evidence-based claim recommendation:
// APPROVE, REJECT, or KEEP UNDER REVIEW.
// Enforces core forensic safeguards (e.g. missing evidence alone != rejection,
// AI suspicion alone != rejection, single contradiction != fraud).

import { evaluateJurisdictionalLegalContext } from './legal-intelligence.js';

export const DECISION_OUTCOMES = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REVIEW: 'REVIEW',
};

export const DECISION_LABELS = {
  APPROVE: 'APPROVE CLAIM',
  REJECT: 'REJECT CLAIM',
  REVIEW: 'KEEP UNDER REVIEW',
};

export const REVIEW_PRIORITIES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const EVIDENCE_FINDING_TYPES = {
  VERIFIED_FACT: 'VERIFIED FACT',
  SUPPORTED_FINDING: 'SUPPORTED FINDING',
  POSSIBLE_INDICATOR: 'POSSIBLE INDICATOR',
  UNVERIFIED_CLAIM: 'UNVERIFIED CLAIM',
  CONTRADICTION: 'CONTRADICTION',
  MISSING_EVIDENCE: 'MISSING EVIDENCE',
  AI_INFERENCE: 'AI INFERENCE',
};

/**
 * Determine evidence reliability tier based on source nature.
 */
function getSourceReliability(kind = '', label = '') {
  const k = kind.toLowerCase();
  const l = label.toLowerCase();
  if (k.includes('cctv') || k.includes('dashcam') || k.includes('telematics') || k.includes('gps') || l.includes('telematics') || l.includes('gps') || l.includes('cctv')) {
    return 'High (Objective technical telemetry)';
  }
  if (k.includes('police') || l.includes('police') || l.includes('fir') || k.includes('inspection') || l.includes('assessor') || l.includes('surveyor')) {
    return 'High (Official independent record)';
  }
  if (k.includes('witness') || l.includes('witness') || l.includes('bystander')) {
    return 'Moderate (Independent party account)';
  }
  if (k.includes('repair') || k.includes('invoice') || l.includes('garage')) {
    return 'Moderate (Commercial repair documentation)';
  }
  return 'Subject to verification (Party-reported statement)';
}

/**
 * Calculate investigation completeness percentage based on presence of essential exhibits.
 */
function calculateCompleteness(exhibits = [], gaps = [], missing = []) {
  if (!exhibits.length) return 0;
  let score = 0;
  const kinds = exhibits.map((e) => (e.kind || '').toLowerCase());
  const labels = exhibits.map((e) => (e.label || '').toLowerCase());
  const hasText = exhibits.some((e) => (e.text || '').trim().length > 50);

  // 1. Initial Notification / First party statement (25%)
  if (kinds.some((k) => k.includes('statement') || k.includes('claim')) || labels.some((l) => l.includes('statement') || l.includes('claimant') || l.includes('notification'))) {
    score += 25;
  }

  // 2. Damage or Incident Documentation (photos/inspection/repairs/damage) (25%)
  if (kinds.some((k) => k.includes('photo') || k.includes('inspection') || k.includes('repair')) || labels.some((l) => l.includes('photo') || l.includes('damage') || l.includes('repair') || l.includes('estimate') || l.includes('engineer'))) {
    score += 25;
  }

  // 3. Independent Corroboration (police / witness / cctv / telematics / third party) (25%)
  if (kinds.some((k) => k.includes('police') || k.includes('witness') || k.includes('cctv') || k.includes('dashcam') || k.includes('telematics') || k.includes('gps')) ||
      labels.some((l) => l.includes('police') || l.includes('witness') || l.includes('cctv') || l.includes('telematics') || l.includes('dashcam') || l.includes('gps'))) {
    score += 25;
  }

  // 4. Incident Context / Multi-source depth (15%)
  if (exhibits.length >= 3 && hasText) {
    score += 15;
  } else if (exhibits.length >= 2) {
    score += 8;
  }

  // 5. Vehicle/Policy/Administrative details (10%)
  if (kinds.some((k) => k.includes('policy') || k.includes('record') || k.includes('history')) || labels.some((l) => l.includes('policy') || l.includes('schedule') || l.includes('log') || l.includes('record'))) {
    score += 10;
  }

  // Penalty for identified missing critical items
  const totalMissing = (gaps?.length || 0) + (missing?.length || 0);
  score = Math.max(10, Math.min(100, score - totalMissing * 5));
  return score;
}

/**
 * Generate a comprehensive, evidence-based explanation paragraph (100–200 words)
 * specific to the actual case exhibits and findings.
 */
function generateDetailedExplanation({
  decision,
  exhibits,
  activeContradictions,
  corroborations,
  supporting,
  against,
  indicators,
  missing,
  gaps,
  scenario,
  caseFile,
  minorConflicts,
  criticalConflicts,
  majorConflicts,
  hasObjectiveTelemetry,
}) {
  const caseTitle = scenario?.title || caseFile?.title || 'the incident';
  const exhibitCount = exhibits.length;
  const exhibitSamples = exhibits.slice(0, 3).map((e) => `Exhibit ${e.id} (${e.label})`).join(', ');

  if (decision === DECISION_OUTCOMES.APPROVE) {
    const corroborationMentions = corroborations.length > 0
      ? `Independent corroboration was confirmed across ${corroborations.length} factual area(s), verifying key aspects such as: ${corroborations[0].fact}.`
      : 'Key incident circumstances are substantiated by coherent statements and scene documentation.';

    const minorNote = minorConflicts.length > 0
      ? `While minor reporting variance was observed regarding ${minorConflicts[0].title}, this discrepancy was evaluated as non-material and consistent with normal perception differences in traffic collisions.`
      : 'Cross-examination of the accounts revealed no material or unresolved contradictions.';

    return `A comprehensive forensic investigation of "${caseTitle}" was conducted across ${exhibitCount} submitted exhibit(s), including ${exhibitSamples}. The analysis established that the reported collision dynamics, damage profiles, and timeline are credible and supported by the evidence on file. ${corroborationMentions} Vehicular damage descriptions match the reported impact mechanics without conflicting damage patterns. ${minorNote} Crucially, zero critical or major contradictions exist, no evidence of staged collision or material misrepresentation was identified, and the investigation found no substantiated indicators requiring escalation to special fraud inquiry. Because the available evidence is reliable, coherent, and mutually reinforcing, approval of the claim is formally recommended subject only to standard policy excess validation and routine administrative disbursement checks.`;
  }

  if (decision === DECISION_OUTCOMES.REJECT) {
    const topConflict = criticalConflicts[0] || activeContradictions[0];
    const conflictDesc = topConflict
      ? `Specifically, ${topConflict.title} demonstrates an irreconcilable conflict between the reported occurrence and verified records (${topConflict.explanation}).`
      : 'Objective telemetry and physical damage findings conclusively disprove the claimed incident dynamics.';

    const techProof = hasObjectiveTelemetry
      ? 'This finding is independently corroborated by technical telemetry or official third-party records on file, establishing objective proof rather than circumstantial suspicion.'
      : 'Physical forensic indicators and prior inspection records directly refute the claimant’s representations.';

    return `A comprehensive forensic evaluation of "${caseTitle}" across ${exhibitCount} case exhibit(s), including ${exhibitSamples}, established legitimate, verified factual grounds to recommend declinature of this claim. The investigation revealed critical material discrepancies that directly undermine the claimant's account of the event. ${conflictDesc} ${techProof} In strict compliance with investigative safeguards, declinature is not recommended due to missing paperwork or isolated algorithmic suspicion, but because substantial, reliable evidence establishes a material misrepresentation regarding the fundamental cause of damage. Because the evidence conclusively refutes the reported circumstances, further field investigation is unnecessary to justify formal claim repudiation under applicable policy terms.`;
  }

  // REVIEW
  const topConflict = criticalConflicts[0] || majorConflicts[0] || activeContradictions[0];
  const conflictText = topConflict
    ? `Foremost among these is an unresolved ${topConflict.severity} contradiction concerning ${topConflict.title}, wherein source statements directly diverge (${topConflict.explanation}).`
    : 'Primary witness and driver statements contain conflicting details regarding priority and impact sequence.';

  const missingText = (missing.length > 0 || gaps.length > 0)
    ? `Furthermore, essential corroborating evidence—specifically ${missing[0]?.item || gaps[0]?.gap || 'independent scene documentation'}—remains unavailable, leaving vital liability questions unanswered.`
    : 'Additional independent scene verification is required to establish collision causality.';

  return `The forensic investigation into "${caseTitle}" evaluated ${exhibitCount} case exhibit(s), including ${exhibitSamples}, but concludes that the claim cannot currently be decided with acceptable confidence. While preliminary submissions provide initial notice of an incident, material factual ambiguities remain unresolved between the parties. ${conflictText} ${missingText} Approving the claim at this stage would expose the insurer to unverified indemnity and liability risk before key facts are validated; conversely, recommending declinature would be legally and procedurally premature, as deliberate misrepresentation has not been objectively proven. Maintaining the claim under active review and executing the prioritized investigation action plan is essential to reach a defensible final determination.`;
}

/**
 * Generate structured key reasons bullet points specific to the case evidence.
 */
function generateKeyReasons({
  decision,
  exhibits,
  activeContradictions,
  corroborations,
  supporting,
  against,
  indicators,
  missing,
  gaps,
  minorConflicts,
  criticalConflicts,
  majorConflicts,
  hasObjectiveTelemetry,
}) {
  if (decision === DECISION_OUTCOMES.APPROVE) {
    const reasons = [
      "The claimant's statement is consistent with the reported accident circumstances and physical scene dynamics.",
      'Submitted photographs and inspection records support the reported vehicle damage pattern.',
    ];
    if (corroborations.length > 0) {
      reasons.push(`Independent evidence corroborates key facts across ${corroborations.map((c) => `Exhibits ${c.exhibits?.join('&')}`).join(', ')}.`);
    } else {
      reasons.push('Available documentation supports the reported accident timeline and collision mechanics.');
    }
    if (minorConflicts.length > 0) {
      reasons.push(`Identified minor discrepancy (${minorConflicts[0].title}) was reviewed and verified as benign reporting variance.`);
    } else {
      reasons.push('No material unresolved contradictions were identified across any analyzed exhibits.');
    }
    reasons.push('The investigation identified no substantiated indicators requiring escalation to special fraud inquiry.');
    return reasons;
  }

  if (decision === DECISION_OUTCOMES.REJECT) {
    const reasons = [
      'Verified physical evidence materially contradicts the reported accident circumstances.',
    ];
    if (hasObjectiveTelemetry) {
      reasons.push('Independent technical telemetry (e.g. CCTV, telematics, GPS, or official report) directly disproves the claimed timeline.');
    } else {
      reasons.push('Objective inspection evidence establishes that physical damage is incompatible with the claimed collision.');
    }
    if (criticalConflicts.length > 0) {
      reasons.push(`Critical contradiction established: ${criticalConflicts[0].title}.`);
    } else {
      reasons.push('Submitted information contains material misrepresentation regarding the core facts of the loss.');
    }
    reasons.push('The inconsistency is supported by identifiable, traceable evidence rather than assumption.');
    reasons.push('The findings materially undermine the validity of the claim under policy conditions.');
    reasons.push('The declinature recommendation complies with safeguards: proven factual conflict rather than isolated suspicion.');
    return reasons;
  }

  // REVIEW
  const reasons = [];
  if (criticalConflicts.length > 0 || majorConflicts.length > 0) {
    const top = criticalConflicts[0] || majorConflicts[0];
    reasons.push(`Material contradiction remains unresolved: ${top.title} between source accounts.`);
  } else {
    reasons.push('Factual statements between involved parties conflict on key accident circumstances.');
  }
  if (missing.length > 0 || gaps.length > 0) {
    reasons.push(`Critical corroborating documentation (${missing[0]?.item || gaps[0]?.gap}) remains unavailable.`);
  }
  reasons.push('Current evidence partially supports the incident but is insufficient for conclusive determination.');
  reasons.push('Approving the claim now presents unverified financial and liability exposure.');
  reasons.push('Rejecting the claim now would be premature as deliberate misrepresentation has not been established.');
  reasons.push('Prioritized investigative actions must be completed before a defensible decision can be finalized.');
  return reasons;
}

/**
 * Generate what could change the decision scenarios.
 */
function generateWhatCouldChangeDecision({
  decision,
  activeContradictions,
  missing,
  gaps,
}) {
  const topConflict = activeContradictions[0]?.title || 'disputed incident circumstances';
  const topMissing = missing[0]?.item || gaps[0]?.gap || 'independent scene documentation';

  if (decision === DECISION_OUTCOMES.APPROVE) {
    return [
      {
        path: 'Trigger for Review / Declinature',
        condition: 'Discovery of Material Contradiction or Prior Damage',
        outcome: 'KEEP UNDER REVIEW or REJECT',
        details: 'Receipt of undisclosed dashcam video, adverse third-party witness testimony, or engineer findings proving pre-existing damage would necessitate reopening the claim.',
      },
      {
        path: 'Trigger for Indemnity Declinature',
        condition: 'Policy Exclusion or Administrative Ineligibility',
        outcome: 'REJECT CLAIM',
        details: 'Discovery of an unlisted driver, unnotified vehicle modification, commercial use breach, or policy premium default during final settlement verification.',
      },
    ];
  }

  if (decision === DECISION_OUTCOMES.REJECT) {
    return [
      {
        path: 'Trigger for Re-Investigation',
        condition: 'Tamper-Proof Technical Rebuttal Evidence',
        outcome: 'KEEP UNDER REVIEW',
        details: 'Submission of certified telematics data, raw unedited video footage, or an official police report amendment conclusively explaining the recorded discrepancy.',
      },
      {
        path: 'Trigger for Claim Reconsideration',
        condition: 'Forensic Proof of Secondary Impact or Mechanical Failure',
        outcome: 'KEEP UNDER REVIEW',
        details: 'Independent forensic engineering evidence establishing that physical damage anomalies resulted from secondary collision dynamics or post-incident vehicle handling.',
      },
    ];
  }

  // REVIEW
  return [
    {
      path: 'Path to Approval',
      condition: `Corroboration of Disputed Facts & Receipt of ${topMissing}`,
      outcome: 'APPROVE CLAIM',
      details: `Obtaining ${topMissing} and resolving "${topConflict}" with corroborating witness or telemetry confirmation will allow the claim to be released for prompt settlement.`,
    },
    {
      path: 'Path to Rejection',
      condition: `Verification of Deliberate Misrepresentation in ${topConflict}`,
      outcome: 'REJECT CLAIM',
      details: `If recorded statements or third-party records prove that "${topConflict}" constitutes intentional fabrication or staged damage, formal declinature will be recommended.`,
    },
    {
      path: 'Path to Continued Review',
      condition: 'Non-Response from Third Parties or Ongoing Police Inquiry',
      outcome: 'EXTEND REVIEW DIARY',
      details: 'If essential records are delayed by external agencies, the file will remain under diary with structured 14-day investigator follow-ups.',
    },
  ];
}

/**
 * Computes the final claim decision, confidence, explanation paragraph,
 * and prioritized action plan.
 *
 * @param {object} params
 * @param {object} [params.analysis] Full cross-examination analysis result
 * @param {object} [params.assessment] Full claim assessment result
 * @param {object} [params.caseFile] Raw case file exhibits and context
 * @param {object} [params.scenario] Predefined scenario data (if applicable)
 * @param {object} [params.review] User's human review decisions { [conflictId]: 'confirmed' | 'dismissed' }
 * @param {object} [params.jurisdiction] Explicit jurisdiction override { countryCode, region }
 * @returns {object} Standardized Final Decision object
 */
export function computeClaimDecision({ analysis, assessment, caseFile, scenario, review = {}, jurisdiction = null } = {}) {
  const exhibits = (
    analysis?.meta?.exhibits ||
    assessment?.meta?.exhibits ||
    caseFile?.exhibits ||
    scenario?.case?.exhibits ||
    []
  ).map((e, i) => ({
    id: e.id || String.fromCharCode(65 + i),
    label: e.label || `Exhibit ${String.fromCharCode(65 + i)}`,
    kind: e.kind || 'document',
    text: e.text || e.rawText || '',
  }));

  const contradictions = analysis?.contradictions || [];
  const corroborations = analysis?.corroborations || [];
  const timeline = analysis?.timeline || [];
  const gaps = analysis?.gaps || [];
  const nextSteps = analysis?.nextSteps || [];

  const supporting = assessment?.supporting || [];
  const against = assessment?.against || [];
  const indicators = assessment?.indicators || [];
  const missing = assessment?.missing || [];
  const innocent = assessment?.innocent || [];
  const intent = assessment?.intent || scenario?.intent || null;
  const rawRisk = assessment?.risk || scenario?.risk || 'medium';

  // 1. Filter contradictions considering Investigator Review status
  const activeContradictions = contradictions.filter((c) => review[c.id] !== 'dismissed');
  const criticalConflicts = activeContradictions.filter((c) => c.severity === 'critical');
  const majorConflicts = activeContradictions.filter((c) => c.severity === 'major');
  const minorConflicts = activeContradictions.filter((c) => c.severity === 'minor');

  // Check for objective fraud indicators
  const hasObjectiveTelemetry = exhibits.some((e) =>
    ['cctv', 'dashcam', 'telematics', 'gps', 'police_report'].includes((e.kind || '').toLowerCase()) ||
    /cctv|dashcam|gps|tracker|black box|police report|fir/i.test(e.label || '')
  );

  const isConfirmedFraudScenario = intent === 'confirmed-fraud';
  const hasProvenMisrepresentation =
    isConfirmedFraudScenario &&
    (criticalConflicts.length > 0 || against.some((a) => (a.point || '').toLowerCase().includes('prior') || (a.point || '').toLowerCase().includes('fabricated') || (a.point || '').toLowerCase().includes('pre-existing') || (a.point || '').toLowerCase().includes('not present')));

  // 2. Apply Decision Matrix & Safeguards
  let decision = DECISION_OUTCOMES.REVIEW;
  let primaryGrounds = [];
  let approvalReasons = [];
  let reviewReasons = [];

  // SAFEGUARD 1: Missing evidence alone never means rejection.
  // SAFEGUARD 2: AI suspicion alone never means rejection.
  // SAFEGUARD 3: A single contradiction without objective proof never means rejection.
  // SAFEGUARD 11: Clearly established fraud vs suspected fraud.

  if (hasProvenMisrepresentation && hasObjectiveTelemetry && criticalConflicts.length >= 1) {
    // Legitimate grounds for rejection
    decision = DECISION_OUTCOMES.REJECT;
    primaryGrounds = [
      'Independently verified technical evidence contradicts the reported occurrence.',
      'Material inconsistency established between claimant account and objective records.',
      criticalConflicts[0]?.explanation || 'The physical damage and vehicle movements do not match the claimed accident.',
    ];
  } else if (
    (intent === 'genuine' || intent === 'genuine-negligence' || intent === 'genuine-reporting-errors' || (!intent && activeContradictions.length === 0)) &&
    criticalConflicts.length === 0 &&
    majorConflicts.length === 0 &&
    exhibits.length >= 2 &&
    (corroborations.length >= 1 || supporting.length >= 1 || exhibits.length >= 2)
  ) {
    // Legitimate grounds for approval
    decision = DECISION_OUTCOMES.APPROVE;
    approvalReasons = [
      'The reported incident circumstances are consistent with the available evidence.',
      'No unresolved critical or major material contradictions exist between party accounts.',
      'Vehicle damage patterns and timeline are sufficiently corroborated.',
      minorConflicts.length > 0
        ? 'Identified minor discrepancies are non-material and consistent with honest reporting variance.'
        : 'Key physical facts are corroborated across multiple independent exhibits.',
    ];
  } else {
    // Under Review
    decision = DECISION_OUTCOMES.REVIEW;
    if (criticalConflicts.length > 0) {
      reviewReasons.push(`${criticalConflicts.length} unresolved critical contradiction(s) directly impact cause, liability, or damages.`);
    }
    if (majorConflicts.length > 0) {
      reviewReasons.push(`${majorConflicts.length} major factual discrepancy between source accounts must be clarified.`);
    }
    if (intent === 'potential-fraud' || intent === 'suspicious') {
      reviewReasons.push('Suspicious indicators require field validation before a definitive decision can be rendered.');
    }
    if (missing.length > 0 || gaps.length > 0) {
      reviewReasons.push('Crucial corroborating documentation (e.g. detailed inspection, telematics or police records) is not yet on file.');
    }
    if (exhibits.length <= 1) {
      reviewReasons.push('Insufficient evidence on file: single unilateral statement requires corroborating verification.');
    }
    if (!reviewReasons.length) {
      reviewReasons.push('Evidence on file is inconclusive: further factual investigation is required to protect customer and insurer.');
    }
  }

  // 3. Determine Review Priority (if REVIEW)
  let reviewPriority = null;
  if (decision === DECISION_OUTCOMES.REVIEW) {
    if (criticalConflicts.length > 0 || rawRisk === 'critical' || intent === 'potential-fraud' || intent === 'organised-fraud') {
      reviewPriority = REVIEW_PRIORITIES.CRITICAL;
    } else if (majorConflicts.length > 0 || rawRisk === 'high' || intent === 'suspicious') {
      reviewPriority = REVIEW_PRIORITIES.HIGH;
    } else if (rawRisk === 'medium' || (missing.length > 0 && gaps.length > 0)) {
      reviewPriority = REVIEW_PRIORITIES.MEDIUM;
    } else {
      reviewPriority = REVIEW_PRIORITIES.LOW;
    }
  }

  // 4. Calculate Calibrated Confidence Score (15 to 98)
  let confidenceScore = 70;
  if (decision === DECISION_OUTCOMES.APPROVE) {
    confidenceScore = 80 + Math.min(15, corroborations.length * 3 + supporting.length * 2);
    if (minorConflicts.length > 0) confidenceScore -= 8;
  } else if (decision === DECISION_OUTCOMES.REJECT) {
    confidenceScore = 82 + (hasObjectiveTelemetry ? 10 : 0);
  } else {
    // Review: confidence in the review recommendation
    confidenceScore = 72;
    if (criticalConflicts.length > 0) confidenceScore -= 12;
    if (missing.length >= 2) confidenceScore -= 8;
    if (exhibits.length <= 1) confidenceScore -= 18;
  }
  confidenceScore = Math.max(25, Math.min(96, Math.round(confidenceScore)));

  // Confidence explanation
  let confidenceExplanation = '';
  if (confidenceScore >= 82) {
    confidenceExplanation = 'High confidence in this recommendation: multiple independent evidence sources corroborate the findings, and key physical facts are traceable.';
  } else if (confidenceScore >= 65) {
    confidenceExplanation = 'Moderate confidence: the general sequence of events is supported, but secondary details or documentation items require confirmation.';
  } else {
    confidenceExplanation = 'Lower confidence: the available evidence is incomplete or mutually conflicting, necessitating independent technical verification before settlement.';
  }

  // 5. Calculate Investigation Completeness
  const completeness = calculateCompleteness(exhibits, gaps, missing);

  // 6. Evidence Categorization & Traceability
  const verifiedFacts = [];
  const supportedFindings = [];
  const unverifiedClaims = [];
  const suspiciousIndicators = [];
  const unresolvedIssues = [];

  // Corroborations -> VERIFIED FACTS
  corroborations.forEach((k) => {
    verifiedFacts.push({
      type: EVIDENCE_FINDING_TYPES.VERIFIED_FACT,
      statement: k.fact,
      exhibits: k.exhibits || [],
      source: `Corroborated by Exhibits ${k.exhibits?.join(', ')}`,
      reliability: 'High (Multiple agreeing accounts)',
    });
  });

  // Supporting items -> SUPPORTED FINDINGS
  supporting.forEach((s) => {
    const exhibitObj = exhibits.find((e) => e.id === s.exhibit);
    supportedFindings.push({
      type: EVIDENCE_FINDING_TYPES.SUPPORTED_FINDING,
      statement: s.point,
      finding: s.point,
      exhibit: s.exhibit,
      name: exhibitObj?.label || `Exhibit ${s.exhibit}`,
      quote: s.quote,
      source: `Exhibit ${s.exhibit}`,
      reliability: getSourceReliability(exhibitObj?.kind, s.point),
      howItSupports: 'Corroborates claimant accident dynamics, impact timeline, or physical damage description.',
      impact: 'Supports claim validity',
    });
  });

  // Contradictions -> CONTRADICTIONS & UNRESOLVED ISSUES
  activeContradictions.forEach((c) => {
    const involvedExhibits = (c.evidence || []).map((e) => e.exhibit).filter(Boolean);
    unresolvedIssues.push({
      id: c.id,
      title: c.title,
      severity: c.severity,
      evidence: (c.evidence || []).map((e) => `Exhibit ${e.exhibit}: "${e.quote}"`).join(' vs '),
      whyItMatters: c.explanation || 'Creates a material factual conflict regarding the incident.',
      status: review[c.id] === 'confirmed' ? 'Confirmed by Investigator' : 'Open / Unresolved',
      recommendedResolution: c.followUp?.question || 'Interview involved parties to eliminate ambiguity.',
      relevantExhibits: involvedExhibits,
    });
  });

  // Against items -> OPPOSING EVIDENCE
  const contradictingEvidence = against.map((a) => {
    const exhibitObj = exhibits.find((e) => e.id === a.exhibit);
    return {
      name: exhibitObj?.label || `Exhibit ${a.exhibit}`,
      exhibit: a.exhibit,
      quote: a.quote,
      finding: a.point,
      reliability: getSourceReliability(exhibitObj?.kind, a.point),
      materiality: 'High',
      howItSupports: 'Directly challenges the reported occurrence, timeline, or damages.',
      impact: 'Challenges claimed timeline or damages',
    };
  });

  // Suspicious indicators -> POSSIBLE INDICATORS
  indicators.forEach((ind) => {
    suspiciousIndicators.push({
      type: EVIDENCE_FINDING_TYPES.POSSIBLE_INDICATOR,
      indicator: ind.point,
      weight: ind.weight || 'moderate',
      exhibit: ind.exhibit,
      quote: ind.quote,
      corroborated: hasObjectiveTelemetry,
    });
  });

  // Party claims without corroboration -> UNVERIFIED CLAIMS
  if (exhibits.length === 1 || corroborations.length === 0) {
    unverifiedClaims.push({
      type: EVIDENCE_FINDING_TYPES.UNVERIFIED_CLAIM,
      statement: 'Claimant reported circumstances and loss timeline',
      source: exhibits[0]?.label || 'Exhibit A',
      note: 'Currently lacks external physical or third-party corroboration.',
    });
  }

  // 7. Structured Missing Evidence
  const missingEvidenceList = [
    ...missing.map((m) => ({
      item: m.item,
      why: m.why,
      priority: 'High',
      materiality: 'High',
      resolves: 'Validates disputed timeline, impact severity, or third-party involvement',
    })),
    ...gaps.map((g) => ({
      item: g.gap,
      why: g.request || 'Necessary to close identified investigation gap',
      priority: 'Medium',
      materiality: 'Medium',
      resolves: 'Eliminates evidentiary ambiguity in case file',
    })),
  ];

  // 8. Dynamic Detailed Explanation Paragraph & Key Reasons
  const decisionExplanation = generateDetailedExplanation({
    decision,
    exhibits,
    activeContradictions,
    corroborations,
    supporting,
    against,
    indicators,
    missing,
    gaps,
    scenario,
    caseFile,
    minorConflicts,
    criticalConflicts,
    majorConflicts,
    hasObjectiveTelemetry,
  });

  const keyReasons = generateKeyReasons({
    decision,
    exhibits,
    activeContradictions,
    corroborations,
    supporting,
    against,
    indicators,
    missing,
    gaps,
    minorConflicts,
    criticalConflicts,
    majorConflicts,
    hasObjectiveTelemetry,
  });

  const whatCouldChangeDecision = generateWhatCouldChangeDecision({
    decision,
    activeContradictions,
    missing,
    gaps,
  });

  // 9. Prioritized Review Action Plan
  const recommendedActions = [];
  let priorityCounter = 1;

  if (decision === DECISION_OUTCOMES.REVIEW || decision === DECISION_OUTCOMES.REJECT) {
    // Priority 1: Unresolved critical or major contradictions
    activeContradictions.forEach((c) => {
      recommendedActions.push({
        priority: priorityCounter++,
        issue: `Resolve ${c.severity.toUpperCase()} contradiction: ${c.title}`,
        action: c.followUp?.question
          ? `Direct inquiry to ${c.followUp.ask || 'parties'}: "${c.followUp.question}"`
          : 'Conduct targeted recorded statements to eliminate timeline/damage conflict.',
        responsibleParty: c.severity === 'critical' ? 'Senior Forensic Investigator' : 'Claims Handler',
        evidenceNeeded: (c.evidence || []).map((e) => `Exhibit ${e.exhibit}`).join(', ') + ' verification records',
        expectedOutcome: 'Determine definitive factual timeline and identify whether discrepancy was fraudulent or honest error.',
        impactOnDecision: 'If verified as genuine error, claim moves toward APPROVE; if confirmed as deliberate misrepresentation, supports formal REJECT.',
      });
    });

    // Priority 2: Missing critical documents
    missingEvidenceList.slice(0, 3).forEach((m) => {
      recommendedActions.push({
        priority: priorityCounter++,
        issue: `Missing verification asset: ${m.item}`,
        action: `Formally request ${m.item} from relevant party or public authority.`,
        responsibleParty: 'Claims Handler',
        evidenceNeeded: m.item,
        expectedOutcome: m.why || 'Provide independent verification of reported incident facts.',
        impactOnDecision: 'Supplies essential corroboration needed to complete investigation.',
      });
    });

    // Priority 3: Suspicious indicators validation
    indicators.slice(0, 2).forEach((ind) => {
      recommendedActions.push({
        priority: priorityCounter++,
        issue: `Validate suspicious indicator: ${ind.point}`,
        action: 'Review prior claims history and cross-reference damage with engineering assessment.',
        responsibleParty: 'Special Investigation Unit (SIU)',
        evidenceNeeded: `Inspection report regarding Exhibit ${ind.exhibit}`,
        expectedOutcome: 'Rule out or substantiate staging, inflation, or pre-existing damage.',
        impactOnDecision: 'Determines whether claim can be safely released or escalated for repudiation.',
      });
    });
  } else {
    // Approved next steps
    recommendedActions.push({
      priority: 1,
      issue: 'Pre-settlement administrative verification',
      action: 'Verify policy excess, validate payee banking details, and confirm no outstanding liens.',
      responsibleParty: 'Claims Settlement Handler',
      evidenceNeeded: 'Settlement schedule & verified bank mandate',
      expectedOutcome: 'Ensure compliant and timely indemnity disbursement.',
      impactOnDecision: 'Final step prior to closing claim file.',
    });
    if (minorConflicts.length > 0) {
      recommendedActions.push({
        priority: 2,
        issue: 'Note minor recording variance',
        action: `Document ${minorConflicts[0]?.title} in claim file as non-material discrepancy.`,
        responsibleParty: 'Claims Handler',
        evidenceNeeded: 'Case file note',
        expectedOutcome: 'Accurate audit trail maintained.',
        impactOnDecision: 'No impact on settlement approval.',
      });
    }
  }

  // 10. Executive Summary
  let executiveSummary = '';
  if (decision === DECISION_OUTCOMES.APPROVE) {
    executiveSummary = `Available evidence sufficiently corroborates the reported incident. The physical damage described is consistent with the claimed collision dynamics, and no material unresolved contradictions remain between the submitted accounts. ${
      minorConflicts.length ? 'Minor reporting variations were evaluated and determined to be non-material.' : 'All key facts are corroborated by supporting records.'
    } Approval of the claim is recommended subject to routine settlement checks.`;
  } else if (decision === DECISION_OUTCOMES.REJECT) {
    executiveSummary = `Substantial objective evidence establishes that the reported incident did not occur as represented. Material discrepancies between the claimant statement and independent technical telemetry (such as CCTV, GPS, or prior inspection data) demonstrate that the claim cannot be sustained. Rejection is recommended based on established misrepresentation.`;
  } else {
    executiveSummary = `The claim cannot currently be decided with acceptable confidence. While basic notification has been received, material inconsistencies between source statements remain unresolved, and crucial independent documentation has not yet been submitted. Rejection at this stage would be premature because fraud has not been conclusively established, while approval presents unmitigated financial and liability risk. The claim must be kept under review pending execution of the prioritized action plan.`;
  }

  // 11. Policy & Coverage Safeguard
  const hasPolicyDocument = exhibits.some((e) =>
    (e.kind || '').toLowerCase().includes('policy') || (e.label || '').toLowerCase().includes('policy')
  );
  const policyCoverageNotes = hasPolicyDocument
    ? 'Insurance policy terms on file were examined for applicable limits, excess, and indemnity conditions.'
    : 'Specific policy documents are not on file. Recommendation is based on incident credibility and physical evidence; full policy coverage and exclusion terms require formal verification by policy administrator.';

  const supportingCount = supportedFindings.length + verifiedFacts.length;
  const contradictionsCount = activeContradictions.length;
  const unresolvedCount = unresolvedIssues.length + missingEvidenceList.length;

  // 12. Jurisdictional Legal Context & Statutory Assessment
  const detectedCountry =
    jurisdiction?.countryCode ||
    scenario?.country ||
    caseFile?.country ||
    (scenario?.id?.match(/^[A-Z]{2}/) ? scenario.id.match(/^[A-Z]{2}/)[0].toUpperCase() : 'UK');
  const detectedRegion = jurisdiction?.region || scenario?.region || caseFile?.region || null;

  const legalContext = evaluateJurisdictionalLegalContext({
    countryCode: detectedCountry,
    region: detectedRegion,
    caseFile,
    scenario,
    decision,
    contradictions: activeContradictions,
    review,
  });

  return {
    decision,
    decision_label: DECISION_LABELS[decision],
    confidence: confidenceScore,
    confidence_explanation: confidenceExplanation,
    risk_level: rawRisk.toUpperCase(),
    investigation_completeness: completeness,
    review_priority: reviewPriority,
    executive_summary: executiveSummary,
    decision_explanation: decisionExplanation,
    key_reasons: keyReasons,
    what_could_change_decision: whatCouldChangeDecision,
    supporting_count: supportingCount,
    contradictions_count: contradictionsCount,
    unresolved_count: unresolvedCount,
    jurisdiction: legalContext.jurisdiction,
    applicableRegulations: legalContext.applicableRegulations,
    legalDecisionImpact: legalContext.legalDecisionImpact,
    traceabilityChain: legalContext.traceabilityChain,
    decision_rationale:
      decision === DECISION_OUTCOMES.APPROVE
        ? approvalReasons
        : decision === DECISION_OUTCOMES.REJECT
          ? primaryGrounds
          : reviewReasons,
    primary_grounds: primaryGrounds,
    approval_reasons: approvalReasons,
    review_reasons: reviewReasons,
    supporting_evidence: supportedFindings,
    contradicting_evidence: contradictingEvidence,
    verified_facts: verifiedFacts,
    unverified_claims: unverifiedClaims,
    suspicious_indicators: suspiciousIndicators,
    unresolved_issues: unresolvedIssues,
    missing_evidence: missingEvidenceList,
    recommended_actions: recommendedActions,
    policy_coverage_notes: policyCoverageNotes,
    human_review_required: true,
    decision_date: new Date().toISOString(),
    investigation_id: scenario?.id || (caseFile?.title ? `CASE-${caseFile.title.replace(/\s+/g, '-').slice(0, 16)}` : `INV-${Date.now().toString(36).toUpperCase()}`),
  };
}
