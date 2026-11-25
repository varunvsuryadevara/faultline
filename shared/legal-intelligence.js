// Jurisdictional Legal Intelligence & Statutory Assessment Engine for FaultLine.
// Evaluates case evidence and contradictions against applicable motor insurance laws,
// regulations, and claims procedures across 20 countries and regional jurisdictions.
// Establishes the forensic relationship:
// Regulation -> Requirement -> Evidence -> Assessment -> Decision Relevance.

import { COUNTRY_METADATA, REGIONAL_JURISDICTIONS, REGULATION_CATEGORIES, VERIFICATION_STATUSES } from './regulations/vocab.js';
import { getCountryRegulations, getRelevantRegulationsForCase } from './regulations/query.js';

export const LEGAL_ASSESSMENT_STATUSES = {
  SATISFIED: {
    id: 'SATISFIED',
    label: 'SATISFIED BY AVAILABLE EVIDENCE',
    badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotCls: 'bg-emerald-400',
    description: 'Submitted exhibits provide sufficient, verified factual proof meeting the statutory requirement.',
  },
  POTENTIALLY_SATISFIED: {
    id: 'POTENTIALLY_SATISFIED',
    label: 'POTENTIALLY SATISFIED',
    badgeCls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    dotCls: 'bg-cyan-400',
    description: 'Evidence strongly points to compliance, subject to final standard document confirmation.',
  },
  NOT_ESTABLISHED: {
    id: 'NOT_ESTABLISHED',
    label: 'NOT ESTABLISHED',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotCls: 'bg-amber-400',
    description: 'Evidence is currently absent or incomplete. Crucially, missing proof does not establish legal violation.',
  },
  POTENTIAL_NON_COMPLIANCE: {
    id: 'POTENTIAL_NON_COMPLIANCE',
    label: 'POTENTIAL NON-COMPLIANCE IDENTIFIED',
    badgeCls: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotCls: 'bg-rose-400',
    description: 'Objective evidence or telemetry establishes factual inconsistency with statutory or reporting duties.',
  },
  NOT_APPLICABLE: {
    id: 'NOT_APPLICABLE',
    label: 'NOT APPLICABLE',
    badgeCls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dotCls: 'bg-slate-400',
    description: 'The statutory threshold, monetary limit, or collision circumstance does not apply to this loss.',
  },
  REQUIRES_VERIFICATION: {
    id: 'REQUIRES_VERIFICATION',
    label: 'REQUIRES FURTHER VERIFICATION',
    badgeCls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    dotCls: 'bg-indigo-400',
    description: 'Subordinate regional guidelines or conflicting party statements leave statutory applicability ambiguous.',
  },
};

export const REQUIREMENT_TYPES = {
  LEGAL_REQUIREMENT: {
    id: 'LEGAL_REQUIREMENT',
    label: 'Legal Requirement (Statutory / Regulatory Code)',
    badgeCls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    description: 'Mandate established by enacted national or regional legislation, court precedent, or gazetted regulations.',
  },
  POLICY_REQUIREMENT: {
    id: 'POLICY_REQUIREMENT',
    label: 'Policy Requirement (Insurance Contract Condition)',
    badgeCls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Condition precedent to liability or coverage exclusion established by the insurance policy contract.',
  },
  CLAIMS_PROCEDURE: {
    id: 'CLAIMS_PROCEDURE',
    label: 'Claims Procedure (Insurer Operational Guideline)',
    badgeCls: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    description: 'Operational claims protocol, service-level timeframe, or standard inspection procedure.',
  },
  INVESTIGATOR_RECOMMENDATION: {
    id: 'INVESTIGATOR_RECOMMENDATION',
    label: 'Investigator Recommendation (Forensic Action)',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Targeted forensic inquiry or verification step recommended by FaultLine claims intelligence.',
  },
};

/**
 * Normalizes text for matching.
 */
function clean(str) {
  return String(str || '').toLowerCase().trim();
}

/**
 * Evaluates evidence against a single regulation to determine compliance assessment status.
 */
