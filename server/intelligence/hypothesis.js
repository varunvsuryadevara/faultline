// FaultLine Competing Hypothesis Workspace Engine.
// Evaluates multiple competing explanations for a motor vehicle collision
// against all available exhibits.
//
// Replaces binary "fraud vs not-fraud" thinking with structured forensic hypothesis testing:
// - Hypothesis 1 (H1): Genuine Loss as Reported
// - Hypothesis 2 (H2): Innocent Perceptual Variance / Emergency Avoidance / Driver Error
// - Hypothesis 3 (H3): Staged, Induced, or Fabricated Collision / Pre-existing Damage
//
// Each hypothesis is mapped with supporting evidence, contradicting evidence,
// net evidence weight (grounded in verified physical facts), and key discriminators.

import { EXHIBIT_IDS } from '../../shared/constants.js';
import { detectNativeContradictions } from './native/contradiction.js';
import { constructNativeTimeline } from './native/timeline.js';

export const HYPOTHESIS_IDS = {
  H1: 'H1_GENUINE_LOSS',
  H2: 'H2_INNOCENT_VARIANCE',
  H3: 'H3_STAGED_OR_INDUCED',
};

export const HYPOTHESIS_METADATA = {
  [HYPOTHESIS_IDS.H1]: {
    id: HYPOTHESIS_IDS.H1,
    code: 'H1',
    title: 'Genuine Collision as Reported',
    category: 'GENUINE',
    description: 'The collision occurred substantially as described by the claimant. Damage, deceleration, and accounts reflect a genuine road traffic accident caused by standard driver negligence or traffic conditions.',
  },
  [HYPOTHESIS_IDS.H2]: {
    id: HYPOTHESIS_IDS.H2,
    code: 'H2',
    title: 'Innocent Perceptual Variance / Emergency Avoidance',
    category: 'INDEPENDENT_VARIANCE',
    description: 'The collision occurred, but discrepancies in party accounts stem from normal human perception limits, post-impact shock, weather-induced loss of grip, or genuine emergency obstacle avoidance rather than fraud.',
  },
  [HYPOTHESIS_IDS.H3]: {
    id: HYPOTHESIS_IDS.H3,
    code: 'H3',
    title: 'Staged / Induced Collision or Fabricated Damage',
    category: 'FRAUD_OR_EXAGGERATION',
    description: 'The claim exhibits characteristics of an induced collision ("slam-on"), pre-existing damage exploitation, phantom passenger inclusion, or deliberate locus fabrication.',
  },
};

/**
 * Evaluates competing hypotheses across the submitted exhibits.
 */
export function evaluateCompetingHypotheses(exhibits = [], options = {}) {
  if (!exhibits || exhibits.length === 0) {
    return {
      evaluated: false,
      reason: 'No exhibits available to evaluate hypotheses.',
      hypotheses: [],
    };
  }

  const contradictions = detectNativeContradictions(exhibits);
  const timeline = constructNativeTimeline(exhibits);

  const texts = exhibits.map((e, idx) => ({
    id: e.id || EXHIBIT_IDS[idx] || `X${idx + 1}`,
    label: e.label || `Exhibit ${EXHIBIT_IDS[idx] || idx + 1}`,
    kind: (e.kind || 'statement').toLowerCase(),
    text: String(e.text || ''),
    lower: String(e.text || '').toLowerCase(),
  }));

  // Build Hypothesis Evaluations
  const h1 = evaluateH1Genuine(texts, contradictions, timeline);
  const h2 = evaluateH2InnocentVariance(texts, contradictions, timeline);
  const h3 = evaluateH3StagedOrExaggerated(texts, contradictions, timeline);

  const hypotheses = [h1, h2, h3];

  // Sort by net evidence score descending
  hypotheses.sort((a, b) => b.netEvidenceScore - a.netEvidenceScore);

  const primaryHypothesis = hypotheses[0];
  const competingAlternative = hypotheses[1];

  // Identify Critical Discriminators between Primary and Alternative
  const criticalDiscriminators = determineKeyDiscriminators(primaryHypothesis, competingAlternative, texts);

  const investigatorSummary = generateInvestigatorNarrative(primaryHypothesis, competingAlternative, criticalDiscriminators);

  return {
    evaluated: true,
    totalExhibits: exhibits.length,
    totalContradictions: contradictions.total,
    hypotheses,
    primaryHypothesis: {
      id: primaryHypothesis.id,
      code: primaryHypothesis.code,
      title: primaryHypothesis.title,
      confidenceLevel: primaryHypothesis.status,
      netEvidenceScore: primaryHypothesis.netEvidenceScore,
    },
    competingAlternative: {
      id: competingAlternative.id,
      code: competingAlternative.code,
      title: competingAlternative.title,
      confidenceLevel: competingAlternative.status,
      netEvidenceScore: competingAlternative.netEvidenceScore,
    },
    criticalDiscriminators,
    investigatorSummary,
    safeguardNotice: 'Human Governance Rule: Competing hypothesis scores provide structured decision support only. Under Bad-Faith litigation safeguards, a rejection of indemnity requires definitive objective proof of intentional deceit.',
  };
}

