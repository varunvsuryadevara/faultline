import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeClaimDecision, DECISION_OUTCOMES, DECISION_LABELS, REVIEW_PRIORITIES } from '../shared/decision.js';
import { buildReport } from '../src/lib/report.js';

test('TC-D1: Strong evidence supporting claim -> APPROVE', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine',
      risk: 'low',
      confidence: 0.9,
      supporting: [
        { point: 'Independent dashcam corroborates the lane change collision', exhibit: 'C', quote: 'dashcam shows van pulling into lane 2' },
        { point: 'Photographs match front bumper damage description', exhibit: 'B', quote: 'scratches and minor bumper dent' },
      ],
      against: [],
      indicators: [],
      missing: [],
    },
    analysis: {
      contradictions: [],
      corroborations: [{ fact: 'Impact occurred on A34 dual carriageway', exhibits: ['A', 'C'] }],
      timeline: [{ time: '13:20', event: 'Collision occurred', status: 'corroborated', exhibits: ['A', 'C'] }],
    },
    caseFile: {
      title: 'A34 Merge Collision',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I was driving in lane 2 when van merged into me.' },
        { id: 'B', label: 'Damage Photos', kind: 'photograph', text: 'Photos show light front bumper damage.' },
        { id: 'C', label: 'Dashcam Footage', kind: 'dashcam', text: 'Video confirms van merged into lane 2.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.APPROVE);
  assert.equal(decision.decision_label, DECISION_LABELS.APPROVE);
  assert.ok(decision.confidence >= 80, `Expected confidence >= 80, got ${decision.confidence}`);
  assert.ok(decision.approval_reasons.length > 0);
  assert.equal(decision.human_review_required, true);
});

test('TC-D2: Strong corroborated evidence of material fraud -> REJECT', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'confirmed-fraud',
      risk: 'critical',
      confidence: 0.95,
      against: [
        { point: 'CCTV footage shows vehicle was parked in garage at collision time', exhibit: 'B', quote: 'car remained parked until 21:15' },
        { point: 'Prior inspection photographs reveal pre-existing damage', exhibit: 'C', quote: 'identical front wing damage recorded in July' },
      ],
      supporting: [],
      indicators: [{ point: 'Staged ghost collision', weight: 'strong', exhibit: 'B' }],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          category: 'fabricated-event',
          title: 'Vehicle was not present at accident location',
          explanation: 'Claimant claims collision at 20:30, but CCTV verifies car was stationary 10 miles away.',
          evidence: [{ exhibit: 'A', quote: 'collision happened at 8:30pm' }, { exhibit: 'B', quote: 'car remained parked until 21:15' }],
        },
      ],
      corroborations: [],
      timeline: [],
    },
    caseFile: {
      title: 'Phantom M25 Crash',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I crashed on M25 at 20:30.' },
        { id: 'B', label: 'CCTV Footage Summary', kind: 'cctv', text: 'car remained parked until 21:15' },
        { id: 'C', label: 'Prior Inspection Record', kind: 'inspection', text: 'identical front wing damage recorded in July' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REJECT);
  assert.equal(decision.decision_label, DECISION_LABELS.REJECT);
  assert.ok(decision.primary_grounds.length > 0);
  assert.ok(decision.confidence >= 80);
});

test('TC-D3: Conflicting evidence -> REVIEW', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'disputed',
      risk: 'high',
      confidence: 0.65,
      supporting: [{ point: 'Claimant asserts right of way on roundabout', exhibit: 'A', quote: 'I was already on the roundabout' }],
      against: [{ point: 'Witness states claimant entered without looking', exhibit: 'B', quote: 'he pulled out in front of the red car' }],
      indicators: [],
      missing: [{ item: 'CCTV or dashcam recording', why: 'To resolve which vehicle entered the roundabout first' }],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'major',
          category: 'sequence',
          title: 'Roundabout entry priority conflict',
          explanation: 'Driver and witness give diametrically opposing accounts of who had priority.',
          evidence: [{ exhibit: 'A', quote: 'I was already on the roundabout' }, { exhibit: 'B', quote: 'he pulled out in front of the red car' }],
        },
      ],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'I was already on the roundabout.' },
        { id: 'B', label: 'Witness Account', kind: 'witness', text: 'he pulled out in front of the red car.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW);
  assert.equal(decision.decision_label, DECISION_LABELS.REVIEW);
  assert.ok(decision.review_priority);
  assert.ok(decision.recommended_actions.length > 0);
  assert.equal(decision.recommended_actions[0].priority, 1);
});

