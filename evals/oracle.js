// Builds an "assessment" from a scenario's own reference answers. Used to check that every
// scenario test case can be passed by a correct answer (npm run eval -- --oracle, and the tests).
// It is never shown to the model and is not a substitute for a real model run.
export function referenceAssessment(s) {
  const asItems = (list) => (list ?? []).map((point) => ({ point, exhibit: 'A', quote: '' }));
  return {
    summary: `${s.whatHappened} ${s.damage}`,
    supporting: asItems(s.innocent),
    against: asItems(s.inconsistencies),
    red_flags: (s.indicators ?? []).map((point) => ({ point, exhibit: 'A', quote: '', weight: 'medium' })),
    innocent: s.innocent ?? [],
    missing: (s.missing ?? []).map((item) => ({ item, why: '' })),
    risks: [s.assessment],
    questions: (s.questions ?? []).map((question) => ({ ask: 'Claimant', question })),
    steps: s.steps ?? [],
    next_actions: [s.action],
    intent: s.intent,
    risk: s.risk,
    confidence: 0.8,
    reasoning: s.assessment,
  };
}
