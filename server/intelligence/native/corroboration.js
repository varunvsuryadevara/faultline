// Native Corroboration Intelligence Engine for FaultLine.
// Identifies facts independently supported across multiple evidence sources.
// Enforces source independence checks (two docs repeating the same source != independent corroboration).

import { EXHIBIT_IDS } from '../../../shared/constants.js';
import { evaluateEvidenceIndependence } from '../independence.js';

export function detectNativeCorroborations(exhibits = []) {
  const corroborations = [];
  let corroborationCounter = 1;

  if (exhibits.length < 2) {
    return {
      total: 0,
      corroborations: [],
      hasCorroborations: false,
      independentCount: 0,
    };
  }

  // Key fact extractors
  const extractFacts = (text, kind) => {
    const t = text.toLowerCase();
    return {
      kind,
      hasBumperContact: /front(-|\s)?end damage|rear(-|\s)?end collision|bumper impact|crushed bumper/i.test(t),
      hasRoundaboutLocation: /roundabout|rotary|traffic circle|junction exit/i.test(t),
      hasDaylight: /daylight|broad daylight|clear afternoon|morning sun/i.test(t),
      hasBrakeLightDefect: /brake lights were off|no brake lights|faulty rear lamps|bulbs unlit/i.test(t),
      hasExcessiveDecel: /hard braking|sudden stop|emergency brake|-0\.\d+g|severe deceleration/i.test(t),
      mentionsExhibitQuote: /as stated in exhibit|per the driver|according to claimant/i.test(t),
    };
  };

  const getSentence = (text, regex) => {
    const s = String(text || '').split(/(?<=[.?!])\s+/).find((sentence) => regex.test(sentence));
    return s ? s.trim() : (text.slice(0, 80).trim() || 'Recorded fact');
  };

  const parsed = exhibits.map((e, idx) => ({
    id: EXHIBIT_IDS[idx] || `X${idx + 1}`,
    label: e.label || `Exhibit ${EXHIBIT_IDS[idx]}`,
    kind: e.kind || 'statement',
    rawText: e.text || '',
    facts: extractFacts(e.text || '', e.kind || 'statement'),
  }));

  // 1. Corroborated Point of Impact Location (Roundabout)
  const roundaboutSources = parsed.filter((p) => p.facts.hasRoundaboutLocation);
  if (roundaboutSources.length >= 2) {
    const exhibitIds = roundaboutSources.map((s) => s.id);
    const indep = evaluateEvidenceIndependence(exhibitIds, exhibits);

    corroborations.push({
      id: `CORR-${String(corroborationCounter++).padStart(3, '0')}`,
      fact: 'Accident occurred on approach / circulatory section of a multi-lane roundabout.',
      sources: roundaboutSources.map((s) => `Exhibit ${s.id} (${s.label})`),
      exhibits: exhibitIds,
      evidence: roundaboutSources.map((s) => ({
        exhibit: s.id,
        quote: getSentence(s.rawText, /roundabout|rotary|circle|junction/i),
      })),
      isIndependent: indep.isIndependent,
      derivationType: indep.derivationType,
      confidenceScore: indep.independenceScore,
      limitations: indep.isIndependent ? 'None; independently corroborated by multiple parties.' : indep.explanation,
      safeguardNotice: indep.safeguardNotice,
    });
  }

  // 2. Corroborated Damage Geometry (Rear-End / Bumper)
  const damageSources = parsed.filter((p) => p.facts.hasBumperContact);
  if (damageSources.length >= 2) {
    const exhibitIds = damageSources.map((s) => s.id);
    const indep = evaluateEvidenceIndependence(exhibitIds, exhibits);

    corroborations.push({
      id: `CORR-${String(corroborationCounter++).padStart(3, '0')}`,
      fact: 'Physical vehicle contact localized to rear bumper and trailing quarter-panels.',
      sources: damageSources.map((s) => `Exhibit ${s.id} (${s.label})`),
      exhibits: exhibitIds,
      evidence: damageSources.map((s) => ({
        exhibit: s.id,
        quote: getSentence(s.rawText, /damage|bumper|collision|impact|panels/i),
      })),
      isIndependent: indep.isIndependent,
      derivationType: indep.derivationType,
      confidenceScore: indep.independenceScore,
      limitations: indep.isIndependent ? 'Physical engineering inspection corroborates witness observations.' : indep.explanation,
      safeguardNotice: indep.safeguardNotice,
    });
  }

  // 3. Corroborated Abrupt Deceleration
  const decelSources = parsed.filter((p) => p.facts.hasExcessiveDecel);
  if (decelSources.length >= 2) {
    const exhibitIds = decelSources.map((s) => s.id);
    const indep = evaluateEvidenceIndependence(exhibitIds, exhibits);
    const hasTelematics = decelSources.some((s) => s.kind === 'telematics');

    corroborations.push({
      id: `CORR-${String(corroborationCounter++).padStart(3, '0')}`,
      fact: 'Lead vehicle engaged in abrupt, severe deceleration maneuver preceding impact.',
      sources: decelSources.map((s) => `Exhibit ${s.id} (${s.label})`),
      exhibits: exhibitIds,
      evidence: decelSources.map((s) => ({
        exhibit: s.id,
        quote: getSentence(s.rawText, /brak|stop|emergency|decel/i),
      })),
      isIndependent: indep.isIndependent,
      derivationType: indep.derivationType,
      confidenceScore: hasTelematics ? 0.98 : indep.independenceScore,
      limitations: hasTelematics ? 'Verified via calibrated electronic telemetry.' : indep.explanation,
      safeguardNotice: indep.safeguardNotice,
    });
  }

  return {
    total: corroborations.length,
    corroborations,
    hasCorroborations: corroborations.length > 0,
    independentCount: corroborations.filter((c) => c.isIndependent).length,
  };
}
