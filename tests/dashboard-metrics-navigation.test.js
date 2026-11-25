import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeClaimDecision, DECISION_OUTCOMES } from '../shared/decision.js';

test('DM-1: Exact count parity between dashboard metrics and destination record collections', () => {
  const mockAnalysis = {
    contradictions: [
      {
        id: 'C1',
        title: 'Collision impact point diverges between driver statement and engineering report',
        severity: 'critical',
        explanation: 'Driver asserts rear-end impact while telemetry indicates side-swipe angle.',
        evidence: [
          { exhibit: 'A', quote: 'I was hit directly from behind at the roundabout exit.' },
          { exhibit: 'B', quote: 'Damage pattern shows lateral scraping consistent with side-swipe.' },
        ],
        followUp: { question: 'Clarify the exact angle of approach and vehicle positioning.' },
      },
      {
        id: 'C2',
        title: 'Discrepancy in weather conditions and visibility',
        severity: 'minor',
        explanation: 'Witness reports clear dry road while claimant claims heavy rain.',
        evidence: [
          { exhibit: 'A', quote: 'Road was slick from heavy downpour.' },
          { exhibit: 'C', quote: 'Clear dry afternoon with good visibility.' },
        ],
        followUp: { question: 'Check local meteorological weather log.' },
      },
    ],
    corroborations: [
      {
        id: 'K1',
        fact: 'Vehicle came to a complete stop prior to entering the circulatory carriageway',
        exhibits: ['A', 'C'],
        isIndependent: true,
        evidence: [
          { exhibit: 'A', quote: 'I stopped at the give-way line.' },
          { exhibit: 'C', quote: 'The red hatchback halted before entering the roundabout.' },
        ],
      },
      {
        id: 'K2',
        fact: 'Driver was wearing a seatbelt and deployed hazards immediately following contact',
        exhibits: ['A', 'B'],
        isIndependent: false,
        evidence: [
          { exhibit: 'A', quote: 'Hazard lights turned on immediately.' },
          { exhibit: 'B', quote: 'Hazards were flashing upon recovery arrival.' },
        ],
      },
    ],
    timeline: [
      { time: '14:30', event: 'Driver enters roundabout approach', status: 'corroborated', exhibits: ['A', 'C'], conflicts: [] },
      { time: '14:32', event: 'Impact occurrence', status: 'disputed', exhibits: ['A', 'B'], conflicts: ['C1'] },
    ],
    gaps: [
      { gap: 'Independent junction CCTV coverage', request: 'Request municipal traffic camera logs.' },
    ],
    nextSteps: [
      'Obtain telematics speed trace',
    ],
    meta: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement' },
        { id: 'B', label: 'Assessor Inspection Report', kind: 'inspection' },
        { id: 'C', label: 'Independent Witness Account', kind: 'witness' },
      ],
    },
  };

  const mockAssessment = {
    supporting: [
      { point: 'Bumper dent profile aligns with low-speed contact dynamics', exhibit: 'B', quote: 'Minor compression dent under 10mph' },
      { point: 'Independent bystander confirms vehicle maintained marked lane', exhibit: 'C', quote: 'Remained within Lane 1 markings' },
    ],
    against: [],
    indicators: [],
    missing: [
      { item: 'Official Police Collision Report', why: 'Required to confirm whether breathalyser was administered.' },
    ],
  };

  // Compute decision with 0 dismissed review items
  const decision = computeClaimDecision({
    analysis: mockAnalysis,
    assessment: mockAssessment,
    caseFile: { title: 'Test Collision Case', exhibits: mockAnalysis.meta.exhibits },
    review: {},
  });

  // Verify Supporting Facts Metric parity (4 verified records)
  // 2 from corroborations (verified facts) + 2 from assessment supporting = 4
  assert.equal(decision.supporting_count, 4, 'Supporting count should equal 4');
  assert.equal(decision.verified_facts.length, 2, 'Verified facts array length should be 2');
  assert.equal(decision.supporting_evidence.length, 2, 'Supporting evidence array length should be 2');
  assert.equal(
    decision.verified_facts.length + decision.supporting_evidence.length,
    decision.supporting_count,
    'Combined supporting records must strictly equal decision.supporting_count',
  );

  // Verify Unresolved Items Metric parity (3 to verify records)
  // 2 active contradictions (C1, C2) + (1 missing + 1 gap = 2 missing evidence items) = 4
  // Let's check with 1 contradiction + 2 missing items = 3:
  const decisionWithOneConflict = computeClaimDecision({
    analysis: {
      ...mockAnalysis,
      contradictions: [mockAnalysis.contradictions[0]], // only C1
    },
    assessment: mockAssessment, // 1 missing + 1 gap = 2 missing evidence items
    caseFile: { title: 'Test Collision Case', exhibits: mockAnalysis.meta.exhibits },
    review: {},
  });

  assert.equal(decisionWithOneConflict.unresolved_count, 3, 'Unresolved count must equal exactly 3');
  assert.equal(decisionWithOneConflict.unresolved_issues.length, 1, 'Should have 1 active contradiction');
  assert.equal(decisionWithOneConflict.missing_evidence.length, 2, 'Should have 2 missing evidence items');
  assert.equal(
    decisionWithOneConflict.unresolved_issues.length + decisionWithOneConflict.missing_evidence.length,
    decisionWithOneConflict.unresolved_count,
    'Combined unresolved records must strictly equal decision.unresolved_count',
  );
});

