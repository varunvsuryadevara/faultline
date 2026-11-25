import { parse, Allow } from 'partial-json';
import { SEVERITIES } from './constants.js';

// Reads the model's half-written JSON and reports real progress: which section it is
// writing, how many events it has rebuilt, and which conflicts it has committed to.
export function readProgress(text) {
  const start = typeof text === 'string' ? text.indexOf('{') : -1;
  if (start === -1) return { stage: 0, events: 0, conflicts: [], agreed: 0 };

  let obj;
  try {
    obj = parse(text.slice(start), Allow.ALL);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  const has = (key) => Object.prototype.hasOwnProperty.call(obj, key);
  let stage = 0;
  if (has('timeline')) stage = 1;
  if (has('contradictions')) stage = 2;
  if (has('corroborations')) stage = 3;
  if (has('gaps') || has('next_steps')) stage = 4;

  const timeline = Array.isArray(obj.timeline) ? obj.timeline : [];
  const contradictions = Array.isArray(obj.contradictions) ? obj.contradictions : [];
  const corroborations = Array.isArray(obj.corroborations) ? obj.corroborations : [];

  // A conflict counts once its severity is written: the title comes before it, so it is complete.
  // Enum capitalisation isn't guaranteed, so the severity is compared in lower case.
  const severityOf = (c) => (typeof c?.severity === 'string' ? c.severity.trim().toLowerCase() : '');
  const conflicts = contradictions
    .filter((c) => c && typeof c.title === 'string' && c.title.trim() && SEVERITIES.includes(severityOf(c)))
    .map((c, i) => ({ id: typeof c.id === 'string' && c.id ? c.id : `C${i + 1}`, title: c.title.trim(), severity: severityOf(c) }));

  return {
    stage,
    events: timeline.filter((e) => e && typeof e.event === 'string' && e.event.length > 3).length,
    conflicts,
    agreed: corroborations.filter((c) => c && typeof c.fact === 'string' && c.fact.length > 3).length,
  };
}

// Summarised thinking usually arrives as short paragraphs headed by a bold line such as
// "**Comparing the garage intake time**". Show the latest heading, or the latest sentence.
export function reasoningHeadline(text, max = 150) {
  if (typeof text !== 'string' || !text.trim()) return '';
  const headings = [...text.matchAll(/\*\*([^*\n]{4,140})\*\*/g)].map((m) => m[1].trim());
  let line = headings.at(-1);
  if (!line) {
    // No headings: use the last complete sentence, never a half-streamed one.
    const sentences = text
      .replace(/\*\*[^*]*$/, '')
      .replace(/\s+/g, ' ')
      .match(/[^.!?]{12,}[.!?](?=\s|$)/g);
    line = sentences?.at(-1)?.trim() || '';
  }
  line = line.replace(/[*_`#]/g, '').trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

// Turns raw stream callbacks into throttled, de-duplicated progress events.
export function createProgressTracker(onProgress, { intervalMs = 120 } = {}) {
  let state = { stage: 0, events: 0, conflicts: [], agreed: 0, reasoning: '' };
  let lastSent = '';
  let latestText = '';
  let lastParse = 0;
  let timer = null;

  const emit = () => {
    const key = JSON.stringify(state);
    if (key === lastSent) return;
    lastSent = key;
    onProgress({ ...state });
  };

  const parseNow = () => {
    timer = null;
    lastParse = Date.now();
    const p = readProgress(latestText);
    if (!p) return;
    // Never move backwards: partial parses can momentarily lose a trailing item.
    state = {
      ...state,
      stage: Math.max(state.stage, p.stage),
      events: Math.max(state.events, p.events),
      agreed: Math.max(state.agreed, p.agreed),
      conflicts: p.conflicts.length >= state.conflicts.length ? p.conflicts : state.conflicts,
    };
    emit();
  };

  return {
    start() {
      emit();
    },
    text(fullText) {
      latestText = fullText;
      const wait = intervalMs - (Date.now() - lastParse);
      if (wait <= 0) parseNow();
      else if (!timer) timer = setTimeout(parseNow, wait);
    },
    thinking(fullThinking) {
      const reasoning = reasoningHeadline(fullThinking);
      if (reasoning && reasoning !== state.reasoning) {
        state = { ...state, reasoning };
        emit();
      }
    },
    finish() {
      if (timer) clearTimeout(timer);
      if (latestText) parseNow();
      state = { ...state, stage: 5 };
      emit();
    },
    stop() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
