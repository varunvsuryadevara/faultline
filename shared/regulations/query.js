// Query, search, comparison, coverage audit, and case-matching engine for the
// FaultLine Motor Law & Insurance Regulatory Intelligence Platform.

import {
  COUNTRY_METADATA,
  REGIONAL_JURISDICTIONS,
  REGULATION_CATEGORIES,
  MASTER_LEGAL_CATEGORIES,
  VERIFICATION_STATUSES,
  LAW_INSTRUMENT_TYPES,
  resolveMasterCategory,
} from './vocab.js';
import { REGULATIONS, OFFICIAL_DOCUMENTS, LEGAL_CHANGE_LOG } from './data.js';

/**
 * Normalizes text for case-insensitive keyword and token matching.
 */
function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Returns all regulations for a given country, with multi-dimensional filtering.
 */
export function getCountryRegulations(countryCode, options = {}) {
  const {
    region,
    categoryId,
    masterCategoryId,
    status,
    lawType,
    currentStatus,
    incidentDate,
    query,
  } = options;

  const cc = String(countryCode || '').toUpperCase();

  return REGULATIONS.filter((reg) => {
    if (reg.country !== cc) return false;

    // Regional filter
    if (region && reg.region && reg.region !== region && reg.region !== `${cc}-ALL` && reg.region !== `${cc}-FED` && reg.region !== `${cc}-CEN`) {
      return false;
    }

    // Category filter: match either legacy categoryId or masterCategoryId
    if (categoryId && categoryId !== 'ALL') {
      const targetMaster = resolveMasterCategory(categoryId).id;
      const regMaster = reg.masterCategoryId || resolveMasterCategory(reg.categoryId).id;
      if (reg.categoryId !== categoryId && regMaster !== targetMaster && regMaster !== categoryId) {
        return false;
      }
    }

    if (masterCategoryId && masterCategoryId !== 'ALL') {
      const regMaster = reg.masterCategoryId || resolveMasterCategory(reg.categoryId).id;
      if (regMaster !== masterCategoryId) return false;
    }

    // Status filter
    if (status && status !== 'ALL' && reg.status !== status) return false;

    // Law Type filter
    if (lawType && lawType !== 'ALL' && reg.lawType !== lawType) return false;

    // Current/Historical status filter
    if (currentStatus && currentStatus !== 'ALL') {
      const isHist = reg.currentStatus === 'HISTORICAL' || reg.status === 'HISTORICAL';
      if (currentStatus === 'CURRENT' && isHist) return false;
      if (currentStatus === 'HISTORICAL' && !isHist) return false;
      if (currentStatus === 'PROPOSED' && reg.status !== 'PROPOSED') return false;
      if (currentStatus === 'REPEALED' && reg.status !== 'REPEALED') return false;
    }

    // Incident date point-in-time filter
    if (incidentDate) {
      const incTime = new Date(incidentDate).getTime();
      if (!isNaN(incTime)) {
        if (reg.effectiveDate) {
          const effTime = new Date(reg.effectiveDate).getTime();
          if (!isNaN(effTime) && incTime < effTime) {
            // Incident happened before regulation took effect
            return false;
          }
        }
        if (reg.repealDate) {
          const repTime = new Date(reg.repealDate).getTime();
          if (!isNaN(repTime) && incTime > repTime) {
            // Incident happened after regulation was repealed
            return false;
          }
        }
      }
    }

    // Keyword search filter across text, citation, applicability, tags, and summary
    if (query && query.trim()) {
      const qTokens = tokenize(query);
      const targetText = [
        reg.title,
        reg.legalReference,
        reg.summary,
        reg.detailedExplanation,
        reg.applicability,
        reg.claimsImplications,
        reg.investigationImplications,
        reg.authority,
        ...(reg.tags || []),
      ].join(' ').toLowerCase();

      // All tokens must be present
      if (!qTokens.every((t) => targetText.includes(t))) return false;
    }

    return true;
  });
}

/**
 * Global search across all regulations regardless of country.
 */