function evaluateH1Genuine(texts, contradictions, timeline) {
  const meta = HYPOTHESIS_METADATA[HYPOTHESIS_IDS.H1];
  const supporting = [];
  const contradicting = [];
  const neutral = [];
  let score = 0;

  for (const t of texts) {
    if (/queue of traffic|slowing down normally|traffic was stopped|traffic light was red/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /queue|slowing|stopped|traffic light/i),
        rationale: 'Describes ordinary traffic flow behavior typical of rear-end collision negligence.',
        weight: 2,
      });
      score += 2;
    }

    if (/no prior damage|pristine before|immaculate condition/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /no prior|pristine|immaculate/i),
        rationale: 'Asserts good pre-incident vehicle condition.',
        weight: 1,
      });
      score += 1;
    }
  }

  // Contradicting H1: Physical proof of pre-existing damage
  const damageConflict = contradictions.contradictions.find((c) => c.type === 'DAMAGE_PROVENANCE_CONFLICT');
  if (damageConflict) {
    contradicting.push({
      exhibitId: damageConflict.exhibitA,
      label: damageConflict.sourceA,
      quote: damageConflict.quoteA,
      rationale: 'Physical engineering inspection identified corrosion/rust on fractured surfaces, refuting pristine pre-loss vehicle state.',
      weight: 4,
    });
    score -= 4;
  }

  // Contradicting H1: Extreme sudden deceleration
  const brakingConflict = contradictions.contradictions.find((c) => c.type === 'BRAKING_BEHAVIOR_CONFLICT');
  if (brakingConflict) {
    contradicting.push({
      exhibitId: brakingConflict.exhibitB,
      label: brakingConflict.sourceB,
      quote: brakingConflict.quoteB,
      rationale: 'Evidence indicates abrupt emergency braking inconsistent with gradual queueing.',
      weight: 3,
    });
    score -= 3;
  }

  let status = 'PLAUSIBLE';
  if (score >= 4 && contradicting.length === 0) status = 'STRONGLY_SUPPORTED';
  else if (contradicting.some((c) => c.weight >= 4)) status = 'CONTRADICTED_BY_PHYSICAL_FACTS';
  else if (score < 0) status = 'WEAKLY_SUPPORTED';

  return {
    ...meta,
    netEvidenceScore: score,
    status,
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    neutralEvidence: neutral,
    discriminators: [
      'Forensic appraisal of paint transfer and impact crumple angles between both vehicles.',
      'Independent witness or CCTV establishing normal approach speed before deceleration.',
    ],
  };
}

