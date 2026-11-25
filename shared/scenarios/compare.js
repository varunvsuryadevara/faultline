import { intentFamily, labelOf, rankOf } from './vocab.js';

// Compares an AI assessment with a scenario's reference answers, so the library doubles as a
// test bench for the model. Intent: same value is a match, same family a near match.
// Risk: same level is a match, one level apart a near match.
export function compareWithReference(assessment, scenario) {
  if (!assessment || !scenario) return null;
  const intentMatch =
    assessment.intent === scenario.intent
      ? 'match'
      : intentFamily(assessment.intent) === intentFamily(scenario.intent)
        ? 'near'
        : 'differs';
  const gap = Math.abs(rankOf('risk', assessment.risk) - rankOf('risk', scenario.risk));
  const riskMatch = gap === 0 ? 'match' : gap === 1 ? 'near' : 'differs';
  const overall =
    intentMatch === 'match' && riskMatch !== 'differs'
      ? 'agrees'
      : intentMatch === 'differs' || riskMatch === 'differs'
        ? 'differs'
        : 'close';
  return {
    overall,
    intent: {
      ai: assessment.intent,
      reference: scenario.intent,
      aiLabel: labelOf('intent', assessment.intent),
      referenceLabel: labelOf('intent', scenario.intent),
      match: intentMatch,
    },
    risk: {
      ai: assessment.risk,
      reference: scenario.risk,
      aiLabel: labelOf('risk', assessment.risk),
      referenceLabel: labelOf('risk', scenario.risk),
      match: riskMatch,
    },
  };
}
