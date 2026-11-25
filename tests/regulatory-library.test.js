import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRY_METADATA,
  REGIONAL_JURISDICTIONS,
  REGULATION_CATEGORIES,
  VERIFICATION_STATUSES,
} from '../shared/regulations/vocab.js';
import { REGULATIONS, OFFICIAL_DOCUMENTS } from '../shared/regulations/data.js';
import {
  getCountryRegulations,
  getCountryDocuments,
  getCountryStats,
  getAllCountriesStats,
  getRegulationById,
  compareJurisdictions,
  getRelevantRegulationsForCase,
  askJurisdictionAssistant,
} from '../shared/regulations/query.js';
import {
  normalizeReportData,
  generatePlainTextReport,
  generateMarkdownReport,
} from '../src/lib/exportReport.js';
import { generateCountryGuidePdf } from '../src/lib/countryGuidePdf.js';

test('Regulatory Library — 20 countries metadata completeness', () => {
  const expectedCountries = [
    'UK', 'US', 'IN', 'CA', 'AU', 'AE', 'DE', 'FR', 'ZA', 'SG',
    'IE', 'NZ', 'JP', 'BR', 'NG', 'KE', 'MY', 'NL', 'IT', 'ES'
  ];

  assert.equal(Object.keys(COUNTRY_METADATA).length, 20);

  for (const cc of expectedCountries) {
    const meta = COUNTRY_METADATA[cc];
    assert.ok(meta, `Metadata missing for ${cc}`);
    assert.equal(meta.code, cc);
    assert.ok(meta.name.length > 2, `Name missing for ${cc}`);
    assert.ok(meta.flag, `Flag missing for ${cc}`);
    assert.ok(meta.legalSystem, `Legal system missing for ${cc}`);
    assert.ok(meta.regulator, `Regulator missing for ${cc}`);
  }
});

test('Regulatory Library — 10 standard categories defined with metadata', () => {
  assert.equal(REGULATION_CATEGORIES.length, 10);
  const ids = REGULATION_CATEGORIES.map((c) => c.id);
  assert.ok(ids.includes('mandatory-insurance'));
  assert.ok(ids.includes('accident-reporting'));
  assert.ok(ids.includes('liability-negligence'));
  assert.ok(ids.includes('claims-procedures'));
  assert.ok(ids.includes('injury-compensation'));
  assert.ok(ids.includes('vehicle-damage'));
  assert.ok(ids.includes('insurance-fraud'));
  assert.ok(ids.includes('traffic-laws'));
  assert.ok(ids.includes('evidence-requirements'));
  assert.ok(ids.includes('disputes-appeals'));
});

test('Regulatory Library — Priority countries have verified authentic statutes', () => {
  // UK
  const ukRegs = getCountryRegulations('UK');
  assert.ok(ukRegs.length >= 8, `Expected at least 8 UK regulations, got ${ukRegs.length}`);
  const rta143 = ukRegs.find((r) => r.legalReference.includes('143'));
  assert.ok(rta143, 'UK RTA Section 143 compulsory insurance must exist');
  assert.equal(rta143.status, 'VERIFIED');
  const fraud2006 = ukRegs.find((r) => r.legalReference.includes('Fraud Act 2006'));
  assert.ok(fraud2006, 'UK Fraud Act 2006 must exist');

  // India
  const inRegs = getCountryRegulations('IN');
  assert.ok(inRegs.length >= 5, `Expected at least 5 India regulations, got ${inRegs.length}`);
  const mva146 = inRegs.find((r) => r.legalReference.includes('146'));
  assert.ok(mva146, 'India MVA Section 146 must exist');
  assert.equal(mva146.status, 'VERIFIED');

  // US
  const usRegs = getCountryRegulations('US');
  assert.ok(usRegs.length >= 4, `Expected at least 4 US regulations, got ${usRegs.length}`);
  const nyNoFault = usRegs.find((r) => r.title.includes('No-Fault'));
  assert.ok(nyNoFault, 'US NY No-Fault PIP regulation must exist');

  // Canada
  const caRegs = getCountryRegulations('CA');
  assert.ok(caRegs.length >= 2, 'Canada regulations must exist');
  const dcpd = caRegs.find((r) => r.title.includes('Direct Compensation') || r.title.includes('DCPD'));
  assert.ok(dcpd, 'Canada DCPD must exist');

  // Australia
  const auRegs = getCountryRegulations('AU');
  assert.ok(auRegs.length >= 2, 'Australia regulations must exist');
  const ctp = auRegs.find((r) => r.title.includes('CTP') || r.title.includes('Green Slip'));
  assert.ok(ctp, 'Australia CTP must exist');
});

test('Regulatory Library — Official Documents repository check', () => {
  assert.ok(OFFICIAL_DOCUMENTS.length >= 10);
  const ukDocs = getCountryDocuments('UK');
  assert.ok(ukDocs.length >= 3);
  assert.ok(ukDocs.some((d) => d.officialUrl.startsWith('http')));

  const inDocs = getCountryDocuments('IN');
  assert.ok(inDocs.length >= 2);
});