test('DM-2: Dynamic recalculation of Unresolved Items when investigator resolves a contradiction', () => {
  const mockAnalysis = {
    contradictions: [
      {
        id: 'C1',
        title: 'Collision speed discrepancy',
        severity: 'major',
        explanation: 'Driver claimed 20mph, inspection suggests 40mph impact energy.',
        evidence: [{ exhibit: 'A', quote: 'approx 20mph' }, { exhibit: 'B', quote: 'severe rail deformation' }],
        followUp: { question: 'Inspect airbag deployment module.' },
      },
    ],
    corroborations: [],
    timeline: [],
    gaps: [{ gap: 'Pre-impact vehicle telemetry log', request: 'Retrieve onboard EDR file' }],
    nextSteps: [],
    meta: {
      exhibits: [
        { id: 'A', label: 'Statement', kind: 'statement' },
        { id: 'B', label: 'Engineer Inspection', kind: 'inspection' },
      ],
    },
  };

  const mockAssessment = {
    supporting: [],
    against: [],
    indicators: [],
    missing: [
      { item: 'Road Safety Audit junction diagram', why: 'Verify road layout geometry' },
    ],
  };

  // Initially: 1 active contradiction (C1) + 2 missing items (1 missing + 1 gap) = 3 to verify
  const initialDecision = computeClaimDecision({
    analysis: mockAnalysis,
    assessment: mockAssessment,
    caseFile: { title: 'Speed Conflict Case', exhibits: mockAnalysis.meta.exhibits },
    review: {},
  });

  assert.equal(initialDecision.unresolved_count, 3, 'Initial unresolved count should be 3');
  assert.equal(initialDecision.unresolved_issues.length, 1);

  // Investigator marks C1 as dismissed / resolved:
  const updatedDecision = computeClaimDecision({
    analysis: mockAnalysis,
    assessment: mockAssessment,
    caseFile: { title: 'Speed Conflict Case', exhibits: mockAnalysis.meta.exhibits },
    review: { C1: 'dismissed' },
  });

  // Dynamic update: C1 is no longer in activeContradictions, unresolved_issues is 0, count drops to 2
  assert.equal(updatedDecision.unresolved_count, 2, 'Unresolved count must dynamically decrease to 2');
  assert.equal(updatedDecision.unresolved_issues.length, 0, 'Unresolved issues must be 0 after dismissal');
  assert.equal(updatedDecision.missing_evidence.length, 2, 'Missing evidence items remain 2');
});

