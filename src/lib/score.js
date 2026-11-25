// A transparent consistency score: start at 100, subtract each open conflict's severity
// weight scaled by the model's confidence. Dismissed conflicts don't count.
export const SEVERITY_WEIGHT = { critical: 24, major: 12, minor: 4 };

export function consistencyScore(contradictions = [], review = {}) {
  let penalty = 0;
  for (const c of contradictions) {
    if (review[c.id] === 'dismissed') continue;
    penalty += SEVERITY_WEIGHT[c.severity] * Math.min(1, Math.max(0.3, c.confidence ?? 0.7));
  }
  const score = Math.max(0, Math.round(100 - penalty));
  return { score, ...band(score) };
}

export function band(score) {
  if (score >= 85) return { level: 'agree', verdict: 'Accounts are consistent' };
  if (score >= 65) return { level: 'minor', verdict: 'Minor discrepancies' };
  if (score >= 35) return { level: 'major', verdict: 'Material conflicts' };
  return { level: 'critical', verdict: 'Severe conflicts' };
}
