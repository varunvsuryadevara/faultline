import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateJurisdictionalLegalContext,
  LEGAL_ASSESSMENT_STATUSES,
  REQUIREMENT_TYPES,
} from '../shared/legal-intelligence.js';
import { computeClaimDecision, DECISION_OUTCOMES, DECISION_LABELS } from '../shared/decision.js';
import { normalizeReportData, generatePlainTextReport, generateMarkdownReport } from '../src/lib/exportReport.js';

test('TC-LI1: Evaluates Jurisdictional Legal Context for APPROVE decision', () => {
  const result = evaluateJurisdictionalLegalContext({
    countryCode: 'UK',
    decision: 'APPROVE',
    caseFile: {
      title: 'M25 Rear-end collision',
      context: 'Policyholder was rear-ended in lane 2 while traffic was slowing down.',
      category: 'liability-negligence',
      claimType: 'rear-end',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I stopped in time and was struck from behind.' },
        { id: 'B', label: 'Rear Bumper Photos', kind: 'photograph', text: 'Photos confirm heavy rear bumper damage.' },
        { id: 'C', label: 'Dashcam Video', kind: 'dashcam', text: 'Dashcam captures following vehicle failing to brake.' },
      ],
    },
  });

  assert.equal(result.jurisdiction.countryCode, 'UK');
  assert.equal(result.jurisdiction.countryName, 'United Kingdom');
  assert.ok(result.applicableRegulations.length > 0, 'Should return relevant regulations');

  // Decision impact for APPROVE
  assert.equal(result.legalDecisionImpact.decisionCategory, 'APPROVE');
  assert.ok(result.legalDecisionImpact.affectingParagraph.includes('APPROVE'));
  assert.ok(result.legalDecisionImpact.considerations.length > 0);

  // Check compliance statuses
  const statuses = result.applicableRegulations.map((r) => r.assessmentStatus);
  assert.ok(
    statuses.some((s) => s === LEGAL_ASSESSMENT_STATUSES.SATISFIED.label || s === LEGAL_ASSESSMENT_STATUSES.POTENTIALLY_SATISFIED.label),
    'Should have satisfied or potentially satisfied statuses with strong evidence',
  );

  // Check requirement types
  assert.ok(result.applicableRegulations.some((r) => r.requirementType?.id === 'LEGAL_REQUIREMENT'));

  // Check traceability chain
  assert.ok(result.traceabilityChain.length > 0);
  assert.ok(result.traceabilityChain[0].regulationId);
  assert.ok(result.traceabilityChain[0].requirement);
  assert.ok(result.traceabilityChain[0].assessment);
  assert.ok(result.traceabilityChain[0].decisionRelevance);
});

test('TC-LI2: Evaluates Jurisdictional Legal Context for REJECT decision with proven fraud', () => {
  const result = evaluateJurisdictionalLegalContext({
    countryCode: 'US',
    region: 'US-CA',
    decision: 'REJECT',
    caseFile: {
      title: 'Fabricated I-5 Hit and Run',
      context: 'Claimant reported hit and run, but GPS confirms vehicle was parked at home.',
      category: 'insurance-fraud',
      claimType: 'staged',
      exhibits: [
        { id: 'A', label: 'Driver Statement', kind: 'statement', text: 'Struck on I-5 at 21:00 by hit and run.' },
        { id: 'B', label: 'Telematics / GPS Log', kind: 'telematics', text: 'Vehicle was stationary 25 miles away in driveway until 23:00.' },
      ],
    },
    contradictions: [
      {
        id: 'C1',
        severity: 'critical',
        title: 'Vehicle was not present at collision scene',
        explanation: 'GPS verifies vehicle remained stationary in residential driveway.',
      },
    ],
  });

  assert.equal(result.jurisdiction.countryCode, 'US');
  assert.equal(result.jurisdiction.regionCode, 'US-CA');
  assert.equal(result.jurisdiction.regionName, 'California');

  // Declinature impact
  assert.equal(result.legalDecisionImpact.decisionCategory, 'REJECT');
  assert.ok(result.legalDecisionImpact.affectingParagraph.includes('REJECTION'));
  assert.ok(result.legalDecisionImpact.considerations.length > 0);

  // Fraud / Non-compliance detection
  const fraudReg = result.applicableRegulations.find((r) => r.categoryId === 'insurance-fraud');
  if (fraudReg) {
    assert.equal(fraudReg.assessmentStatus, LEGAL_ASSESSMENT_STATUSES.POTENTIAL_NON_COMPLIANCE.label);
    assert.ok(fraudReg.assessmentRationale.includes('Objective technical evidence'));
  }
});