function evaluateH2InnocentVariance(texts, contradictions, timeline) {
  const meta = HYPOTHESIS_METADATA[HYPOTHESIS_IDS.H2];
  const supporting = [];
  const contradicting = [];
  const neutral = [];
  let score = 1; // Base prior: innocent human variance is common

  // Weather / environmental factors
  for (const t of texts) {
    if (/wet (road|tarmac|surface)|rain|downpour|slippery|fog|glare/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /wet|rain|slippery|downpour|glare/i),
        rationale: 'Wet road conditions reduce braking friction, explaining extended stopping distances and abrupt trailing impact.',
        weight: 3,
      });
      score += 3;
    }

    if (/around|about|approx|roughly|circa/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /around|about|approx|roughly/i),
        rationale: 'Timestamp estimates explicitly framed as approximate, explaining minor timing variances without bad faith.',
        weight: 2,
      });
      score += 2;
    }

    if (/hazard|dog|animal|pedestrian|debris|car pulled out/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /hazard|dog|animal|pedestrian|debris/i),
        rationale: 'External obstacle explains abrupt braking as legitimate emergency avoidance.',
        weight: 3,
      });
      score += 3;
    }
  }

  // Minor benign timeline conflicts support H2
  const benignTimeVariance = timeline.conflictingTimestamps.filter((c) => c.classification === 'BENIGN_TIME_VARIANCE');
  if (benignTimeVariance.length > 0) {
    supporting.push({
      exhibitId: benignTimeVariance[0].exhibitA,
      label: `Exhibit ${benignTimeVariance[0].exhibitA}`,
      quote: `${benignTimeVariance[0].timeA} vs ${benignTimeVariance[0].timeB}`,
      rationale: 'Minor time differences (<=15 min) fall within standard human memory and perception variance.',
      weight: 2,
    });
    score += 2;
  }

  // Contradicting H2: deliberate staged features like disabled brake lights
  for (const t of texts) {
    if (/brake lights were off|disabled brake lamps|disconnected bulbs/i.test(t.text)) {
      contradicting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /brake lights|disconnected|disabled/i),
        rationale: 'Intentional tampering with brake lights strongly undermines innocent emergency avoidance.',
        weight: 4,
      });
      score -= 4;
    }
  }

  let status = 'PLAUSIBLE';
  if (score >= 5 && contradicting.length === 0) status = 'STRONGLY_SUPPORTED';
  else if (contradicting.some((c) => c.weight >= 4)) status = 'WEAKLY_SUPPORTED';

  return {
    ...meta,
    netEvidenceScore: score,
    status,
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    neutralEvidence: neutral,
    discriminators: [
      'Obtain weather station / meteorological rainfall records at the exact collision locus and hour.',
      'Check lead vehicle CAN-Bus for emergency ABS engagement vs controlled gradual braking.',
    ],
  };
}

function evaluateH3StagedOrExaggerated(texts, contradictions, timeline) {
  const meta = HYPOTHESIS_METADATA[HYPOTHESIS_IDS.H3];
  const supporting = [];
  const contradicting = [];
  const neutral = [];
  let score = 0;

  // Pre-existing damage
  const damageConflict = contradictions.contradictions.find((c) => c.type === 'DAMAGE_PROVENANCE_CONFLICT');
  if (damageConflict) {
    supporting.push({
      exhibitId: damageConflict.exhibitA,
      label: damageConflict.sourceA,
      quote: damageConflict.quoteA,
      rationale: 'Corrosion and pre-existing fracture surfaces indicate opportunistic claim for historical damage.',
      weight: 4,
    });
    score += 4;
  }

  // Abrupt braking / slam-on behavior
  const brakingConflict = contradictions.contradictions.find((c) => c.type === 'BRAKING_BEHAVIOR_CONFLICT');
  if (brakingConflict) {
    supporting.push({
      exhibitId: brakingConflict.exhibitB,
      label: brakingConflict.sourceB,
      quote: brakingConflict.quoteB,
      rationale: 'Sudden aggressive deceleration on a roundabout approach matches classic induced collision typology.',
      weight: 3,
    });
    score += 3;
  }

  // Occupant count discrepancy (phantom passengers)
  const occupantConflict = contradictions.contradictions.find((c) => c.type === 'OCCUPANT_COUNT_CONFLICT');
  if (occupantConflict) {
    supporting.push({
      exhibitId: occupantConflict.exhibitA,
      label: occupantConflict.sourceA,
      quote: occupantConflict.quoteA,
      rationale: 'Conflicting occupant counts indicate potential phantom passenger whiplash claims.',
      weight: 3,
    });
    score += 3;
  }

  // Disabled brake lamps
  for (const t of texts) {
    if (/brake lights were off|no brake lights|disabled brake lamps/i.test(t.text)) {
      supporting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /brake lights/i),
        rationale: 'Brake lights unlit during deceleration — signature indicator of an induced slam-on.',
        weight: 4,
      });
      score += 4;
    }
  }

  // Contradicting H3: If genuine emergency hazard is proven or telematics shows normal deceleration
  for (const t of texts) {
    if (/telematics recorded gradual|cctv shows child in road|clear pedestrian crossing/i.test(t.text)) {
      contradicting.push({
        exhibitId: t.id,
        label: t.label,
        quote: extractSnippet(t.text, /telematics|cctv|pedestrian/i),
        rationale: 'Objective sensor or camera verification refutes intentional inducement.',
        weight: 5,
      });
      score -= 5;
    }
  }

  let status = 'PLAUSIBLE';
  if (score >= 6) status = 'STRONGLY_SUPPORTED';
  else if (score >= 3) status = 'SUSPICIOUS_INDICATORS_PRESENT';
  else status = 'UNSUBSTANTIATED';

  return {
    ...meta,
    netEvidenceScore: score,
    status,
    supportingEvidence: supporting,
    contradictingEvidence: contradicting,
    neutralEvidence: neutral,
    discriminators: [
      'Metallurgical laboratory testing of bumper reinforcement rust oxidation rate.',
      'Check claims history database (e.g. CUE / Insurance Fraud Bureau) for prior identical roundabout claims by lead driver.',
      'Examine brake bulb filaments under magnification to test hot-shock vs cold-shock filament deformation.',
    ],
  };
}