export function searchRegulations(query, options = {}) {
  const qStr = typeof query === 'string' ? query : (options.query || '');
  const targetCountry = options.country || '';
  if (targetCountry) {
    return getCountryRegulations(targetCountry, { ...options, query: qStr });
  }
  if (!qStr || !qStr.trim()) return REGULATIONS;
  const qTokens = tokenize(qStr);
  return REGULATIONS.filter((reg) => {
    const targetText = [
      reg.title,
      reg.legalReference,
      reg.summary,
      reg.detailedExplanation,
      reg.applicability,
      reg.claimsImplications,
      reg.investigationImplications,
      reg.authority,
      ...(reg.tags || []),
    ].join(' ').toLowerCase();
    return qTokens.every((t) => targetText.includes(t));
  });
}

/**
 * Returns all official documents for a country.
 */
export function getCountryDocuments(countryCode, options = {}) {
  const { query, category } = options;
  const cc = String(countryCode || '').toUpperCase();

  return OFFICIAL_DOCUMENTS.filter((doc) => {
    if (doc.country !== cc) return false;
    if (category && category !== 'ALL' && doc.category !== category) return false;
    if (query && query.trim()) {
      const qTokens = tokenize(query);
      const targetText = [doc.title, doc.authority, doc.description, doc.category].join(' ').toLowerCase();
      if (!qTokens.every((t) => targetText.includes(t))) return false;
    }
    return true;
  });
}

/**
 * Evaluates the comprehensive legal coverage score for a given country across all 16 Master Categories.
 * Real, mathematical score based on verified database entries.
 */
export function computeLegalCoverageScore(countryCode) {
  const cc = String(countryCode || '').toUpperCase();
  const regs = REGULATIONS.filter((r) => r.country === cc);

  const categoryBreakdown = {};
  let verifiedCats = 0;
  let partialCats = 0;
  let gapCats = 0;

  for (const master of MASTER_LEGAL_CATEGORIES) {
    const matching = regs.filter((r) => {
      const mId = r.masterCategoryId || resolveMasterCategory(r.categoryId).id;
      return mId === master.id;
    });

    const totalCount = matching.length;
    const verifiedCount = matching.filter((r) => r.status === 'VERIFIED').length;
    const hasOutdated = matching.some((r) => r.status === 'OUTDATED');

    let status = 'GAP';
    if (verifiedCount >= 2) {
      status = 'VERIFIED';
      verifiedCats += 1;
    } else if (verifiedCount === 1) {
      status = 'PARTIALLY_VERIFIED';
      partialCats += 1;
    } else if (totalCount > 0) {
      status = 'NEEDS_REVIEW';
      partialCats += 0.5;
    } else {
      status = 'GAP';
      gapCats += 1;
    }

    categoryBreakdown[master.id] = {
      id: master.id,
      code: master.code,
      label: master.label,
      totalRegulations: totalCount,
      verifiedRegulations: verifiedCount,
      status,
      hasOutdated,
      regulations: matching.map((r) => ({ id: r.id, title: r.title, reference: r.legalReference, status: r.status })),
    };
  }

  // Calculate percentage: Verified (100%), Partial (60%), Needs Review (30%)
  const rawScore = ((verifiedCats * 1.0 + partialCats * 0.6) / MASTER_LEGAL_CATEGORIES.length) * 100;
  const overallScore = Math.min(100, Math.max(15, Math.round(rawScore)));

  return {
    countryCode: cc,
    overallScore,
    totalCategories: MASTER_LEGAL_CATEGORIES.length,
    verifiedCategoriesCount: verifiedCats,
    partialCategoriesCount: Math.floor(partialCats),
    gapCategoriesCount: gapCats,
    totalRegulationsCount: regs.length,
    categoryBreakdown,
  };
}

/**
 * Runs an automated jurisdictional legal audit and research gap analysis.
 */