test('TC-LI3: Safeguard Check - Missing evidence alone never marks non-compliance', () => {
  const result = evaluateJurisdictionalLegalContext({
    countryCode: 'IN',
    decision: 'REVIEW',
    caseFile: {
      title: 'Minor Intersection Bump',
      context: 'Two cars bumped in Bangalore, drivers exchanged numbers, no police called.',
      category: 'accident-reporting',
      claimType: 'rear-end',
      exhibits: [
        { id: 'A', label: 'Driver Statement', kind: 'statement', text: 'Bumped rear bumper, minor scratch, no injuries.' },
      ],
    },
  });

  assert.equal(result.jurisdiction.countryCode, 'IN');
  const reportingReg = result.applicableRegulations.find((r) => r.categoryId === 'accident-reporting');
  if (reportingReg) {
    // Missing police report must be NOT_ESTABLISHED or REQUIRES_VERIFICATION, NOT NON-COMPLIANCE
    assert.notEqual(
      reportingReg.assessmentStatus,
      LEGAL_ASSESSMENT_STATUSES.POTENTIAL_NON_COMPLIANCE.label,
      'Missing police report must not be treated as a legal non-compliance violation',
    );
    assert.ok(
      reportingReg.assessmentStatus === LEGAL_ASSESSMENT_STATUSES.NOT_ESTABLISHED.label ||
      reportingReg.assessmentStatus === LEGAL_ASSESSMENT_STATUSES.REQUIRES_VERIFICATION.label,
    );
    assert.ok(reportingReg.assessmentRationale.includes('missing paperwork does not prove statutory non-compliance'));
  }
});

test('TC-LI4: Regional Jurisdictions - Support US, CA, AU, UK, IN states & provinces', () => {
  // Test US California
  const usCa = evaluateJurisdictionalLegalContext({ countryCode: 'US', region: 'US-CA' });
  assert.equal(usCa.jurisdiction.regionCode, 'US-CA');
  assert.equal(usCa.jurisdiction.regionName, 'California');

  // Test Canada Ontario
  const caOn = evaluateJurisdictionalLegalContext({ countryCode: 'CA', region: 'CA-ON' });
  assert.equal(caOn.jurisdiction.regionCode, 'CA-ON');
  assert.equal(caOn.jurisdiction.regionName, 'Ontario');

  // Test Australia NSW
  const auNsw = evaluateJurisdictionalLegalContext({ countryCode: 'AU', region: 'AU-NSW' });
  assert.equal(auNsw.jurisdiction.regionCode, 'AU-NSW');
  assert.equal(auNsw.jurisdiction.regionName, 'New South Wales');

  // Test UK Scotland
  const ukSct = evaluateJurisdictionalLegalContext({ countryCode: 'UK', region: 'UK-SCT' });
  assert.equal(ukSct.jurisdiction.regionCode, 'UK-SCT');
  assert.equal(ukSct.jurisdiction.regionName, 'Scotland');
});

test('TC-LI5: computeClaimDecision includes full jurisdictional legal intelligence', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine',
      risk: 'low',
      confidence: 0.9,
      supporting: [{ point: 'Dashcam confirms rear-end impact', exhibit: 'B' }],
      against: [],
      indicators: [],
      missing: [],
    },
    analysis: {
      contradictions: [],
      corroborations: [{ fact: 'Impact occurred on highway', exhibits: ['A', 'B'] }],
      timeline: [],
    },
    caseFile: {
      title: 'A4 Spiral Roundabout Collision',
      country: 'UK',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I was in the middle lane when car on left drifted over.' },
        { id: 'B', label: 'Dashcam Footage', kind: 'dashcam', text: 'Dashcam video of the spiral roundabout.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.APPROVE);
  assert.ok(decision.jurisdiction, 'Decision must include jurisdiction object');
  assert.equal(decision.jurisdiction.countryCode, 'UK');
  assert.ok(decision.applicableRegulations.length > 0, 'Decision must include applicableRegulations');
  assert.ok(decision.legalDecisionImpact, 'Decision must include legalDecisionImpact');
  assert.ok(decision.traceabilityChain.length > 0, 'Decision must include traceabilityChain');
});