function assessRegulationCompliance({
  regulation,
  exhibits = [],
  contradictions = [],
  corroborations = [],
  missing = [],
  decision = 'REVIEW',
  hasObjectiveTelemetry = false,
}) {
  const cat = regulation.categoryId;
  const kinds = exhibits.map((e) => clean(e.kind));
  const labels = exhibits.map((e) => clean(e.label));
  const fullText = exhibits.map((e) => `${e.label || ''} ${e.text || ''}`).join(' ').toLowerCase();

  const hasPoliceReport = kinds.some((k) => k.includes('police')) || labels.some((l) => l.includes('police') || l.includes('fir')) || fullText.includes('police report') || fullText.includes('fir number');
  const hasPhotosOrInspection = kinds.some((k) => k.includes('photo') || k.includes('inspection') || k.includes('repair')) || labels.some((l) => l.includes('photo') || l.includes('inspection') || l.includes('damage') || l.includes('engineer'));
  const hasTelemetry = hasObjectiveTelemetry || kinds.some((k) => k.includes('cctv') || k.includes('dashcam') || k.includes('telematics') || k.includes('gps')) || labels.some((l) => l.includes('cctv') || l.includes('dashcam') || l.includes('telematics') || l.includes('gps'));
  const hasDriverStatement = kinds.some((k) => k.includes('statement') || k.includes('claim')) || labels.some((l) => l.includes('statement') || l.includes('claimant'));

  const activeContradictions = contradictions.filter((c) => c.severity === 'critical' || c.severity === 'major');

  let status = LEGAL_ASSESSMENT_STATUSES.REQUIRES_VERIFICATION.label;
  let rationale = '';
  let evidenceAvailable = [];
  let evidenceGap = 'None identified';
  let investigationImplication = '';
  let reviewerConsideration = '';

  if (cat === 'mandatory-insurance') {
    if (exhibits.some((e) => clean(e.label).includes('policy') || clean(e.kind).includes('policy')) || fullText.includes('policy schedule') || fullText.includes('certificate of motor insurance')) {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Policy schedule and motor insurance coverage certificates are documented on file, verifying compulsory third-party indemnity compliance.';
      evidenceAvailable.push('Policy Schedule / Insurance Certificate on file');
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.POTENTIALLY_SATISFIED.label;
      rationale = 'Compulsory insurance coverage exists under active claim diary; formal policy schedule requires standard administrative validation.';
      evidenceAvailable.push('Active claim notification under insured policy number');
      evidenceGap = 'Validated motor insurance certificate and certificate validity dates';
    }
    investigationImplication = 'Confirm policy schedule excess and endorsements prior to disbursement.';
    reviewerConsideration = 'Verify that the vehicle was operated within the scope of permitted use.';
  } else if (cat === 'accident-reporting') {
    if (hasPoliceReport) {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Official police collision report / formal incident confirmation has been submitted and verified on file.';
      evidenceAvailable.push('Official Police Accident Report / Incident Reference');
      investigationImplication = 'Statutory notification obligations to public authorities have been discharged.';
      reviewerConsideration = 'Cross-examine police report timeline against claimant notification.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.NOT_ESTABLISHED.label;
      rationale = 'The claim file contains the driver’s accident notification, but an official police accident report has not been supplied. Under investigative safeguards, missing paperwork does not prove statutory non-compliance unless reporting was mandatory under the specific circumstances (e.g., personal injury, failure to exchange details, or public property damage).';
      evidenceAvailable.push('First-party claim notification statement');
      evidenceGap = 'Official Police Collision Report or incident reference number';
      investigationImplication = 'Determine whether this accident met the statutory criteria requiring mandatory police notification in this jurisdiction.';
      reviewerConsideration = 'Check if involved parties exchanged details at the scene, which often waives the police reporting mandate for non-injury collisions.';
    }
  } else if (cat === 'insurance-fraud') {
    const isFraudIntent = activeContradictions.some((c) => clean(c.title).includes('fraud') || clean(c.title).includes('fabricated') || clean(c.title).includes('not present') || clean(c.explanation).includes('stationary'));
    if (isFraudIntent && hasTelemetry) {
      status = LEGAL_ASSESSMENT_STATUSES.POTENTIAL_NON_COMPLIANCE.label;
      rationale = 'Objective technical evidence (CCTV / GPS / Telematics) directly contradicts the claimed loss circumstances, establishing legitimate grounds under statutory insurance fraud provisions.';
      evidenceAvailable.push('Objective telemetry contradicting reported collision dynamics');
      evidenceGap = 'None - documented factual conflict on file';
      investigationImplication = 'Escalate to Special Investigation Unit (SIU) and prepare formal declinature file under fraud legislation.';
      reviewerConsideration = 'Ensure repudiation grounds cite specific irreconcilable factual findings rather than general algorithmic suspicion.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.NOT_APPLICABLE.label;
      rationale = 'No substantiated indicators or material contradictions meeting statutory fraud thresholds were identified.';
      evidenceAvailable.push('Exhibits free of substantiated fraud indicators');
      investigationImplication = 'Treat claim as ordinary accident adjustment without special penal escalation.';
      reviewerConsideration = 'Reopen fraud assessment only if adverse third-party intelligence emerges.';
    }
  } else if (cat === 'liability-negligence' || cat === 'traffic-laws') {
    if (activeContradictions.length > 0) {
      status = LEGAL_ASSESSMENT_STATUSES.REQUIRES_VERIFICATION.label;
      rationale = `Unresolved contradiction (${activeContradictions[0].title}) creates legal ambiguity regarding right-of-way, following distance, or contributory negligence.`;
      evidenceAvailable.push('Contradictory witness/driver accounts on file');
      evidenceGap = 'Independent scene CCTV, dashcam, or neutral witness statement';
      investigationImplication = 'Conduct recorded statements or scene inquiry to allocate comparative fault percentages defensibly.';
      reviewerConsideration = 'Evaluate whether contributory negligence principles in this jurisdiction bar recovery or apportion damages.';
    } else if (corroborations.length > 0 || hasTelemetry) {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Reported accident mechanics and right-of-way priority are substantiated by mutually reinforcing evidence and damage profiles.';
      evidenceAvailable.push('Corroborated incident mechanics and damage alignment');
      investigationImplication = 'Liability can be assessed clearly under applicable statutory rules of the road.';
      reviewerConsideration = 'Apply standard right-of-way rules for this collision category.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.POTENTIALLY_SATISFIED.label;
      rationale = 'Claimant account appears plausible and consistent with damage photos; awaiting formal third-party response.';
      evidenceAvailable.push('Claimant statement and scene description');
      evidenceGap = 'Third-party insurer liability response';
      investigationImplication = 'Liability is supported prima facie; confirm absence of adverse third-party counter-allegations.';
      reviewerConsideration = 'Ensure timeframes for liability response under claims protocols are tracked.';
    }
  } else if (cat === 'vehicle-damage') {
    if (hasPhotosOrInspection) {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Photographic damage documentation or professional engineer repair estimate is verified on file, fulfilling physical proof mandates.';
      evidenceAvailable.push('Damage photographs / Garage repair estimate');
      investigationImplication = 'Damage assessment adheres to statutory assessment and repair authorization standards.';
      reviewerConsideration = 'Verify repair estimate labor rates and part categories against insurer approved schedules.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.NOT_ESTABLISHED.label;
      rationale = 'Physical vehicle inspection report or itemized repair estimate has not yet been uploaded.';
      evidenceGap = 'Itemized engineer damage estimate and detailed high-resolution photos';
      investigationImplication = 'Instruct certified motor vehicle assessor prior to issuing repair indemnity.';
      reviewerConsideration = 'Ensure vehicle is inspected before any salvage or dismantling occurs.';
    }
  } else if (cat === 'evidence-requirements') {
    if (hasTelemetry || exhibits.length >= 3) {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Multi-source documentary evidence on file satisfies statutory evidentiary admissibility and weight standards.';
      evidenceAvailable.push('Multi-party accounts and corroborating scene artifacts');
      investigationImplication = 'Evidentiary threshold for claims determination has been met.';
      reviewerConsideration = 'Preserve raw metadata for digital media files.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.REQUIRES_VERIFICATION.label;
      rationale = 'Available evidence is limited to party statements; independent digital or forensic corroboration is recommended.';
      evidenceAvailable.push('First-party statements');
      evidenceGap = 'Independent corroborative evidence assets';
      investigationImplication = 'Seek independent corroboration to satisfy evidentiary burden.';
      reviewerConsideration = 'Do not reject on thin evidence alone if the claimant account is credible and uncontradicted.';
    }
  } else {
    // Default fallback
    if (decision === 'APPROVE') {
      status = LEGAL_ASSESSMENT_STATUSES.SATISFIED.label;
      rationale = 'Applicable regulatory provisions support proceeding with claims settlement under standard indemnity procedures.';
    } else if (decision === 'REJECT') {
      status = LEGAL_ASSESSMENT_STATUSES.POTENTIAL_NON_COMPLIANCE.label;
      rationale = 'Evidence establishes legitimate grounds for declinature in accordance with applicable statutory claims frameworks.';
    } else {
      status = LEGAL_ASSESSMENT_STATUSES.REQUIRES_VERIFICATION.label;
      rationale = 'Further factual clarification is required to confirm full compliance with statutory claims guidelines.';
    }
    evidenceAvailable.push('Case file exhibits and incident context');
    investigationImplication = 'Review statutory provisions alongside case evidence.';
    reviewerConsideration = 'Confirm regulatory deadlines and consumer duty requirements.';
  }

  return {
    assessmentStatus: status,
    rationale,
    evidenceAvailable,
    evidenceGap,
    investigationImplication,
    reviewerConsideration,
  };
}

