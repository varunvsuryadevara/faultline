import { EXHIBIT_IDS, EXHIBIT_KINDS, LIMITS } from './constants.js';

const KIND_VALUES = new Set(EXHIBIT_KINDS.map((k) => k.value));

// The exact text the model sees and the quote checker searches. The browser applies the
// same function before sending, so character offsets line up on both sides.
export function cleanText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanLine(text) {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}

const fmt = (n) => n.toLocaleString('en-US');

// Validates a case before it reaches the model. Returns { ok: true, value } or { ok: false, error }.
export function validateCase(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Send a JSON body with a "sources" array.' };
  }

  const context = typeof input.context === 'string' ? cleanText(input.context) : '';
  if (context.length > LIMITS.maxContextChars) {
    return { ok: false, error: `Keep the case context under ${fmt(LIMITS.maxContextChars)} characters.` };
  }

  const raw = Array.isArray(input.sources) ? input.sources : [];
  if (raw.length < LIMITS.minExhibits) {
    return { ok: false, error: 'Add at least two exhibits to cross-examine.' };
  }
  if (raw.length > LIMITS.maxExhibits) {
    return { ok: false, error: `FaultLine compares up to ${LIMITS.maxExhibits} exhibits at a time.` };
  }

  const sources = raw.map((s, i) => ({
    label: cleanLine(s?.label).slice(0, LIMITS.maxLabelChars) || `Exhibit ${EXHIBIT_IDS[i]}`,
    kind: KIND_VALUES.has(s?.kind) ? s.kind : 'statement',
    text: cleanText(s?.text),
  }));

  for (const [i, s] of sources.entries()) {
    const id = EXHIBIT_IDS[i];
    if (s.text.length < LIMITS.minChars) {
      return { ok: false, error: `Exhibit ${id} is too short to analyse. Paste at least a couple of sentences.` };
    }
    if (s.text.length > LIMITS.maxChars) {
      return {
        ok: false,
        error: `Exhibit ${id} is longer than ${fmt(LIMITS.maxChars)} characters. Trim it to the part that matters.`,
      };
    }
  }

  const total = sources.reduce((n, s) => n + s.text.length, 0);
  if (total > LIMITS.maxTotalChars) {
    return {
      ok: false,
      error: `Together the exhibits run to ${fmt(total)} characters. Keep the case under ${fmt(LIMITS.maxTotalChars)}.`,
    };
  }

  return { ok: true, value: { context, sources } };
}
