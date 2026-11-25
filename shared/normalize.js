import { CATEGORIES, EVENT_STATUSES, SEVERITIES } from './constants.js';
import { AnalysisError } from './errors.js';

// Pulls the JSON object out of a model reply. Claude's structured output is plain JSON, so that
// is tried first; a fenced or chatty reply (other providers) is unwrapped only if that fails, so
// code fences quoted inside the findings can never be mistaken for the reply's own fence.
export function extractJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new AnalysisError('BAD_OUTPUT', 'The model returned an empty answer. Try again.', { retryable: true });
  }
  const body = text.trim();
  const attempts = [body];
  const fenced = body.match(/^```[a-z]*\s*\n?([\s\S]*?)\n?\s*```$/i);
  if (fenced) attempts.push(fenced[1].trim());
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  if (first !== -1 && last > first) attempts.push(body.slice(first, last + 1));

  for (const candidate of attempts) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {
      // try the next candidate
    }
  }
  if (first === -1) {
    throw new AnalysisError('BAD_OUTPUT', 'The model did not return structured findings. Try again.', { retryable: true });
  }
  throw new AnalysisError('BAD_OUTPUT', 'The model returned findings in a broken format. Try again.', { retryable: true });
}

const SEVERITY_RANK = { critical: 0, major: 1, minor: 2 };
const str = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
// Structured outputs don't guarantee the capitalisation of enum values, so compare case-insensitively.
const pick = (value, allowed, fallback) => {
  const v = typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  return allowed.includes(v) ? v : fallback;
};
const arr = (v) => (Array.isArray(v) ? v : []);
const unique = (list) => [...new Set(list)];

// Coerces whatever the model produced into the exact shape the UI renders.
// Unknown exhibit ids are dropped, enums fall back to safe values, ids are re-issued.
export function normalizeAnalysis(raw, exhibitIds) {
  if (!raw || typeof raw !== 'object') {
    throw new AnalysisError('BAD_OUTPUT', 'The model returned findings in an unexpected shape. Try again.', {
      retryable: true,
    });
  }
  const known = new Set(exhibitIds);
  const exhibitRef = (v) => {
    const id = str(v).replace(/^exhibit\s+/i, '').toUpperCase();
    return known.has(id) ? id : null;
  };
  const evidenceList = (list) =>
    arr(list)
      .map((ev) => ({
        exhibit: exhibitRef(ev?.exhibit ?? ev?.source_id ?? ev?.source),
        quote: str(ev?.quote).replace(/^["“”']+|["“”']+$/g, '').trim(),
      }))
      .filter((ev) => ev.exhibit && ev.quote);

  // Timeline: keep model order (chronological), re-issue ids, remember the mapping.
  const eventIdMap = new Map();
  const timeline = arr(raw.timeline)
    .map((e) => ({
      originalId: str(e?.id),
      time: str(e?.time),
      event: str(e?.event),
      exhibits: unique(arr(e?.exhibits).map(exhibitRef).filter(Boolean)),
      status: pick(e?.status, EVENT_STATUSES, 'single_source'),
    }))
    .filter((e) => e.event)
    .map((e, i) => {
      const id = `E${i + 1}`;
      if (e.originalId) eventIdMap.set(e.originalId.toUpperCase(), id);
      return { id, time: e.time, event: e.event, exhibits: e.exhibits, status: e.status, conflicts: [] };
    });

  const contradictions = arr(raw.contradictions)
    .map((c) => {
      const confidence = Number(c?.confidence);
      return {
        title: str(c?.title),
        category: pick(c?.category, CATEGORIES, 'statement'),
        severity: pick(c?.severity, SEVERITIES, 'major'),
        explanation: str(c?.explanation),
        evidence: evidenceList(c?.evidence),
        innocentExplanation: str(c?.innocent_explanation),
        followUp: { ask: str(c?.follow_up?.ask), question: str(c?.follow_up?.question) },
        confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence > 1 ? confidence / 100 : confidence)) : 0.7,
        events: unique(arr(c?.events).map((id) => eventIdMap.get(str(id).toUpperCase())).filter(Boolean)),
      };
    })
    .filter((c) => c.title && c.evidence.length > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .map((c, i) => ({ id: `C${i + 1}`, ...c }));

  // Link events to the conflicts that concern them, and mark them disputed.
  const byEvent = new Map(timeline.map((e) => [e.id, e]));
  for (const c of contradictions) {
    for (const eventId of c.events) {
      const event = byEvent.get(eventId);
      if (event) {
        event.conflicts.push(c.id);
        event.status = 'disputed';
      }
    }
  }

  const corroborations = arr(raw.corroborations)
    .map((k) => {
      const evidence = evidenceList(k?.evidence);
      return { fact: str(k?.fact), evidence, exhibits: unique(evidence.map((ev) => ev.exhibit)) };
    })
    .filter((k) => k.fact)
    .map((k, i) => ({ id: `K${i + 1}`, ...k }));

  const gaps = arr(raw.gaps)
    .map((g) => ({
      gap: str(g?.gap ?? g?.description),
      request: str(g?.evidence_to_request ?? g?.suggested_evidence),
    }))
    .filter((g) => g.gap);

  const nextSteps = arr(raw.next_steps)
    .map((s) => (typeof s === 'string' ? str(s) : str(s?.step ?? s?.action)))
    .filter(Boolean)
    .slice(0, 6);

  return { summary: str(raw.summary), timeline, contradictions, corroborations, gaps, nextSteps };
}
