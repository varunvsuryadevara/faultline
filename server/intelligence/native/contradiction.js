// Native Contradiction Intelligence Engine for FaultLine.
// Evaluates explicit factual conflicts across exhibits without external AI.
// Distinguishes genuine material contradictions from explainable minor discrepancies.
// Enriches each contradiction with alternative innocent explanations to prevent bad-faith bias.

import { EXHIBIT_IDS } from '../../../shared/constants.js';

export function detectNativeContradictions(exhibits = []) {
  const contradictions = [];
  let findingCounter = 1;

  if (exhibits.length < 2) {
    return {
      total: 0,
      contradictions: [],
      hasMaterialContradictions: false,
      materialCount: 0,
    };
  }

  // Helper to extract specific patterns from text
  const getSentence = (text, regex) => {
    const s = String(text || '').split(/(?<=[.?!])\s+/).find((sentence) => regex.test(sentence));
    return s ? s.trim() : (text.slice(0, 80).trim() || 'Recorded statement');
  };

  const extractPatterns = (text) => {
    const t = text.toLowerCase();
    return {
      hasSuddenStop: /sudden(ly)? stop|jammed on (the )?brakes|abrupt(ly)? brak|slammed (on)?/i.test(t),
      hasGradualStop: /gradual(ly)? slow|queue of traffic|slowing down normally|traffic was stopped ahead/i.test(t),
      hasPriorDamage: /rust(y)?|corrosion|prior damage|pre-existing|old fracture|dust on impact/i.test(t),
      hasFreshDamageOnly: /no prior damage|immaculate condition|fresh damage|pristine before/i.test(t),
      hasHighSpeed: /\b(4[5-9]|[5-9]\d|1\d\d)\s*mph\b/i.test(t),
      hasLowSpeed: /\b([1-2]?\d)\s*mph\b/i.test(t),
      hasPassengerPresent: /passenger(s)? in (the )?car|friend was with me|my wife was seated/i.test(t),
      hasAlone: /driving alone|no other passengers|sole occupant|unaccompanied/i.test(t),
      hasDryRoad: /dry (road|tarmac|surface)|clear day|sunny/i.test(t),
      hasWetRoad: /wet (road|surface)|heavy rain|downpour|slippery/i.test(t),
    };
  };

  const parsed = exhibits.map((e, idx) => ({
    id: EXHIBIT_IDS[idx] || `X${idx + 1}`,
    label: e.label || `Exhibit ${EXHIBIT_IDS[idx]}`,
    kind: e.kind || 'statement',
    patterns: extractPatterns(e.text || ''),
    rawText: e.text || '',
  }));

  // Compare every pair of exhibits
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];

      // 1. Sudden Stop vs Queue / Gradual Traffic
      if (
        (a.patterns.hasSuddenStop && b.patterns.hasGradualStop) ||
        (a.patterns.hasGradualStop && b.patterns.hasSuddenStop)
      ) {
        contradictions.push({
          id: `FND-${String(findingCounter++).padStart(3, '0')}`,
          type: 'BRAKING_BEHAVIOR_CONFLICT',
          severity: 'CRITICAL',
          materiality: 'MATERIAL',
          exhibitA: a.id,
          exhibitB: b.id,
          quoteA: a.patterns.hasSuddenStop ? getSentence(a.rawText, /sudden|brake|slam|jam/i) : getSentence(a.rawText, /gradual|queue|slow/i),
          quoteB: b.patterns.hasGradualStop ? getSentence(b.rawText, /gradual|queue|slow/i) : getSentence(b.rawText, /sudden|brake|slam|jam/i),
          sourceA: `Exhibit ${a.id} (${a.label})`,
          sourceB: `Exhibit ${b.id} (${b.label})`,
          description: `Direct conflict regarding deceleration behavior immediately prior to collision: one party describes a sudden/abrupt stop while the other describes normal traffic queueing.`,
          verificationStatus: 'VERIFIED CONFLICT',
          limitations: 'Driver perspective variance possible; telemetry or video corroboration recommended.',
          alternativeInnocentExplanations: [
            'Emergency hazard avoidance: lead vehicle may have braked for an unexpected animal, pedestrian, or abruptly stopping vehicle ahead not visible to the trailing car.',
            'Mechanical failure or unexpected engine/transmission fault causing abrupt deceleration without fraudulent intent.',
            'Reflexive braking caused by sudden glare or horn sound.',
          ],
          recommendedNextStep: 'Cross-reference telematics G-force deceleration curves or CCTV footage.',
        });
      }

      // 2. Pre-existing Rust/Corrosion vs Claimant Immaculate Claim
      if (
        (a.patterns.hasPriorDamage && b.patterns.hasFreshDamageOnly) ||
        (a.patterns.hasFreshDamageOnly && b.patterns.hasPriorDamage)
      ) {
        contradictions.push({
          id: `FND-${String(findingCounter++).padStart(3, '0')}`,
          type: 'DAMAGE_PROVENANCE_CONFLICT',
          severity: 'CRITICAL',
          materiality: 'MATERIAL',
          exhibitA: a.id,
          exhibitB: b.id,
          quoteA: a.patterns.hasPriorDamage ? getSentence(a.rawText, /rust|corrosion|prior damage|pre-existing|fracture/i) : getSentence(a.rawText, /no prior|immaculate|fresh|pristine/i),
          quoteB: b.patterns.hasFreshDamageOnly ? getSentence(b.rawText, /no prior|immaculate|fresh|pristine/i) : getSentence(b.rawText, /rust|corrosion|prior damage|pre-existing|fracture/i),
          sourceA: `Exhibit ${a.id} (${a.label})`,
          sourceB: `Exhibit ${b.id} (${b.label})`,
          description: `Physical forensic finding directly contradicts claimant statement: engineering inspection notes oxidation/corrosion on impact surfaces, refuting claim of pristine pre-loss vehicle state.`,
          verificationStatus: 'PHYSICALLY VERIFIED',
          limitations: 'Environmental factors must be considered; metallurgy report provides binding confirmation.',
          alternativeInnocentExplanations: [
            'Superficial surface rust can develop rapidly (within 48-72 hours) on bare unpainted steel when exposed to rain and winter road de-icing salts.',
            'Policyholder genuinely believed minor parking scratch was inconsequential and had no awareness of internal structural corrosion.',
          ],
          recommendedNextStep: 'Commission formal metallurgical fracture examination or request prior MOT/inspection records.',
        });
      }

      // 3. Speed Discrepancy (Low vs High)
      if (
        (a.patterns.hasLowSpeed && b.patterns.hasHighSpeed) ||
        (a.patterns.hasHighSpeed && b.patterns.hasLowSpeed)
      ) {
        contradictions.push({
          id: `FND-${String(findingCounter++).padStart(3, '0')}`,
          type: 'SPEED_TELEMETRY_CONFLICT',
          severity: 'MATERIAL',
          materiality: 'MATERIAL',
          exhibitA: a.id,
          exhibitB: b.id,
          quoteA: a.patterns.hasLowSpeed ? getSentence(a.rawText, /\b([1-2]?\d)\s*mph\b/i) : getSentence(a.rawText, /\b(4[5-9]|[5-9]\d|1\d\d)\s*mph\b/i),
          quoteB: b.patterns.hasHighSpeed ? getSentence(b.rawText, /\b(4[5-9]|[5-9]\d|1\d\d)\s*mph\b/i) : getSentence(b.rawText, /\b([1-2]?\d)\s*mph\b/i),
          sourceA: `Exhibit ${a.id} (${a.label})`,
          sourceB: `Exhibit ${b.id} (${b.label})`,
          description: `Material variance in recorded vehicle approach velocity between witness statement and electronic telemetry records.`,
          verificationStatus: 'PARTIALLY VERIFIED',
          limitations: 'Human perception of speed is notoriously imprecise; telematics has +/- 1.5 mph calibration margin.',
          alternativeInnocentExplanations: [
            'Normal human perception distortion under acute stress; trailing drivers consistently overestimate lead vehicle approach speed.',
            'Differential in perception caused by rapid relative closure rate rather than absolute excessive speed.',
          ],
          recommendedNextStep: 'Extract raw telematics CAN-bus data frames around impact time.',
        });
      }

      // 4. Passenger Count Discrepancy (Ghost Passenger / Phony Injury)
      if (
        (a.patterns.hasAlone && b.patterns.hasPassengerPresent) ||
        (a.patterns.hasPassengerPresent && b.patterns.hasAlone)
      ) {
        contradictions.push({
          id: `FND-${String(findingCounter++).padStart(3, '0')}`,
          type: 'OCCUPANT_COUNT_CONFLICT',
          severity: 'CRITICAL',
          materiality: 'MATERIAL',
          exhibitA: a.id,
          exhibitB: b.id,
          quoteA: a.patterns.hasAlone ? getSentence(a.rawText, /alone|no other|sole|unaccompanied/i) : getSentence(a.rawText, /passenger|friend|wife/i),
          quoteB: b.patterns.hasPassengerPresent ? getSentence(b.rawText, /passenger|friend|wife/i) : getSentence(b.rawText, /alone|no other|sole|unaccompanied/i),
          sourceA: `Exhibit ${a.id} (${a.label})`,
          sourceB: `Exhibit ${b.id} (${b.label})`,
          description: `Dispute regarding vehicle occupancy at time of collision (sole occupant vs passenger present). Directly impacts third-party bodily injury liability exposure.`,
          verificationStatus: 'VERIFIED CONFLICT',
          limitations: 'Check emergency service incident logs to verify attendance of ambulance or paramedics.',
          alternativeInnocentExplanations: [
            'Passenger exited vehicle immediately upon impact to assess damage or call emergency services before the third party exited.',
            'Third-party driver mistook an approaching helpful bystander or Good Samaritan for a vehicle passenger.',
          ],
          recommendedNextStep: 'Request police attendance log or paramedics patient report form (PRF).',
        });
      }

      // 5. Environmental Road Condition Discrepancy
      if (
        (a.patterns.hasDryRoad && b.patterns.hasWetRoad) ||
        (a.patterns.hasWetRoad && b.patterns.hasDryRoad)
      ) {
        contradictions.push({
          id: `FND-${String(findingCounter++).padStart(3, '0')}`,
          type: 'ENVIRONMENTAL_CONDITION_CONFLICT',
          severity: 'MINOR',
          materiality: 'MINOR',
          exhibitA: a.id,
          exhibitB: b.id,
          quoteA: a.patterns.hasDryRoad ? getSentence(a.rawText, /dry|clear|sunny/i) : getSentence(a.rawText, /wet|rain|downpour|slippery/i),
          quoteB: b.patterns.hasWetRoad ? getSentence(b.rawText, /wet|rain|downpour|slippery/i) : getSentence(b.rawText, /dry|clear|sunny/i),
          sourceA: `Exhibit ${a.id} (${a.label})`,
          sourceB: `Exhibit ${b.id} (${b.label})`,
          description: `Discrepancy in recorded road weather conditions (dry surface vs wet/rain conditions).`,
          verificationStatus: 'UNVERIFIED',
          limitations: 'Localized micro-climate or transitional rain showers may explain differing accounts.',
          alternativeInnocentExplanations: [
            'Localized passing shower or shaded tree canopy where road surface remained damp while surrounding roads had dried.',
            'Surface wet from street-cleaning or drainage run-off under clear sunny skies.',
          ],
          recommendedNextStep: 'Pull historical meteorological observations from nearest airport weather station.',
        });
      }
    }
  }

  return {
    total: contradictions.length,
    contradictions,
    hasMaterialContradictions: contradictions.some((c) => c.severity === 'CRITICAL' || c.severity === 'MATERIAL'),
    materialCount: contradictions.filter((c) => c.severity === 'CRITICAL' || c.severity === 'MATERIAL').length,
  };
}