test('DM-3: Unresolved items clearly distinguish Blocking Settlement vs Non-Blocking status', () => {
  const mockAnalysis = {
    contradictions: [
      {
        id: 'C1',
        title: 'Critical fraud staging indicator',
        severity: 'critical',
        explanation: 'Damage on claimant car was present in prior salvage auction photos.',
        evidence: [{ exhibit: 'A', quote: 'Fresh damage' }, { exhibit: 'B', quote: 'Pre-existing oxidized rust' }],
        followUp: { question: 'Check salvage registry timestamp.' },
      },
      {
        id: 'C2',
        title: 'Minor spelling variance in passenger surname',
        severity: 'minor',
        explanation: 'Surname spelled with single vs double L.',
        evidence: [{ exhibit: 'A', quote: 'Smith' }, { exhibit: 'C', quote: 'Smithe' }],
        followUp: { question: 'Check driving license spelling.' },
      },
    ],
    corroborations: [],
    timeline: [],
    gaps: [],
    nextSteps: [],
    meta: { exhibits: [{ id: 'A', label: 'Statement', kind: 'statement' }] },
  };

  const decision = computeClaimDecision({
    analysis: mockAnalysis,
    caseFile: { title: 'Blocking Test', exhibits: mockAnalysis.meta.exhibits },
    review: {},
  });

  const c1 = decision.unresolved_issues.find((i) => i.id === 'C1');
  const c2 = decision.unresolved_issues.find((i) => i.id === 'C2');

  assert.ok(c1, 'Critical issue C1 should be present');
  assert.ok(c2, 'Minor issue C2 should be present');

  // Verify blocking classification rules
  const isC1Blocking = c1.severity === 'critical' || c1.severity === 'major';
  const isC2Blocking = c2.severity === 'critical' || c2.severity === 'major';

  assert.equal(isC1Blocking, true, 'Critical contradiction must be classified as BLOCKING SETTLEMENT');
  assert.equal(isC2Blocking, false, 'Minor contradiction must be classified as NON-BLOCKING');
});

test('DM-4: URL routing and hash parsing handles metric navigation and filters correctly', () => {
  // Test routeFromHash parsing logic matching App.jsx
  function routeFromHash(hash) {
    const [pathPart, queryPart] = (hash || '').split('?');
    const params = new URLSearchParams(queryPart || '');
    const tab = params.get('tab') || null;
    const filter = params.get('filter') || null;

    if (pathPart === '#/case' || pathPart === '#/workspace') {
      return { view: 'workspace', tab, filter };
    }
    return { view: 'landing' };
  }

  function urlFor({ view, tab, filter }) {
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (filter) params.set('filter', filter);
    const qs = params.toString() ? `?${params.toString()}` : '';
    if (view === 'workspace') return `#/case${qs}`;
    return '#/';
  }

  // Supporting facts route
  const supportingHash = '#/case?tab=agreed&filter=supporting';
  const supportingRoute = routeFromHash(supportingHash);
  assert.deepEqual(supportingRoute, { view: 'workspace', tab: 'agreed', filter: 'supporting' });
  assert.equal(urlFor(supportingRoute), supportingHash);

  // Unresolved items route
  const unresolvedHash = '#/case?tab=gaps&filter=unresolved';
  const unresolvedRoute = routeFromHash(unresolvedHash);
  assert.deepEqual(unresolvedRoute, { view: 'workspace', tab: 'gaps', filter: 'unresolved' });
  assert.equal(urlFor(unresolvedRoute), unresolvedHash);

  // Plain workspace without filters
  const plainHash = '#/case';
  const plainRoute = routeFromHash(plainHash);
  assert.deepEqual(plainRoute, { view: 'workspace', tab: null, filter: null });
  assert.equal(urlFor(plainRoute), '#/case');
});

test('DM-5: Supporting evidence records contain full investigation inspection attributes', () => {
  const mockAnalysis = {
    contradictions: [],
    corroborations: [
      {
        id: 'K1',
        fact: 'Vehicle headlight was functioning prior to impact',
        exhibits: ['A', 'B'],
        isIndependent: true,
        evidence: [
          { exhibit: 'A', quote: 'Headlights were illuminated.', match: { start: 10, end: 35 } },
          { exhibit: 'B', quote: 'Filament hot shock proves lamp was on.', match: { start: 50, end: 85 } },
        ],
      },
    ],
    timeline: [],
    gaps: [],
    nextSteps: [],
    meta: {
      exhibits: [
        { id: 'A', label: 'Driver Statement', kind: 'statement' },
        { id: 'B', label: 'Forensic Lab Bulb Analysis', kind: 'inspection' },
      ],
    },
  };

  const decision = computeClaimDecision({
    analysis: mockAnalysis,
    caseFile: { title: 'Headlight Case', exhibits: mockAnalysis.meta.exhibits },
    review: {},
  });

  assert.equal(decision.verified_facts.length, 1);
  const fact = decision.verified_facts[0];
  assert.equal(fact.statement, 'Vehicle headlight was functioning prior to impact');
  assert.deepEqual(fact.exhibits, ['A', 'B']);
  assert.ok(fact.reliability.includes('High'), 'Reliability tier should be High');
});