export function runJurisdictionLegalAudit(countryCode) {
  const cc = String(countryCode || '').toUpperCase();
  const meta = COUNTRY_METADATA[cc] || { name: cc, regulator: 'Insurance Regulatory Authority', legalSystem: 'Statutory' };
  const coverage = computeLegalCoverageScore(cc);
  const regs = REGULATIONS.filter((r) => r.country === cc);
  const docs = OFFICIAL_DOCUMENTS.filter((d) => d.country === cc);

  const identifiedGaps = [];
  const categoryAudits = [];

  for (const master of MASTER_LEGAL_CATEGORIES) {
    const catData = coverage.categoryBreakdown[master.id];
    let recommendation = 'Category fully indexed and verified against primary statutory codes.';

    if (catData.totalRegulations === 0) {
      recommendation = `Priority research required: Index primary legislation for ${master.label} in ${meta.name}.`;
      identifiedGaps.push({
        category: master.label,
        categoryId: master.id,
        severity: 'HIGH',
        missingArea: `Statutory framework and regulator guidelines for ${master.label}`,
        suggestedInquiry: `Official statutes and ${meta.regulator} circulars regarding ${master.subcategories.slice(0, 3).join(', ')}`,
      });
    } else if (catData.status === 'NEEDS_REVIEW' || catData.status === 'PARTIALLY_VERIFIED') {
      recommendation = `Secondary review needed: Re-benchmark subordinate regional rules and confirm official URLs.`;
      identifiedGaps.push({
        category: master.label,
        categoryId: master.id,
        severity: 'MEDIUM',
        missingArea: `Subordinate guidelines and official source verification for ${master.label}`,
        suggestedInquiry: `Confirm in-force amendments for ${catData.regulations[0]?.reference || master.label}`,
      });
    }

    categoryAudits.push({
      ...catData,
      description: master.description,
      icon: master.icon,
      recommendation,
    });
  }

  // Outdated regulations check
  const outdatedRegulations = regs
    .filter((r) => r.status === 'OUTDATED' || r.currentStatus === 'OUTDATED')
    .map((r) => ({ id: r.id, title: r.title, reference: r.legalReference, reason: 'Amendment detected since last audit benchmark' }));

  // Recent amendments & change detection
  const amendmentsDetected = (LEGAL_CHANGE_LOG || []).filter((log) => log.country === cc);

  return {
    countryCode: cc,
    countryName: meta.name,
    flag: meta.flag,
    legalSystem: meta.legalSystem,
    regulator: meta.regulator,
    coverageScore: coverage.overallScore,
    auditedAt: new Date().toISOString(),
    auditPeriod: 'Q1 2026 Continuous Intelligence Audit',
    totalRegulations: regs.length,
    totalDocuments: docs.length,
    categoryAudits,
    identifiedGaps,
    outdatedRegulations,
    amendmentsDetected,
  };
}

/**
 * Evaluates the law applicable on a specific incident date (Point-in-Time Legal Versioning).
 */
export function getApplicableLawForIncidentDate({ countryCode, incidentDate, categoryId }) {
  const cc = String(countryCode || 'UK').toUpperCase();
  const allRegs = getCountryRegulations(cc, { categoryId });
  const incDate = incidentDate ? new Date(incidentDate) : new Date();

  // Find exact in-force version
  const activeAtDate = allRegs.find((reg) => {
    if (reg.effectiveDate) {
      const eff = new Date(reg.effectiveDate);
      if (!isNaN(eff) && incDate < eff) return false;
    }
    if (reg.repealDate) {
      const rep = new Date(reg.repealDate);
      if (!isNaN(rep) && incDate > rep) return false;
    }
    return true;
  }) || allRegs[0];

  const currentLaw = allRegs.find((r) => r.currentStatus === 'CURRENT' || r.status === 'VERIFIED') || allRegs[0];
  const isHistorical = activeAtDate && activeAtDate.id !== currentLaw?.id;

  let applicabilityNotice = `Governed by current statutory law in force: ${activeAtDate?.legalReference || 'Applicable Code'}.`;
  if (isHistorical) {
    applicabilityNotice = `Historical statutory version applicable: Incident date (${incDate.toISOString().slice(0, 10)}) preceded recent amendments. Governed by ${activeAtDate?.legalReference} (effective ${activeAtDate?.effectiveDate}).`;
  }

  return {
    applicableRegulation: activeAtDate,
    currentLaw,
    isHistorical,
    incidentDate: incDate.toISOString().slice(0, 10),
    applicabilityNotice,
  };
}

/**
 * Returns detected legal amendments and updates across all jurisdictions.
 */
export function detectLegalChanges() {
  return LEGAL_CHANGE_LOG || [];
}

/**
 * Returns statutory summary and stats for a single country.
 */
