// FaultLine Evidence Independence & Derivative Corroboration Engine.
// Evaluates whether corroborating evidence sources are genuinely independent
// or merely derivative citations, shared authorship, or circular echoes.
//
// Key Principle: Two documents quoting the same underlying source do NOT
// constitute independent corroboration. Derivative repetition must be penalized,
// not counted as multiple corroborations.

import { EXHIBIT_IDS } from '../../shared/constants.js';

export const DERIVATION_TYPES = {
  INDEPENDENT: 'INDEPENDENT',
  DERIVATIVE_CITATION: 'DERIVATIVE_CITATION',
  SHARED_AUTHORSHIP: 'SHARED_AUTHORSHIP',
  CIRCULAR_REPORTING: 'CIRCULAR_REPORTING',
};

export const SOURCE_TYPES = {
  PRIMARY_SENSOR: 'PRIMARY_SENSOR',         // Telematics, dashcam, CCTV, speed camera
  PRIMARY_EXPERT: 'PRIMARY_EXPERT',         // Forensic automotive engineer, metallurgy inspection
  PRIMARY_INDEPENDENT_WITNESS: 'PRIMARY_INDEPENDENT_WITNESS', // Unrelated third-party eyewitness
  PRIMARY_INTERESTED_PARTY: 'PRIMARY_INTERESTED_PARTY',       // Insured driver, claimant, third-party driver
  DERIVATIVE_OFFICIAL_REPORT: 'DERIVATIVE_OFFICIAL_REPORT',   // Police CAD report summarizing party statements
  DERIVATIVE_INTERNAL_NOTE: 'DERIVATIVE_INTERNAL_NOTE',       // Claims handler, broker, or investigator note citing party
};

/**
 * Patterns that indicate an exhibit is quoting or repeating another source.
 */
