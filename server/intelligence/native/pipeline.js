// Native Cross-Examination Pipeline for FaultLine.
// 100% Offline Capable - Operates deterministically without external LLM/AI APIs.
// Fulfills the "FAULTLINE INTERNAL INTELLIGENCE FIRST" core architectural principle.

import { EXHIBIT_IDS } from '../../../shared/constants.js';
import { verifyEvidence } from '../../../shared/verify.js';
import { constructNativeTimeline } from './timeline.js';
import { detectNativeContradictions } from './contradiction.js';
import { detectNativeCorroborations } from './corroboration.js';
import { evaluateInvestigationCompleteness } from './completeness.js';

export async function runNativeAnalysis(input, { onProgress = () => {}, signal } = {}) {
  const exhibits = input.sources.map((s, i) => ({
    id: EXHIBIT_IDS[i] || `X${i + 1}`,
    label: s.label || `Exhibit ${EXHIBIT_IDS[i]}`,
    kind: s.kind || 'statement',
    text: s.text || '',
  }));

  const startedAt = Date.now();

  // Progress Stage 1: Timeline Construction
  onProgress({
    stage: 0,
    events: 0,
    conflicts: [],
    agreed: 0,
    reasoning: 'Initializing Native Intelligence Engine — analyzing chronological events...',
  });

  if (signal?.aborted) throw new Error('Analysis cancelled');

  const rawTimeline = constructNativeTimeline(exhibits);

  // Map timeline events to UI schema
  const timeline = rawTimeline.events.map((ev, i) => ({
    id: `E${i + 1}`,
    time: ev.time || 'Unspecified',
    event: ev.snippet || `${ev.eventType} recorded in ${ev.exhibitLabel}`,
    exhibits: [ev.exhibitId],
    status: ev.classification === 'VERIFIED' ? 'agreed' : 'single_source',
    conflicts: [],
  }));

  // Progress Stage 2: Cross-Examination & Contradiction Detection
  onProgress({
    stage: 1,
    events: timeline.length,
    conflicts: ['Cross-referencing witness accounts against damage & telemetry...'],
    agreed: Math.max(1, Math.floor(timeline.length / 2)),
    reasoning: 'Evaluating factual consistency, vehicle decelerations, and damage provenance...',
  });

  if (signal?.aborted) throw new Error('Analysis cancelled');

  const rawContradictions = detectNativeContradictions(exhibits);
  const rawCorroborations = detectNativeCorroborations(exhibits);
  const rawCompleteness = evaluateInvestigationCompleteness(exhibits, input.context);

  // Map contradictions to schema
  const contradictions = rawContradictions.contradictions.map((c, i) => ({
    id: `C${i + 1}`,
    title: c.type.replace(/_/g, ' '),
    category: 'statement',
    severity: c.severity.toLowerCase() === 'critical' ? 'critical' : c.severity.toLowerCase() === 'material' ? 'major' : 'minor',
    explanation: c.description,
    evidence: [
      { exhibit: c.exhibitA, quote: c.quoteA },
      { exhibit: c.exhibitB, quote: c.quoteB },
    ],
    innocentExplanation: c.limitations || 'Natural observer variance or differing perceptual viewpoints at impact.',
    followUp: {
      ask: 'Request technical corroboration',
      question: c.recommendedNextStep || 'Cross-reference telematics G-force curves or CCTV footage.',
    },
    confidence: c.verificationStatus === 'PHYSICALLY VERIFIED' ? 0.98 : 0.88,
    events: [],
  }));

  // Map corroborations to schema
  const corroborations = rawCorroborations.corroborations.map((k, i) => ({
    id: `K${i + 1}`,
    fact: k.fact,
    evidence: k.evidence || [],
    exhibits: k.exhibits || [],
  }));

  // Link disputed events
  for (const c of contradictions) {
    if (timeline.length > 0) {
      timeline[0].conflicts.push(c.id);
      timeline[0].status = 'disputed';
    }
  }

  // Gaps & Next Steps
  const gaps = rawCompleteness.missingRequired.map((m) => ({
    gap: `Missing mandatory investigation exhibit: ${m}`,
    request: `Request official records or documentation for ${m}.`,
  }));

  const nextSteps = [
    ...(rawContradictions.hasMaterialContradictions
      ? ['Keep claim under review pending technical corroboration of identified material contradictions.']
      : ['Confirm policy conditions and excess requirements before settlement authorization.']),
    ...(rawCompleteness.missingRequired.length > 0
      ? [`Issue formal evidence request for: ${rawCompleteness.missingRequired.slice(0, 2).join(', ')}.`]
      : []),
    'Perform final claim decision sign-off under applicable jurisdictional regulations.',
  ];

  // Summary
  const summary =
    `Native forensic cross-examination of ${exhibits.length} exhibits conducted 100% offline.\n\n` +
    `• Contradictions Identified: ${contradictions.length} (${rawContradictions.materialCount} material)\n` +
    `• Corroborated Facts: ${corroborations.length} independent alignments\n` +
    `• Timeline Points: ${timeline.length} chronological moments indexed\n` +
    `• Evidence Completeness: ${rawCompleteness.completenessRatio} (${rawCompleteness.completenessPercentage}%) — ${rawCompleteness.isSufficientForDecision ? 'SUFFICIENT' : 'GAPS EXIST'}`;

  // Progress Stage 3: Verifying quotes
  onProgress({
    stage: 2,
    events: timeline.length,
    conflicts: contradictions.map((c) => c.title),
    agreed: corroborations.length,
    reasoning: 'Verifying verbatim citations mechanically against exhibit source text...',
  });

  const rawAnalysis = {
    summary,
    timeline,
    contradictions,
    corroborations,
    gaps,
    nextSteps,
  };

  const verified = verifyEvidence(rawAnalysis, exhibits);

  return {
    ...verified,
    meta: {
      provider: 'FaultLine Native Intelligence Engine',
      model: 'deterministic-offline-v2',
      ms: Date.now() - startedAt,
      generatedAt: new Date().toISOString(),
      exhibits: exhibits.map(({ id, label, kind }) => ({ id, label, kind })),
      isOffline: true,
    },
  };
}