test('TC-D4: Missing critical evidence -> REVIEW (Safeguard 1: Missing evidence alone != REJECT)', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'insufficient-evidence',
      risk: 'medium',
      confidence: 0.45,
      supporting: [{ point: 'Claimant intimates hit and run in car park', exhibit: 'A', quote: 'found car scratched in supermarket' }],
      against: [],
      indicators: [],
      missing: [
        { item: 'Supermarket car park CCTV footage', why: 'Essential to confirm hit and run occurred on premises' },
        { item: 'Independent engineer damage report', why: 'To verify transfer paint and scrape direction' },
      ],
    },
    analysis: {
      contradictions: [],
      gaps: [{ gap: 'No police incident report provided', request: 'Ask claimant for police reference number' }],
    },
    caseFile: {
      exhibits: [{ id: 'A', label: 'Claimant Notification', kind: 'statement', text: 'found car scratched in supermarket' }],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW, 'Missing evidence must never trigger automatic REJECT');
  assert.ok(decision.missing_evidence.length >= 2);
  assert.ok(decision.confidence < 70);
});

test('TC-D5: Weak suspicious indicators without corroboration -> REVIEW, not automatic rejection (Safeguards 2 & 6)', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'suspicious',
      risk: 'medium',
      confidence: 0.55,
      supporting: [{ point: 'Policyholder reports hitting deer on rural road', exhibit: 'A', quote: 'deer ran across road at dusk' }],
      against: [],
      indicators: [
        { point: 'Claim reported nine days after alleged incident', weight: 'weak', exhibit: 'A', quote: 'reported nine days later' },
      ],
      missing: [{ item: 'Veterinary or forestry authority log', why: 'Confirm deer activity at location' }],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'deer ran across road at dusk. reported nine days later.' },
        { id: 'B', label: 'Photos of Radiator Grille', kind: 'photograph', text: 'hair traces and cracked grille.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW, 'Uncorroborated suspicious indicator must trigger REVIEW, not REJECT');
  assert.equal(decision.suspicious_indicators.length, 1);
  assert.equal(decision.suspicious_indicators[0].weight, 'weak');
});

test('TC-D6: Minor inconsistencies with otherwise strong evidence -> APPROVE (Safeguards 4 & 5)', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine-reporting-errors',
      risk: 'low',
      confidence: 0.88,
      supporting: [
        { point: 'Police report confirms multi-vehicle concertina in fog', exhibit: 'B', quote: 'five vehicles collided in heavy fog' },
        { point: 'Independent third party confirms collision impact', exhibit: 'C', quote: 'I felt the shunt from behind' },
      ],
      against: [],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'minor',
          category: 'time',
          title: 'Reporting time variance of 15 minutes',
          explanation: 'Driver states 7:15 while police log states 7:30.',
          evidence: [{ exhibit: 'A', quote: 'around 7:15' }, { exhibit: 'B', quote: 'police called 7:30' }],
        },
      ],
      corroborations: [{ fact: 'Fog was dense and caused chain collision', exhibits: ['A', 'B', 'C'] }],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'around 7:15 in fog.' },
        { id: 'B', label: 'Police Accident Log', kind: 'police_report', text: 'five vehicles collided in heavy fog. police called 7:30.' },
        { id: 'C', label: 'Third Party Statement', kind: 'witness', text: 'I felt the shunt from behind in dense fog.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.APPROVE);
  assert.ok(decision.executive_summary.includes('Minor reporting variations were evaluated and determined to be non-material'));
});