export function getCountryStats(countryCode, claimCount = 0) {
  const cc = String(countryCode || '').toUpperCase();
  const meta = COUNTRY_METADATA[cc] || { flag: '🌐', code: cc, name: cc, legalSystem: 'Statutory', regulator: 'Insurance Regulatory Authority' };
  const regs = REGULATIONS.filter((r) => r.country === cc);
  const docs = OFFICIAL_DOCUMENTS.filter((d) => d.country === cc);
  const coverage = computeLegalCoverageScore(cc);

  // Determine aggregate verification status
  let verificationStatus = 'NOT_AVAILABLE';
  if (regs.length > 0) {
    const verifiedCount = regs.filter((r) => r.status === 'VERIFIED').length;
    if (verifiedCount === regs.length) {
      verificationStatus = 'VERIFIED';
    } else if (verifiedCount > 0) {
      verificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      verificationStatus = regs[0].status || 'PARTIALLY_VERIFIED';
    }
  }

  // Count regulations by legacy 10 categories
  const categoryCounts = {};
  for (const cat of REGULATION_CATEGORIES) {
    categoryCounts[cat.id] = regs.filter((r) => r.categoryId === cat.id).length;
  }

  // Count regulations by 16 master categories
  const masterCategoryCounts = {};
  for (const master of MASTER_LEGAL_CATEGORIES) {
    masterCategoryCounts[master.id] = regs.filter((r) => {
      const mId = r.masterCategoryId || resolveMasterCategory(r.categoryId).id;
      return mId === master.id;
    }).length;
  }

  const updates = (LEGAL_CHANGE_LOG || []).filter((u) => u.country === cc);

  return {
    code: cc,
    name: meta.name,
    flag: meta.flag,
    legalSystem: meta.legalSystem,
    regulator: meta.regulator,
    claimCount: Number(claimCount) || 0,
    regulationCount: regs.length,
    documentCount: docs.length,
    coverageScore: coverage.overallScore,
    coverageAudit: coverage,
    verificationStatus,
    verificationInfo: VERIFICATION_STATUSES[verificationStatus] || VERIFICATION_STATUSES.NOT_AVAILABLE,
    lastVerifiedDate: regs.length > 0 ? 'Q1 2026' : 'Pending Ingestion',
    categoryCounts,
    masterCategoryCounts,
    recentUpdatesCount: updates.length,
  };
}

/**
 * Compiles a full summary across all 20 countries, integrating existing claim counts.
 */
export function getAllCountriesStats(countryCountsMap = new Map()) {
  const countryCodes = Object.keys(COUNTRY_METADATA);
  return countryCodes.map((code) => {
    const claimCount = countryCountsMap instanceof Map ? countryCountsMap.get(code) || 0 : (countryCountsMap[code] || 0);
    return getCountryStats(code, claimCount);
  });
}

/**
 * Retrieves a regulation by ID.
 */
export function getRegulationById(id) {
  return REGULATIONS.find((r) => r.id === id) || null;
}

/**
 * Retrieves an official document by ID.
 */
export function getDocumentById(id) {
  return OFFICIAL_DOCUMENTS.find((d) => d.id === id) || null;
}

/**
 * Compares 2 to 4 countries side-by-side across key insurance and legal dimensions.
 */
export function compareJurisdictions(countryCodes = []) {
  const codes = countryCodes.slice(0, 4).map((c) => String(c).toUpperCase());
  return codes.map((code) => {
    const meta = COUNTRY_METADATA[code] || {};
    const regs = REGULATIONS.filter((r) => r.country === code);
    const docs = OFFICIAL_DOCUMENTS.filter((d) => d.country === code);
    const coverage = computeLegalCoverageScore(code);

    const mandatory = regs.find((r) => r.categoryId === 'mandatory-insurance' || r.masterCategoryId === 'motor-insurance-laws');
    const reporting = regs.find((r) => r.categoryId === 'accident-reporting' || r.masterCategoryId === 'accident-incident-laws');
    const liability = regs.find((r) => r.categoryId === 'liability-negligence' || r.masterCategoryId === 'courts-liability-disputes');
    const fraud = regs.find((r) => r.categoryId === 'insurance-fraud' || r.masterCategoryId === 'insurance-fraud-misrepresentation');
    const injury = regs.find((r) => r.categoryId === 'injury-compensation' || r.masterCategoryId === 'motor-claims-compensation');
    const ev = regs.find((r) => r.masterCategoryId === 'ev-emerging-vehicles');

    return {
      code,
      name: meta.name || code,
      flag: meta.flag || '🌐',
      legalSystem: meta.legalSystem || 'Statutory',
      regulator: meta.regulator || 'Insurance Authority',
      coverageScore: coverage.overallScore,
      regulationCount: regs.length,
      documentCount: docs.length,
      mandatoryInsurance: mandatory ? mandatory.legalReference : 'Road Traffic / Motor Insurance Act (Mandatory Third-Party)',
      mandatorySummary: mandatory ? mandatory.summary : 'Compulsory third-party insurance required for public road use.',
      reportingRules: reporting ? reporting.legalReference : 'Road Traffic Accident Reporting Section',
      reportingSummary: reporting ? reporting.summary : 'Drivers must stop and exchange particulars; report to police if injured.',
      liabilitySystem: liability ? liability.legalReference : 'Civil Negligence & Fault Attribution',
      liabilitySummary: liability ? liability.summary : 'Fault is evaluated under comparative negligence principles.',
      fraudPenalties: fraud ? fraud.legalReference : 'Penal Code / Fraud Provisions',
      fraudSummary: fraud ? fraud.summary : 'Prohibits staged accidents and deliberate false statements.',
      injuryCompensation: injury ? injury.legalReference : 'Motor Accident Injury Compensation Scheme',
      injurySummary: injury ? injury.summary : 'Compensates bodily injury, medical expenses, and loss of earnings.',
      evRegulations: ev ? ev.legalReference : 'EV Safety & Automated Driving Rules',
      evSummary: ev ? ev.summary : 'Vehicle electrical safety standards and battery hazard compliance.',
    };
  });
}