test('TC-LI6: Custom Jurisdiction Override in computeClaimDecision', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine',
      risk: 'low',
      confidence: 0.88,
      supporting: [],
      against: [],
      indicators: [],
      missing: [],
    },
    analysis: { contradictions: [], corroborations: [], timeline: [] },
    caseFile: { title: 'Cross Border Case', exhibits: [{ id: 'A', label: 'Statement', text: 'Accident occurred.' }] },
    jurisdiction: { countryCode: 'DE' },
  });

  assert.equal(decision.jurisdiction.countryCode, 'DE');
  assert.equal(decision.jurisdiction.countryName, 'Germany');
  assert.equal(decision.jurisdiction.regulator, 'Federal Financial Supervisory Authority (BaFin)');
});

test('TC-LI7: Report Export embeds legal assessments and reviewer sign-off', () => {
  const data = {
    title: 'UK-001 Roundabout Collision',
    scenarioId: 'UK-001',
    context: 'Accident on Reading spiral roundabout.',
    isReviewed: true,
    reviewerName: 'Lead Claims Assessor J. Smith',
    reviewedAt: '2026-11-23T12:00:00Z',
    reviewerNotes: {
      global: 'Verified claimant dashcam matches damage photos; approved for settlement.',
    },
    decision: {
      decision: 'APPROVE',
      decision_label: 'APPROVE CLAIM',
      confidence: 92,
      confidence_explanation: 'High confidence based on objective telemetry.',
      risk_level: 'LOW',
      investigation_completeness: 85,
      decision_explanation: 'Comprehensive forensic review confirms valid claim.',
      key_reasons: ['Dashcam confirms third party drifted into lane.'],
      legalDecisionImpact: {
        affectingParagraph: 'UK statutory traffic laws support approval of indemnity.',
        considerations: ['Road Traffic Act 1988 requirements satisfied.'],
      },
      applicableRegulations: [
        {
          id: 'REG-UK-1',
          title: 'Road Traffic Act 1988 - Compulsory Insurance',
          legalReference: 'RTA 1988 s.143',
          authority: 'Department for Transport',
          status: 'VERIFIED',
          assessmentStatus: 'SATISFIED BY AVAILABLE EVIDENCE',
          summary: 'Requires valid motor insurance for vehicle use.',
          claimsImplications: 'Valid third-party indemnity established.',
          investigationImplications: 'Check policy certificate validity.',
          sourceUrl: 'https://www.legislation.gov.uk/ukpga/1988/52/section/143',
        },
      ],
    },
  };

  const norm = normalizeReportData(data);
  assert.equal(norm.isReviewed, true);
  assert.equal(norm.reviewerName, 'Lead Claims Assessor J. Smith');
  assert.equal(norm.applicableRegulations.length, 1);

  // Check TXT Export
  const txt = generatePlainTextReport(data);
  assert.ok(txt.includes('APPLICABLE STATUTORY & REGULATORY CONTEXT'));
  assert.ok(txt.includes('RTA 1988 s.143'));
  assert.ok(txt.includes('SATISFIED BY AVAILABLE EVIDENCE'));
  assert.ok(txt.includes('HUMAN CLAIMS REVIEWER WORKSPACE & SIGN-OFF'));
  assert.ok(txt.includes('Lead Claims Assessor J. Smith'));
  assert.ok(txt.includes('Verified claimant dashcam matches damage photos'));

  // Check Markdown Export
  const md = generateMarkdownReport(data);
  assert.ok(md.includes('## Applicable Statutory & Regulatory Context'));
  assert.ok(md.includes('`SATISFIED BY AVAILABLE EVIDENCE`'));
  assert.ok(md.includes('## Human Claims Reviewer Sign-Off'));
  assert.ok(md.includes('Lead Claims Assessor J. Smith'));
});