test('TC-D7: No uploaded evidence / thin file -> REVIEW with clearly identified missing evidence', () => {
  const decision = computeClaimDecision({
    caseFile: {
      title: 'Empty Case',
      exhibits: [],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW);
  assert.equal(decision.investigation_completeness, 0);
  assert.ok(decision.review_reasons.length > 0);
});

test('TC-D8: Multiple contradictory exhibits -> REVIEW with traceable contradictions', () => {
  const decision = computeClaimDecision({
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          title: 'Speed conflict',
          explanation: 'Driver claims 30mph, telematics records 68mph in 30 zone.',
          evidence: [{ exhibit: 'A', quote: 'doing 30mph' }, { exhibit: 'B', quote: 'recorded speed 68mph' }],
        },
        {
          id: 'C2',
          severity: 'major',
          title: 'Driver identity dispute',
          explanation: 'Insured claims spouse was driving, witness claims insured was behind the wheel.',
          evidence: [{ exhibit: 'A', quote: 'wife was driving' }, { exhibit: 'C', quote: 'insured exited driver seat' }],
        },
      ],
      corroborations: [],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', text: 'doing 30mph. wife was driving.' },
        { id: 'B', label: 'Telematics Report', text: 'recorded speed 68mph.' },
        { id: 'C', label: 'Witness Account', text: 'insured exited driver seat.' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW);
  assert.equal(decision.unresolved_issues.length, 2);
  assert.equal(decision.review_priority, REVIEW_PRIORITIES.CRITICAL);
});

test('TC-D9: New evidence added / dismissed contradiction updates recommendation dynamically', () => {
  const initial = computeClaimDecision({
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          title: 'Alleged pre-existing scratch',
          explanation: 'Assessor query on front bumper scratch.',
          evidence: [{ exhibit: 'A', quote: 'new scratch' }, { exhibit: 'B', quote: 'unclear photo' }],
        },
      ],
      corroborations: [{ fact: 'Impact occurred', exhibits: ['A', 'C'] }],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'new scratch.' },
        { id: 'B', label: 'Inspection Photo', kind: 'photograph', text: 'unclear photo.' },
        { id: 'C', label: 'Police Report', kind: 'police_report', text: 'confirmed collision.' },
      ],
    },
    review: {}, // Not yet reviewed
  });

  assert.equal(initial.decision, DECISION_OUTCOMES.REVIEW, 'Before review, critical conflict leads to REVIEW');

  // Investigator reviews and dismisses the false contradiction after getting clear photos:
  const updated = computeClaimDecision({
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          title: 'Alleged pre-existing scratch',
          explanation: 'Assessor query on front bumper scratch.',
          evidence: [{ exhibit: 'A', quote: 'new scratch' }, { exhibit: 'B', quote: 'unclear photo' }],
        },
      ],
      corroborations: [{ fact: 'Impact occurred', exhibits: ['A', 'C'] }],
    },
    caseFile: {
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement', text: 'new scratch.' },
        { id: 'B', label: 'Inspection Photo', kind: 'photograph', text: 'unclear photo.' },
        { id: 'C', label: 'Police Report', kind: 'police_report', text: 'confirmed collision.' },
      ],
    },
    review: { C1: 'dismissed' }, // Dismissed by human investigator
  });

  assert.equal(updated.decision, DECISION_OUTCOMES.APPROVE, 'Dismissing the conflict allows claim approval');
});

test('TC-D10: Saved and reopened investigations retain decision fields', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine',
      risk: 'low',
      confidence: 0.85,
      supporting: [{ point: 'Clear photographic corroboration', exhibit: 'A', quote: 'dent on door' }],
    },
    caseFile: {
      title: 'Saved Case',
      exhibits: [{ id: 'A', label: 'Photos', kind: 'photograph', text: 'dent on door' }, { id: 'B', label: 'Estimate', kind: 'repair', text: '£450 repair' }],
    },
  });

  const serialized = JSON.stringify(decision);
  const deserialized = JSON.parse(serialized);

  assert.equal(deserialized.decision, DECISION_OUTCOMES.APPROVE);
  assert.equal(deserialized.decision_label, DECISION_LABELS.APPROVE);
  assert.equal(deserialized.confidence, decision.confidence);
  assert.equal(deserialized.human_review_required, true);
});