const CITATION_PATTERNS = [
  /according to (the )?(claimant|driver|insured|third party|witness|exhibit\s*[a-z]|officer)/i,
  /as stated (by|in|per) (the )?(claimant|driver|insured|third party|witness|exhibit\s*[a-z])/i,
  /quoting (the )?(claimant|driver|insured|third party|witness|exhibit\s*[a-z])/i,
  /per (the )?(claimant'?s?|driver'?s?|insured'?s?|third party'?s?|witness'?s?) statement/i,
  /reiterates? (the )?(claimant'?s?|driver'?s?) account/i,
  /summariz(es|ing) (the )?(claimant'?s?|driver'?s?) version/i,
  /states that (the )?(claimant|other driver|driver)/i,
  /reported by (the )?(driver|claimant|insured)/i,
  /cites? (exhibit\s*[a-z]|the claimant statement)/i,
];

/**
 * Classifies an exhibit's intrinsic evidence authority and nature.
 */
export function classifySourceAuthority(exhibit = {}) {
  const kind = (exhibit.kind || '').toLowerCase();
  const label = (exhibit.label || '').toLowerCase();
  const text = (exhibit.text || '').toLowerCase();

  // Sensors & Calibrated Hardware
  if (kind === 'telematics' || kind === 'cctv' || kind === 'dashcam' ||
      label.includes('telematics') || label.includes('dashcam') || label.includes('cctv') ||
      label.includes('can-bus') || label.includes('gps')) {
    return {
      type: SOURCE_TYPES.PRIMARY_SENSOR,
      isPhysical: true,
      inherentAuthority: 0.98,
      isSubjective: false,
      description: 'Calibrated electronic hardware / sensor telemetry (High objectivity)',
    };
  }

  // Forensic Engineering / Metallurgy
  if (kind === 'engineering' || label.includes('engineer') || label.includes('inspection') ||
      label.includes('forensic') || label.includes('metallurg')) {
    return {
      type: SOURCE_TYPES.PRIMARY_EXPERT,
      isPhysical: true,
      inherentAuthority: 0.92,
      isSubjective: false,
      description: 'Physical engineering inspection & objective material appraisal',
    };
  }

  // Derivative Official Report (e.g. Police summary)
  if (kind === 'police' || label.includes('police') || label.includes('cad') || label.includes('constabulary')) {
    // Check if the police report is reciting driver statements vs officer direct observations
    const hasAttribution = CITATION_PATTERNS.some((pat) => pat.test(text));
    return {
      type: hasAttribution ? SOURCE_TYPES.DERIVATIVE_OFFICIAL_REPORT : SOURCE_TYPES.PRIMARY_INDEPENDENT_WITNESS,
      isPhysical: false,
      inherentAuthority: hasAttribution ? 0.70 : 0.88,
      isSubjective: hasAttribution,
      description: hasAttribution
        ? 'Police incident summary repeating statements of involved parties'
        : 'Direct officer physical scene observations & locus measurements',
    };
  }

  // Independent Witness
  if (label.includes('independent witness') || label.includes('bystander') || (kind === 'witness' && !label.includes('passenger'))) {
    return {
      type: SOURCE_TYPES.PRIMARY_INDEPENDENT_WITNESS,
      isPhysical: false,
      inherentAuthority: 0.80,
      isSubjective: true,
      description: 'Disinterested third-party eyewitness testimony',
    };
  }

  // Interested Party (Claimant, Insured, Passenger)
  return {
    type: SOURCE_TYPES.PRIMARY_INTERESTED_PARTY,
    isPhysical: false,
    inherentAuthority: 0.60,
    isSubjective: true,
    description: 'First-party testimonial statement (Subject to recall variance & self-interest)',
  };
}

/**
 * Detects whether an exhibit cites another specific exhibit or person.
 */
export function extractCitations(exhibit = {}, allExhibits = []) {
  const text = String(exhibit.text || '');
  const citations = [];

  for (const pat of CITATION_PATTERNS) {
    const match = text.match(pat);
    if (match) {
      citations.push({
        matchedText: match[0],
        pattern: pat.toString(),
      });
    }
  }

  // Check if it explicitly names other exhibit letters (e.g., "Exhibit A")
  allExhibits.forEach((other, idx) => {
    const otherId = EXHIBIT_IDS[idx] || `X${idx + 1}`;
    if (otherId !== exhibit.id) {
      const exRegex = new RegExp(`\\bexhibit\\s+${otherId}\\b`, 'i');
      if (exRegex.test(text)) {
        citations.push({
          citedExhibitId: otherId,
          matchedText: `Explicitly references Exhibit ${otherId}`,
        });
      }
    }
  });

  return citations;
}

/**
 * Evaluates the independence of a group of exhibits that corroborate a single finding.
 *
 * @param {Array<string>} exhibitIds - Array of exhibit letters (e.g. ['A', 'B'])
 * @param {Array<object>} allExhibits - Array of exhibit objects with { id, label, kind, text }
 * @returns {object} Independence appraisal
 */
export function evaluateEvidenceIndependence(exhibitIds = [], allExhibits = []) {
  if (!exhibitIds || exhibitIds.length <= 1) {
    return {
      isIndependent: false,
      derivationType: DERIVATION_TYPES.INDEPENDENT,
      independenceScore: 0.5,
      reason: 'Single source; corroboration requires multiple independent channels.',
      provenanceChain: [],
      safeguardNotice: null,
    };
  }

  const selectedExhibits = allExhibits.filter((e, idx) => {
    const id = e.id || EXHIBIT_IDS[idx] || `X${idx + 1}`;
    return exhibitIds.includes(id);
  });

  const classified = selectedExhibits.map((e, idx) => {
    const id = e.id || EXHIBIT_IDS[idx] || `X${idx + 1}`;
    const authority = classifySourceAuthority(e);
    const citations = extractCitations(e, allExhibits);
    return {
      id,
      label: e.label || `Exhibit ${id}`,
      authority,
      citations,
      rawText: e.text || '',
    };
  });

  const provenanceChain = [];
  let isDerivative = false;
  let derivationType = DERIVATION_TYPES.INDEPENDENT;
  let explanation = '';

  // 1. Check for Direct Citation between the corroborating exhibits
  for (const c1 of classified) {
    for (const citation of c1.citations) {
      if (citation.citedExhibitId && exhibitIds.includes(citation.citedExhibitId)) {
        isDerivative = true;
        derivationType = DERIVATION_TYPES.DERIVATIVE_CITATION;
        explanation = `Exhibit ${c1.id} (${c1.label}) directly cites Exhibit ${citation.citedExhibitId}. This constitutes derivative reporting, not independent corroboration.`;
        provenanceChain.push({
          child: c1.id,
          parent: citation.citedExhibitId,
          relation: 'CITES_DIRECTLY',
        });
      }
    }
  }

  // 2. Check for Derivative Official Report repeating Party statement
  if (!isDerivative) {
    const hasInterestedParty = classified.some((c) => c.authority.type === SOURCE_TYPES.PRIMARY_INTERESTED_PARTY);
    const hasDerivativeOfficial = classified.some((c) => c.authority.type === SOURCE_TYPES.DERIVATIVE_OFFICIAL_REPORT);

    if (hasInterestedParty && hasDerivativeOfficial) {
      isDerivative = true;
      derivationType = DERIVATION_TYPES.DERIVATIVE_CITATION;
      explanation = 'Official report notes party statement without independent scene verification. Information originates from a single human source.';
      provenanceChain.push({
        child: classified.find((c) => c.authority.type === SOURCE_TYPES.DERIVATIVE_OFFICIAL_REPORT)?.id,
        parent: classified.find((c) => c.authority.type === SOURCE_TYPES.PRIMARY_INTERESTED_PARTY)?.id,
        relation: 'RECITES_PARTY_STATEMENT',
      });
    }
  }

  // 3. Check for Shared Authorship (e.g., driver and passenger sharing counsel or joint submission)
  if (!isDerivative) {
    const partyExhibits = classified.filter((c) => c.authority.type === SOURCE_TYPES.PRIMARY_INTERESTED_PARTY);
    if (partyExhibits.length >= 2) {
      // Check if text is substantially identical or both are passengers/drivers in same vehicle
      const texts = partyExhibits.map((p) => p.rawText.toLowerCase());
      const hasSharedVehicle = texts.every((t) => t.includes('my car') || t.includes('our car') || t.includes('passenger'));
      if (hasSharedVehicle) {
        derivationType = DERIVATION_TYPES.SHARED_AUTHORSHIP;
        explanation = 'Both statements originate from occupants of the same vehicle; mutual influence or coordinated account cannot be ruled out.';
      }
    }
  }

  // Calculate Independence Confidence Score
  let independenceScore = 0.90;
  if (derivationType === DERIVATION_TYPES.DERIVATIVE_CITATION) {
    independenceScore = 0.40; // Severe penalty for echo reporting
  } else if (derivationType === DERIVATION_TYPES.SHARED_AUTHORSHIP) {
    independenceScore = 0.65; // Moderate penalty for same-vehicle parties
  } else if (classified.some((c) => c.authority.isPhysical)) {
    independenceScore = 0.98; // Boost for objective physical/sensor corroboration
  }

  const safeguardNotice = isDerivative
    ? 'Safeguard Notice: Apparent corroboration is derivative. Corroboration score has been discounted to prevent artificial multi-source inflation.'
    : null;

  return {
    isIndependent: !isDerivative && derivationType === DERIVATION_TYPES.INDEPENDENT,
    derivationType,
    independenceScore,
    explanation: explanation || 'Evidence sources are mutually independent with separate points of origin.',
    provenanceChain,
    safeguardNotice,
    sourceAuthorities: classified.map((c) => ({
      exhibitId: c.id,
      authorityType: c.authority.type,
      inherentAuthority: c.authority.inherentAuthority,
    })),
  };
}