function determineKeyDiscriminators(primary, alternative, texts) {
  const discriminators = [];

  if (
    (primary.code === 'H3' && alternative.code === 'H1') ||
    (primary.code === 'H1' && alternative.code === 'H3')
  ) {
    discriminators.push({
      rank: 1,
      testName: 'Filament Hot-Shock & Metallurgy Analysis',
      targetExhibit: 'Vehicle Physical Inspection',
      purpose: 'Determine whether brake lamp filaments were energized at moment of impact, and whether bumper rust predates incident date.',
      expectedOutcomeH1: 'Hot-shock stretching on filaments; fresh ductile tearing on steel reinforcement.',
      expectedOutcomeH3: 'Cold fracture without hot-shock deformation; deep oxide crust penetrating micro-fractures.',
    });
    discriminators.push({
      rank: 2,
      testName: 'CAN-Bus Telemetry G-Force Curve Audit',
      targetExhibit: 'Lead Vehicle Telematics Log',
      purpose: 'Verify whether deceleration curve was -0.3g (normal stop) or -0.85g+ (emergency / induced slam-on).',
      expectedOutcomeH1: 'Gradual ramp-down curve over 3.5+ seconds.',
      expectedOutcomeH3: 'Step-function deceleration in <1.2 seconds without preceding obstacle.',
    });
  } else if (
    (primary.code === 'H2' && alternative.code === 'H3') ||
    (primary.code === 'H3' && alternative.code === 'H2')
  ) {
    discriminators.push({
      rank: 1,
      testName: 'Locus Roadway Hazard & Weather Cross-Check',
      targetExhibit: 'Police CAD / Council Road Maintenance Logs',
      purpose: 'Confirm whether wet tarmac or road debris prompted legitimate emergency avoidance.',
      expectedOutcomeH2: 'Rainfall recorded during the hour; evidence of road grease / low friction.',
      expectedOutcomeH3: 'Dry tarmac; no road debris or animals observed on nearby junction cameras.',
    });
  } else {
    discriminators.push({
      rank: 1,
      testName: 'Independent Eyewitness / Dashcam Verification',
      targetExhibit: 'Third-party Dashcam or CCTV',
      purpose: 'Establish independent visual timeline of lead vehicle behavior preceding impact.',
      expectedOutcomeH1: 'Traffic queue clearly visible ahead.',
      expectedOutcomeH2: 'Clear sudden obstacle or trailing vehicle following too closely.',
    });
  }

  return discriminators;
}

function generateInvestigatorNarrative(primary, alternative, discriminators) {
  return `Forensic assessment identifies **${primary.title} (${primary.code})** as the best-supported hypothesis (Net Evidence Score: ${primary.netEvidenceScore}), with **${alternative.title} (${alternative.code})** remaining a viable alternative (Net Evidence Score: ${alternative.netEvidenceScore}). To definitively resolve ambiguity without bad-faith exposure, the claims examiner should execute the following discriminator: *${discriminators[0]?.testName}* (*${discriminators[0]?.purpose}*).`;
}

function extractSnippet(text, regex) {
  const sentence = String(text || '').split(/(?<=[.?!])\s+/).find((s) => regex.test(s));
  return sentence ? sentence.trim() : text.slice(0, 90).trim();
}