test('TC-D11: Report export includes the correct decision and evidence', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'confirmed-fraud',
      risk: 'critical',
      confidence: 0.94,
      against: [{ point: 'GPS tracker proves vehicle was elsewhere', exhibit: 'B', quote: 'vehicle stationary in Leeds' }],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          category: 'fabricated-event',
          title: 'False Location',
          explanation: 'Claimed London crash, telemetry records Leeds.',
          evidence: [{ exhibit: 'A', quote: 'crashed in London' }, { exhibit: 'B', quote: 'vehicle stationary in Leeds' }],
          followUp: {},
        },
      ],
      corroborations: [],
      timeline: [],
      gaps: [],
      nextSteps: [],
      meta: {
        model: 'claude-sonnet-5-5',
        generatedAt: '2026-11-23T12:00:00Z',
        exhibits: [{ id: 'A', label: 'Statement' }, { id: 'B', label: 'GPS Report' }],
      },
      quoteCheck: { exact: 2, total: 2 },
    },
    caseFile: {
      title: 'London Telematics Case',
      exhibits: [
        { id: 'A', label: 'Statement', kind: 'statement', text: 'crashed in London' },
        { id: 'B', label: 'GPS Report', kind: 'telematics', text: 'vehicle stationary in Leeds' },
      ],
    },
  });

  const report = buildReport({
    title: 'London Telematics Case',
    context: 'Test claim',
    result: {
      summary: 'Staged claim attempt.',
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          category: 'fabricated-event',
          title: 'False Location',
          explanation: 'Claimed London crash, telemetry records Leeds.',
          evidence: [{ exhibit: 'A', quote: 'crashed in London', match: { status: 'exact' } }, { exhibit: 'B', quote: 'vehicle stationary in Leeds', match: { status: 'exact' } }],
          followUp: {},
        },
      ],
      corroborations: [],
      timeline: [],
      gaps: [],
      nextSteps: [],
      meta: {
        model: 'claude-sonnet-5-5',
        generatedAt: '2026-11-23T12:00:00Z',
        exhibits: [{ id: 'A', label: 'Statement' }, { id: 'B', label: 'GPS Report' }],
      },
      quoteCheck: { exact: 2, total: 2 },
    },
    decision,
  });

  assert.ok(report.includes('FINAL CLAIM DECISION & RECOMMENDATION'));
  assert.ok(report.includes('REJECT CLAIM'));
  assert.ok(report.includes('CONFIDENCE'));
  assert.ok(report.includes('EXECUTIVE SUMMARY'));
  assert.ok(report.includes('DISCLAIMER: AI-assisted recommendation requiring authorized human claims handler review'));
});

test('TC-D12: AI/API failure produces a safe error state rather than a fabricated decision', () => {
  // When no analysis or assessment is returned (e.g. model offline or failed),
  // evaluating with empty/error parameters returns a safe, unopinionated REVIEW with clear missing evidence
  const safeFallback = computeClaimDecision({
    caseFile: {
      title: 'Failed Assessment Case',
      exhibits: [{ id: 'A', label: 'Claimant Letter', text: 'I had an accident.' }],
    },
  });

  assert.equal(safeFallback.decision, DECISION_OUTCOMES.REVIEW);
  assert.notEqual(safeFallback.decision, DECISION_OUTCOMES.REJECT, 'Must never fabricate a rejection on failure');
  assert.notEqual(safeFallback.decision, DECISION_OUTCOMES.APPROVE, 'Must never fabricate an approval on failure');
  assert.ok(safeFallback.review_reasons.length > 0);
  assert.equal(safeFallback.human_review_required, true);
});

test('TC-D13: Decision Explanation Paragraph is detailed, specific and references exhibits for APPROVE', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'genuine',
      risk: 'low',
      supporting: [
        { point: 'Bumper damage matches rear impact', exhibit: 'B', quote: 'rear bumper deformed' },
        { point: 'Independent witness confirms stationary vehicle', exhibit: 'C', quote: 'claimant was stationary at lights' },
      ],
      against: [],
      indicators: [],
      missing: [],
    },
    analysis: {
      contradictions: [],
      corroborations: [{ fact: 'Claimant was stationary when impacted from behind', exhibits: ['A', 'C'] }],
      timeline: [{ time: '08:45', event: 'Stationary at red signal', status: 'corroborated', exhibits: ['A', 'C'] }],
    },
    caseFile: {
      title: 'Stationary Red Signal Impact',
      exhibits: [
        { id: 'A', label: 'Claimant Statement', kind: 'statement' },
        { id: 'B', label: 'Engineering Damage Photos', kind: 'photograph' },
        { id: 'C', label: 'Independent Witness Report', kind: 'witness' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.APPROVE);
  assert.ok(decision.decision_explanation, 'decision_explanation must exist');
  assert.ok(decision.decision_explanation.length > 250, 'Explanation paragraph must be detailed (100+ words)');
  assert.ok(decision.decision_explanation.includes('Exhibit A'), 'Must reference specific case exhibits');
  assert.ok(decision.decision_explanation.includes('Stationary Red Signal Impact'), 'Must reference specific case title');
  assert.ok(decision.decision_explanation.includes('approval of the claim is formally recommended'), 'Must explain why approval is appropriate');

  assert.ok(Array.isArray(decision.key_reasons), 'key_reasons must be an array');
  assert.ok(decision.key_reasons.length >= 3, 'Must have at least 3 key reasons');
  assert.ok(decision.key_reasons[0].includes('consistent'), 'Key reasons must address consistency');

  assert.ok(decision.supporting_count >= 2);
  assert.equal(decision.contradictions_count, 0);
  assert.ok(Array.isArray(decision.what_could_change_decision));
  assert.ok(decision.what_could_change_decision.length >= 1);
});

