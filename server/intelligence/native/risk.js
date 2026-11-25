// Native Risk Intelligence Engine for FaultLine.
// Evaluates explainable risk indicators based on evidence and validated insurance fraud typologies.
// Strict safeguards: Missing evidence != fraud; Never uses protected personal characteristics.

import { EXHIBIT_IDS } from '../../../shared/constants.js';

export function evaluateNativeRiskIndicators(exhibits = [], context = '') {
  const indicators = [];
  let indicatorCounter = 1;

  const allText = exhibits.map((e) => e.text || '').join(' ') + ' ' + (context || '');
  const t = allText.toLowerCase();

  // 1. Induced / Staged Collision Typology (Slam-On / Flash-for-Cash)
  if (
    /braked erratically|tapping his brakes|sudden stop|jammed on (the )?brakes|abrupt(ly)? brak|slammed (on)?|flashed (his )?headlights then pulled out|slam-on/i.test(t)
  ) {
    indicators.push({
      id: 'RISK-INDUCED-DECEL-01',
      name: 'INDUCED_COLLISION_INDICATOR',
      title: 'Potential Induced Collision / Staged Deceleration',
      severity: 'HIGH',
      materiality: 'MATERIAL',
      explanation: 'Witness or telematics reports preceding erratic or sudden braking behavior without clear road obstruction, characteristic of an induced collision ("slam-on").',
      triggeringRule: 'RULE-FRAUD-01: Erratic pre-impact deceleration without queue obstruction.',
      triggeringEvidence: exhibits.filter((e) => /braked|tapping|flashed|erratic|jammed/i.test(e.text || '')).map((e) => e.label || 'Exhibit'),
      limitations: 'Driver may assert an animal, pedestrian, or unexpected hazard was present in the carriageway.',
      recommendedAction: 'Inspect vehicle black box / telematics for pre-impact pedal trace and request dashcam footage.',
    });
  }

  // 2. Pre-Existing Corrosion / Prior Damage Typology
  if (
    /rust|corrosion|old damage|old fracture|paint oxidation|pre-existing (impact|damage|rust)/i.test(t)
  ) {
    indicators.push({
      id: 'RISK-CORROSION-02',
      name: 'PRE_EXISTING_DAMAGE_INCONSISTENCY',
      title: 'Pre-Existing Oxidation on Claimed Impact Fracture',
      severity: 'CRITICAL',
      materiality: 'MATERIAL',
      explanation: 'Engineering inspection confirms pre-existing corrosion on claimed structural fracture edges, refuting that all damage originated in the reported loss event.',
      triggeringRule: 'RULE-METALLURGY-02: Oxidation presence on fresh collision fractures.',
      triggeringEvidence: exhibits.filter((e) => /rust|corrosion|old damage/i.test(e.text || '')).map((e) => e.label || 'Exhibit'),
      limitations: 'Must verify weather exposure duration between collision date and physical vehicle inspection.',
      recommendedAction: 'Obtain historical vehicle inspection / MOT records and prior claims database check (CUE/ISO).',
    });
  }

  // 3. Phony Occupancy / Ghost Passenger Typology
  if (
    /no passengers?|alone|sole occupant/i.test(t) && /whiplash claim for passenger|passenger in back seat|claim from third party passenger/i.test(t)
  ) {
    indicators.push({
      id: `RSK-${String(indicatorCounter++).padStart(3, '0')}`,
      name: 'GHOST_PASSENGER_ALERT',
      title: 'Contradicted Occupant / Bodily Injury Claim',
      severity: 'CRITICAL',
      materiality: 'MATERIAL',
      explanation: 'Third-party passenger bodily injury claim submitted despite independent witness and driver statements confirming sole vehicle occupancy.',
      triggeringRule: 'RULE-OCCUPANCY-03: Contradicted passenger headcount.',
      triggeringEvidence: exhibits.filter((e) => /passenger|alone|occupant/i.test(e.text || '')).map((e) => e.label || 'Exhibit'),
      limitations: 'Check whether third party vehicle had passengers or if claimant was unaccompanied.',
      recommendedAction: 'Cross-examine ambulance triage sheet, paramedic log, and hospital admission timestamps.',
    });
  }

  // 4. Deceleration Anomaly without Physical Skid Marks
  if (
    /no skid marks|abs disabled|telematics indicates 0 mph prior to impact/i.test(t)
  ) {
    indicators.push({
      id: `RSK-${String(indicatorCounter++).padStart(3, '0')}`,
      name: 'TELEMETRY_DYNAMICS_ANOMALY',
      title: 'Collision Dynamics Anomaly',
      severity: 'MEDIUM',
      materiality: 'MATERIAL',
      explanation: 'Vehicle dynamics data indicates absence of evasive maneuvers or pre-impact braking.',
      triggeringRule: 'RULE-DYNAMICS-04: Lack of evasive deceleration in daylight conditions.',
      triggeringEvidence: exhibits.filter((e) => /skid marks|abs|telematics/i.test(e.text || '')).map((e) => e.label || 'Exhibit'),
      limitations: 'Modern anti-lock braking systems (ABS) frequently prevent visible rubber deposit tire marks.',
      recommendedAction: 'Download electronic control unit (ECU) airbag deployment deployment logs.',
    });
  }

  const overallRisk = indicators.some((i) => i.severity === 'CRITICAL')
    ? 'CRITICAL'
    : indicators.some((i) => i.severity === 'HIGH')
      ? 'HIGH'
      : indicators.length > 0
        ? 'MEDIUM'
        : 'LOW';

  return {
    total: indicators.length,
    totalIndicators: indicators.length,
    overallRisk,
    riskTier: overallRisk,
    indicators,
    hasCriticalRisk: indicators.some((i) => i.severity === 'CRITICAL'),
    safeguardNotice: 'Bad-Faith Litigation Guard: Fraud indicators are forensic heuristics and must be corroborated by physical evidence or independent witnesses before claim rejection.',
  };
}