test('Regulatory Library — Search and filter operations', () => {
  // Query by text
  const whiplashSearch = getCountryRegulations('UK', { query: 'whiplash' });
  assert.ok(whiplashSearch.length >= 1);
  assert.ok(whiplashSearch.some((r) => r.title.includes('Whiplash')));

  // Category filter
  const fraudRegs = getCountryRegulations('UK', { categoryId: 'insurance-fraud' });
  assert.ok(fraudRegs.length >= 1);
  assert.equal(fraudRegs[0].categoryId, 'insurance-fraud');

  // Regional filter for US
  const caRegional = getCountryRegulations('US', { region: 'US-CA' });
  assert.ok(caRegional.length >= 1);
  assert.ok(caRegional.some((r) => r.title.includes('California') || r.region === 'US-CA'));
});

test('Regulatory Library — Stats generation integrating existing claim counts', () => {
  const claimCountsMap = new Map([
    ['UK', 48],
    ['US', 32],
    ['IN', 28],
  ]);

  const allStats = getAllCountriesStats(claimCountsMap);
  assert.equal(allStats.length, 20);

  const ukStat = allStats.find((s) => s.code === 'UK');
  assert.ok(ukStat);
  assert.equal(ukStat.claimCount, 48);
  assert.ok(ukStat.regulationCount >= 8);
  assert.ok(ukStat.documentCount >= 3);
  assert.equal(ukStat.verificationStatus, 'VERIFIED');

  const inStat = allStats.find((s) => s.code === 'IN');
  assert.equal(inStat.claimCount, 28);
});

test('Regulatory Library — Cross-jurisdiction comparison matrix', () => {
  const matrix = compareJurisdictions(['UK', 'US', 'IN']);
  assert.equal(matrix.length, 3);

  const uk = matrix.find((m) => m.code === 'UK');
  assert.ok(uk.mandatoryInsurance.includes('143'));
  assert.ok(uk.reportingRules.includes('170'));
  assert.ok(uk.fraudPenalties.includes('2006'));

  const ind = matrix.find((m) => m.code === 'IN');
  assert.ok(ind.mandatoryInsurance.includes('146'));
});

test('Regulatory Library — Case relevance engine matches appropriate statutes', () => {
  // Test case with whiplash and injury
  const injuryCase = getRelevantRegulationsForCase({
    country: 'UK',
    category: 'Whiplash & Soft Tissue',
    claimType: 'Bodily Injury',
    title: 'Exaggerated whiplash claim on M4',
    context: 'Claimant alleged cervical spine sprain after minor low-speed bump.',
  });

  assert.ok(injuryCase.length >= 1);
  assert.ok(injuryCase.some((m) => m.regulation.categoryId === 'injury-compensation'));

  // Test case with fraud / staged accident
  const fraudCase = getRelevantRegulationsForCase({
    country: 'UK',
    category: 'Staged Accident',
    title: 'Crash for cash slam-on round Reading',
    context: 'Induced rear-end collision with disabled brake lights.',
  });

  assert.ok(fraudCase.length >= 1);
  assert.ok(fraudCase.some((m) => m.regulation.categoryId === 'insurance-fraud'));
});

test('Regulatory Library — Legal Research Assistant Q&A retrieval', () => {
  const response = askJurisdictionAssistant({
    countryCode: 'UK',
    question: 'What is the statutory deadline to report a car accident to the police?',
  });

  assert.equal(response.countryCode, 'UK');
  assert.ok(response.answer.includes('Section 170') || response.answer.includes('24 hours'));
  assert.ok(response.citations.length >= 1);
  assert.ok(response.citations[0].legalReference.includes('170'));
});

test('Regulatory Library — Report Export incorporates statutory context', () => {
  const rawInput = {
    title: 'Roundabout Collision Investigation',
    scenarioId: 'UK-001',
    scenario: {
      id: 'UK-001',
      country: 'UK',
      category: 'Roundabout collision',
      title: 'Lane dispute on a spiral roundabout',
    },
    result: {
      contradictions: [],
      meta: { model: 'gemini-1.5-flash', generatedAt: new Date().toISOString() },
    },
  };

  const norm = normalizeReportData(rawInput);
  assert.ok(norm.applicableRegulations);
  assert.ok(norm.applicableRegulations.length >= 1);

  // Check plain text export contains statutory section
  const txt = generatePlainTextReport(rawInput);
  assert.ok(txt.includes('APPLICABLE STATUTORY & REGULATORY CONTEXT'));
  assert.ok(txt.includes('Road Traffic Act 1988'));

  // Check markdown export contains statutory section
  const md = generateMarkdownReport(rawInput);
  assert.ok(md.includes('## Applicable Statutory & Regulatory Context'));
  assert.ok(md.includes('Road Traffic Act 1988'));
});

test('Regulatory Library — Country Guide PDF generation', () => {
  const { blob, filename, title } = generateCountryGuidePdf('UK');
  assert.ok(blob);
  assert.ok(blob.size > 1000);
  assert.ok(filename.includes('FaultLine_Motor_Insurance_Guide_UK_'));
  assert.ok(title.includes('United Kingdom'));
});