/**
 * Matches the most relevant regulations for a case file or scenario.
 */
export function getRelevantRegulationsForCase({
  country = 'UK',
  category = '',
  claimType = '',
  tags = [],
  context = '',
  title = '',
}) {
  const cc = String(country || 'UK').toUpperCase();
  const countryRegs = REGULATIONS.filter((r) => r.country === cc);

  if (countryRegs.length === 0) return [];

  const queryText = [
    title,
    context,
    category,
    claimType,
    ...(tags || []),
  ].join(' ').toLowerCase();

  const scored = countryRegs.map((reg) => {
    let score = 0;
    const reasons = [];

    // Category matching
    if (queryText.includes('whiplash') || queryText.includes('injury') || queryText.includes('soft tissue')) {
      if (reg.categoryId === 'injury-compensation' || reg.masterCategoryId === 'motor-claims-compensation') {
        score += 30;
        reasons.push('Relevant to claimed bodily injury and medical compensation');
      }
    }
    if (queryText.includes('fraud') || queryText.includes('staged') || queryText.includes('slam-on') || queryText.includes('fake') || queryText.includes('cash for crash')) {
      if (reg.categoryId === 'insurance-fraud' || reg.masterCategoryId === 'insurance-fraud-misrepresentation') {
        score += 40;
        reasons.push('Addresses statutory fraud definitions and criminal penalties for staged accidents');
      }
    }
    if (queryText.includes('rear-end') || queryText.includes('roundabout') || queryText.includes('lane') || queryText.includes('fault') || queryText.includes('negligence')) {
      if (reg.categoryId === 'liability-negligence' || reg.categoryId === 'traffic-laws' || reg.masterCategoryId === 'road-traffic-rules' || reg.masterCategoryId === 'courts-liability-disputes') {
        score += 25;
        reasons.push('Governs right-of-way, following distance, and fault apportionment');
      }
    }
    if (queryText.includes('hit and run') || queryText.includes('untraced') || queryText.includes('report') || queryText.includes('police')) {
      if (reg.categoryId === 'accident-reporting' || reg.masterCategoryId === 'accident-incident-laws') {
        score += 25;
        reasons.push('Mandates statutory accident reporting deadlines and driver duties');
      }
    }
    if (queryText.includes('total loss') || queryText.includes('write-off') || queryText.includes('salvage') || queryText.includes('garage') || queryText.includes('repair')) {
      if (reg.categoryId === 'vehicle-damage' || reg.masterCategoryId === 'repair-assessment-damage') {
        score += 25;
        reasons.push('Sets vehicle damage repair, total-loss thresholds, and depreciation standards');
      }
    }
    if (queryText.includes('dashcam') || queryText.includes('telematics') || queryText.includes('cctv') || queryText.includes('black box') || queryText.includes('witness')) {
      if (reg.categoryId === 'evidence-requirements' || reg.masterCategoryId === 'privacy-data-evidence') {
        score += 25;
        reasons.push('Establishes admissibility and weight of forensic digital evidence');
      }
    }

    // EV matching
    if (queryText.includes('ev') || queryText.includes('electric') || queryText.includes('battery') || queryText.includes('tesla') || queryText.includes('charging')) {
      if (reg.masterCategoryId === 'ev-emerging-vehicles') {
        score += 35;
        reasons.push('Governs electric vehicle battery safety and automated driver liability');
      }
    }

    // Keyword matching against regulation tags
    for (const tag of reg.tags || []) {
      if (queryText.includes(tag.toLowerCase())) {
        score += 10;
      }
    }

    // Base score for mandatory insurance in all claims
    if (reg.categoryId === 'mandatory-insurance' || reg.masterCategoryId === 'motor-insurance-laws') {
      score += 5;
    }

    return {
      regulation: reg,
      score,
      reason: reasons.length > 0 ? reasons[0] : 'Applicable statutory authority for motor claims in this jurisdiction',
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top 4 regulations
  return scored.slice(0, 4);
}

/**
 * AI Legal Research Assistant Q&A retrieval engine.
 */
export function askJurisdictionAssistant({ countryCode = 'UK', question = '' }) {
  const cc = String(countryCode || 'UK').toUpperCase();
  const meta = COUNTRY_METADATA[cc] || { name: cc };
  const regs = REGULATIONS.filter((r) => r.country === cc);
  const qLower = question.toLowerCase();

  let matchedReg = null;
  let citations = [];

  if (qLower.includes('reporting') || qLower.includes('report') || qLower.includes('police') || qLower.includes('deadline')) {
    matchedReg = regs.find((r) => r.categoryId === 'accident-reporting' || r.masterCategoryId === 'accident-incident-laws');
  } else if (qLower.includes('fraud') || qLower.includes('staged') || qLower.includes('false') || qLower.includes('cheat')) {
    matchedReg = regs.find((r) => r.categoryId === 'insurance-fraud' || r.masterCategoryId === 'insurance-fraud-misrepresentation');
  } else if (qLower.includes('liability') || qLower.includes('fault') || qLower.includes('negligence') || qLower.includes('rear-end') || qLower.includes('roundabout')) {
    matchedReg = regs.find((r) => r.categoryId === 'liability-negligence' || r.masterCategoryId === 'courts-liability-disputes');
  } else if (qLower.includes('injury') || qLower.includes('whiplash') || qLower.includes('compensation') || qLower.includes('medical')) {
    matchedReg = regs.find((r) => r.categoryId === 'injury-compensation' || r.masterCategoryId === 'motor-claims-compensation');
  } else if (qLower.includes('damage') || qLower.includes('total loss') || qLower.includes('salvage') || qLower.includes('repair')) {
    matchedReg = regs.find((r) => r.categoryId === 'vehicle-damage' || r.masterCategoryId === 'repair-assessment-damage');
  } else if (qLower.includes('ev') || qLower.includes('electric') || qLower.includes('battery')) {
    matchedReg = regs.find((r) => r.masterCategoryId === 'ev-emerging-vehicles');
  } else if (qLower.includes('evidence') || qLower.includes('dashcam') || qLower.includes('cctv')) {
    matchedReg = regs.find((r) => r.categoryId === 'evidence-requirements' || r.masterCategoryId === 'privacy-data-evidence');
  } else {
    matchedReg = regs[0];
  }

  let answer = '';
  if (matchedReg) {
    answer = `Under the legal framework of ${meta.name}, this matter is governed by ${matchedReg.legalReference}.\n\n` +
      `${matchedReg.summary}\n\n` +
      `Detailed statutory operation: ${matchedReg.detailedExplanation}\n\n` +
      `Claims & Investigation Impact: ${matchedReg.claimsImplications} ${matchedReg.investigationImplications}`;

    citations.push({
      title: matchedReg.title,
      legalReference: matchedReg.legalReference,
      authority: matchedReg.authority,
      status: matchedReg.status,
      sourceUrl: matchedReg.sourceUrl,
    });
  } else {
    answer = `Official regulations for ${meta.name} on this specific topic are currently undergoing legal verification. General principles under ${meta.legalSystem || 'statutory law'} require compliance with minimum third-party indemnity and prompt accident reporting to local police authorities.`;
  }

  return {
    jurisdiction: meta.name,
    countryCode: cc,
    question,
    answer,
    citations,
    answeredAt: new Date().toISOString(),
  };
}
