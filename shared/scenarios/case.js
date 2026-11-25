import { SAMPLE_CASES } from '../samples.js';
import { countryName, labelOf } from './vocab.js';

// Turns a scenario into a FaultLine case file: the exhibits an investigator would actually hold.
// Only the facts go in (the notification, the statements, the damage and the evidence on file).
// The reference answers (what really happened, the intent, the indicators, the outcome) never do,
// so both the cross-examination and the AI assessment work blind, like a real file review.

const bullet = (items) => items.map((x) => `- ${x}`).join('\n');

function evidenceText(s) {
  const parts = [`Damage noted: ${s.damage}`];
  if (s.thirdParties?.length) parts.push(`Parties involved:\n${bullet(s.thirdParties)}`);
  if (s.evidence?.length) parts.push(`Evidence on file:\n${bullet(s.evidence)}`);
  return parts.join('\n\n');
}

export function scenarioContext(s) {
  return `${countryName(s.country)} motor insurance claim. Vehicle: ${labelOf('vehicle', s.vehicle)}. Claim type: ${labelOf('claimType', s.claimType)}. Review the file and decide how the claim should be handled.`;
}

export function scenarioCase(s) {
  if (s.case) {
    return {
      title: s.case.title || `${s.id}: ${s.title}`,
      context: s.case.context ?? scenarioContext(s),
      exhibits: (s.case.exhibits || []).map((e) => ({ ...e })),
      scenarioId: s.id,
    };
  }
  if (s.exhibits) {
    return {
      title: `${s.id}: ${s.title}`,
      context: s.context ?? scenarioContext(s),
      exhibits: s.exhibits.map((e) => ({ ...e })),
      scenarioId: s.id,
    };
  }
  const sample = s.sampleId ? SAMPLE_CASES.find((c) => c.id === s.sampleId) : null;
  if (sample) {
    return { title: `${s.id}: ${s.title}`, context: sample.context, exhibits: sample.exhibits.map((e) => ({ ...e })), scenarioId: s.id };
  }
  const exhibits = [
    { label: 'Claim notification (first notice of loss)', kind: 'record', text: s.story },
    { label: s.claimant ? `Claimant's statement, ${s.claimant}` : "Claimant's statement", kind: 'statement', text: s.statement },
    ...(s.accounts ?? []).slice(0, 3).map((a) => ({ label: a.who, kind: a.kind ?? 'witness', text: a.text })),
    { label: 'Damage and evidence on file', kind: 'document', text: evidenceText(s) },
  ];
  return { title: `${s.id}: ${s.title}`, context: scenarioContext(s), exhibits, scenarioId: s.id };
}