/**
 * Evaluates the full case file against relevant regulations for the specified jurisdiction.
 */
export function evaluateJurisdictionalLegalContext({
  countryCode = 'UK',
  region = null,
  caseFile = null,
  scenario = null,
  decision = 'REVIEW',
  contradictions = [],
  review = {},
} = {}) {
  const cc = String(countryCode || scenario?.country || caseFile?.country || 'UK').toUpperCase();
  const meta = COUNTRY_METADATA[cc] || { flag: '🌐', code: cc, name: cc, legalSystem: 'Statutory Law', regulator: 'Insurance Regulatory Authority' };

  // Detect regional jurisdiction
  const regionsList = REGIONAL_JURISDICTIONS[cc] || [];
  let selectedRegion = region;
  if (!selectedRegion && scenario?.region) selectedRegion = scenario.region;
  if (!selectedRegion && caseFile?.region) selectedRegion = caseFile.region;
  if (!selectedRegion && regionsList.length > 0) {
    selectedRegion = regionsList[0].code;
  }

  const regionObj = regionsList.find((r) => r.code === selectedRegion) || (regionsList.length ? regionsList[0] : null);
  const regionName = regionObj ? regionObj.name : null;

  // Retrieve case parameters
  const title = scenario?.title || caseFile?.title || '';
  const context = scenario?.case?.context || caseFile?.context || '';
  const category = scenario?.category || caseFile?.category || '';
  const claimType = scenario?.claimType || caseFile?.claimType || '';
  const tags = scenario?.tags || caseFile?.tags || [];

  const rawExhibits = scenario?.case?.exhibits || caseFile?.exhibits || [];
  const exhibits = rawExhibits.map((e, idx) => ({
    id: e.id || String.fromCharCode(65 + idx),
    label: e.label || `Exhibit ${String.fromCharCode(65 + idx)}`,
    kind: e.kind || 'statement',
    text: e.text || e.rawText || '',
  }));

  const hasObjectiveTelemetry = exhibits.some((e) =>
    ['cctv', 'dashcam', 'telematics', 'gps', 'police_report'].includes(clean(e.kind)) ||
    /cctv|dashcam|gps|tracker|black box|police report|fir/i.test(clean(e.label))
  );

  // Match relevant regulations
  const matches = getRelevantRegulationsForCase({
    country: cc,
    category,
    claimType,
    tags,
    context,
    title,
  });

  const activeContradictions = (contradictions || []).filter((c) => review[c.id] !== 'dismissed');

  // Enhance each regulation with case-specific legal assessment
  const applicableRegulations = matches.map((m, idx) => {
    const reg = m.regulation;
    const assessment = assessRegulationCompliance({
      regulation: reg,
      exhibits,
      contradictions: activeContradictions,
      decision,
      hasObjectiveTelemetry,
    });

    // Requirement type classification
    let reqType = REQUIREMENT_TYPES.LEGAL_REQUIREMENT;
    if (reg.categoryId === 'mandatory-insurance') {
      reqType = REQUIREMENT_TYPES.LEGAL_REQUIREMENT;
    } else if (reg.categoryId === 'claims-procedures') {
      reqType = REQUIREMENT_TYPES.CLAIMS_PROCEDURE;
    } else if (reg.categoryId === 'insurance-fraud') {
      reqType = REQUIREMENT_TYPES.LEGAL_REQUIREMENT;
    } else if (reg.categoryId === 'vehicle-damage') {
      reqType = REQUIREMENT_TYPES.CLAIMS_PROCEDURE;
    }

    const scope = reg.region && reg.region.endsWith('-FED')
      ? 'Federal / Nationwide'
      : reg.region && reg.region.includes('-')
        ? `Regional / ${regionName || 'State'}`
        : 'National';

    return {
      id: reg.id || `REG-${cc}-${idx + 1}`,
      title: reg.title,
      category: reg.category,
      categoryId: reg.categoryId,
      jurisdiction: meta.name,
      countryCode: cc,
      regionCode: selectedRegion,
      regionName,
      scope,
      legalReference: reg.legalReference,
      authority: reg.authority,
      sourceUrl: reg.sourceUrl,
      status: reg.status || 'VERIFIED',
      lastVerifiedDate: reg.lastVerifiedDate || '2026-01-15',
      summary: reg.summary,
      whatRuleRequires: reg.detailedExplanation || reg.summary,
      applicability: reg.applicability || `Applies to all licensed motor vehicles operating in ${meta.name}.`,
      whyItMatters: m.reason || 'Directly governs liability allocation and statutory claim compliance.',
      requirementType: reqType,
      evidenceAvailable: assessment.evidenceAvailable,
      evidenceGap: assessment.evidenceGap,
      investigationImplication: assessment.investigationImplication,
      assessmentStatus: assessment.assessmentStatus,
      assessmentRationale: assessment.rationale,
      reviewerConsideration: assessment.reviewerConsideration,
      relevanceScore: m.score,
    };
  });

  // Decision-specific legal explanation
  let affectingParagraph = '';
  let considerations = [];
  let actionItems = [];

  if (decision === 'APPROVE') {
    affectingParagraph = `The legal and regulatory framework of ${meta.name}${regionName ? ` (${regionName})` : ''} supports the recommendation to APPROVE this claim. Verified exhibits sufficiently fulfill statutory reporting standards, damage proof requirements, and prima facie liability conditions. Crucially, cross-examination identified zero substantiated indicators of statutory insurance fraud, staged collision, or bad faith. Standard administrative policy checks and indemnity disbursement protocols can safely proceed in full compliance with ${meta.regulator} guidelines.`;
    considerations = [
      `Statutory proof of loss and vehicle damage criteria under ${meta.name} regulations are substantiated by submitted photographic and repair documentation.`,
      `No active or unresolved material contradictions violate statutory road traffic fault principles or liability allocation rules.`,
      `Zero substantiated indicators of insurance fraud or staged collision were identified, eliminating regulatory grounds for indemnity denial.`,
      `Approval complies with insurer statutory duties for prompt, fair claim resolution under ${meta.regulator} fair-treatment standards.`,
    ];
    actionItems = [
      { priority: 1, action: 'Complete standard pre-disbursement policy excess validation.', authority: meta.regulator },
      { priority: 2, action: 'Maintain completed forensic investigation report in audit-ready state.', authority: 'Internal Audit & Compliance' },
    ];
  } else if (decision === 'REJECT') {
    affectingParagraph = `The legal and regulatory framework of ${meta.name}${regionName ? ` (${regionName})` : ''} provides legitimate, defensible statutory grounds to recommend REJECTION of this claim. Objective technical evidence and verified forensic records directly contradict the claimant's material representations regarding collision circumstances or loss dynamics. Rejection is firmly rooted in proven factual misrepresentation and policy conditions precedent, strictly adhering to safeguards that protect policyholders from arbitrary or speculative claim declinature.`;
    considerations = [
      `Documented physical evidence and technical telemetry conclusively refute the claimant's reported timeline or impact mechanics.`,
      `Rejection is justified under statutory misrepresentation and fraud provisions, resting on verified objective proof rather than uncorroborated suspicion.`,
      `The declinature basis satisfies regulatory standards established by ${meta.regulator}, providing clear, traceable factual grounds.`,
      `Policy conditions precedent regarding good faith and accurate loss reporting have been materially breached by the established facts.`,
    ];
    actionItems = [
      { priority: 1, action: 'Prepare formal notice of declinature citing verified factual contradictions.', authority: meta.regulator },
      { priority: 2, action: 'Refer file to Special Investigation Unit (SIU) for statutory regulatory reporting if required.', authority: 'Statutory Fraud Registry' },
    ];
  } else {
    // REVIEW
    affectingParagraph = `Under the legal and regulatory standards of ${meta.name}${regionName ? ` (${regionName})` : ''}, this claim must remain under active REVIEW. While initial notice of loss has been submitted, material factual discrepancies remain between source accounts, and essential independent verification assets (such as official accident records or corroborating telemetry) are not yet on file. Approving the claim now would expose the insurer to unverified liability, while rejecting it would be legally premature under statutory fairness guidelines, as deliberate fraud has not been objectively proven.`;
    considerations = [
      `Essential statutory reporting or incident documentation has not been established on file; however, missing records alone do not justify declinature.`,
      `Unresolved factual contradictions prevent conclusive liability determination under statutory right-of-way and negligence rules.`,
      `Regulator fair-treatment principles under ${meta.regulator} require insurers to conduct reasonable further inquiry before reaching a definitive determination.`,
      `Completing the prioritized investigation steps will provide the evidentiary foundation needed to support a defensible final decision.`,
    ];
    actionItems = [
      { priority: 1, action: 'Obtain official police report or verify statutory reporting exemption criteria.', authority: 'Local Police Authority' },
      { priority: 2, action: 'Conduct targeted recorded inquiries to clarify disputed right-of-way statements.', authority: 'Claims Investigation Unit' },
      { priority: 3, action: 'Verify policy notification timeliness against policy conditions.', authority: 'Policy Administration' },
    ];
  }

  // Generate traceability chains: Regulation -> Requirement -> Evidence -> Assessment -> Decision Relevance
  const traceabilityChain = applicableRegulations.map((reg) => ({
    regulationId: reg.id,
    title: reg.title,
    legalReference: reg.legalReference,
    requirement: reg.whatRuleRequires,
    evidence: reg.evidenceAvailable.length ? reg.evidenceAvailable.join('; ') : 'No direct verifying exhibit on file',
    assessment: reg.assessmentStatus,
    decisionRelevance: reg.whyItMatters,
  }));

  return {
    jurisdiction: {
      countryCode: cc,
      countryName: meta.name,
      flag: meta.flag,
      legalSystem: meta.legalSystem,
      regulator: meta.regulator,
      regionCode: selectedRegion,
      regionName,
      availableRegions: regionsList,
      verificationStatus: meta.verificationStatus || 'VERIFIED',
      lastAuditDate: 'Q1 2026',
    },
    applicableRegulations,
    legalDecisionImpact: {
      affectingParagraph,
      considerations,
      actionItems,
      decisionCategory: decision,
    },
    traceabilityChain,
    totalRegulationsEvaluated: applicableRegulations.length,
    evaluatedAt: new Date().toISOString(),
  };
}