test('TC-D14: Decision Explanation Paragraph is detailed, specific and references verified grounds for REJECT', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'confirmed-fraud',
      risk: 'critical',
      against: [
        { point: 'Telematics confirms car was 50 miles away', exhibit: 'B', quote: 'GPS log coordinates near Birmingham' },
      ],
      supporting: [],
      indicators: [{ point: 'Fabricated accident', weight: 'strong', exhibit: 'B' }],
      missing: [],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'critical',
          category: 'fabricated-event',
          title: 'False Accident Location and Time',
          explanation: 'Claimant asserts London crash at 14:00, but telematics places car in Birmingham.',
          evidence: [{ exhibit: 'A', quote: 'crashed in London at 2pm' }, { exhibit: 'B', quote: 'GPS log coordinates near Birmingham' }],
        },
      ],
      corroborations: [],
      timeline: [],
    },
    caseFile: {
      title: 'Staged London Dual Carriageway Loss',
      exhibits: [
        { id: 'A', label: 'Claimant FNOL Statement', kind: 'statement' },
        { id: 'B', label: 'Black Box Telematics Report', kind: 'telematics' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REJECT);
  assert.ok(decision.decision_explanation, 'decision_explanation must exist');
  assert.ok(decision.decision_explanation.length > 250, 'Explanation paragraph must be detailed');
  assert.ok(decision.decision_explanation.includes('False Accident Location and Time'), 'Must reference specific critical contradiction');
  assert.ok(decision.decision_explanation.includes('Exhibit A'), 'Must reference specific case exhibits');
  assert.ok(decision.decision_explanation.includes('safeguards'), 'Must explain compliance with forensic safeguards');

  assert.ok(Array.isArray(decision.key_reasons));
  assert.ok(decision.key_reasons.length >= 3);
  assert.ok(decision.key_reasons.some((r) => r.includes('telemetry') || r.includes('contradicts')));
  assert.ok(decision.what_could_change_decision.some((c) => c.outcome.includes('REVIEW')));
});

test('TC-D15: Decision Explanation Paragraph is detailed, specific and explains unresolved ambiguity for REVIEW', () => {
  const decision = computeClaimDecision({
    assessment: {
      intent: 'disputed',
      risk: 'high',
      supporting: [{ point: 'Driver claims right of way', exhibit: 'A', quote: 'I had the green arrow' }],
      against: [{ point: 'Third party claims opposing green', exhibit: 'B', quote: 'my signal was green' }],
      indicators: [],
      missing: [{ item: 'Traffic Signal Sequence Data', why: 'To prove which approach had green phase' }],
    },
    analysis: {
      contradictions: [
        {
          id: 'C1',
          severity: 'major',
          category: 'traffic-signals',
          title: 'Traffic Signal Phase Dispute',
          explanation: 'Both drivers claim having the protected green filter signal simultaneously.',
          evidence: [{ exhibit: 'A', quote: 'I had the green arrow' }, { exhibit: 'B', quote: 'my signal was green' }],
        },
      ],
    },
    caseFile: {
      title: 'Crossroads Signal Collision',
      exhibits: [
        { id: 'A', label: 'Driver Statement', kind: 'statement' },
        { id: 'B', label: 'Third Party Statement', kind: 'statement' },
      ],
    },
  });

  assert.equal(decision.decision, DECISION_OUTCOMES.REVIEW);
  assert.ok(decision.decision_explanation, 'decision_explanation must exist');
  assert.ok(decision.decision_explanation.length > 250, 'Explanation paragraph must be detailed (100+ words)');
  assert.ok(decision.decision_explanation.includes('Traffic Signal Phase Dispute'), 'Must reference specific conflict');
  assert.ok(decision.decision_explanation.includes('Traffic Signal Sequence Data'), 'Must reference specific missing item');
  assert.ok(decision.decision_explanation.includes('premature'), 'Must explain why approval or rejection would be premature');

  assert.ok(Array.isArray(decision.key_reasons));
  assert.ok(decision.key_reasons.length >= 4);
  assert.equal(decision.contradictions_count, 1);
  assert.ok(decision.unresolved_count >= 1);

  // What could change decision must show both approval and rejection paths
  assert.ok(decision.what_could_change_decision.some((c) => c.outcome.includes('APPROVE')));
  assert.ok(decision.what_could_change_decision.some((c) => c.outcome.includes('REJECT')));
});
