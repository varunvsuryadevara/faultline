// Splits an exhibit's text into runs so overlapping highlights render correctly.
// Each mark: { start, end, tone: 'critical'|'major'|'minor'|'agree', ref: 'C1' | 'K2', title }.
const PRIORITY = { critical: 0, major: 1, minor: 2, agree: 3 };

export function segmentText(text, marks) {
  const valid = marks.filter((m) => Number.isInteger(m.start) && Number.isInteger(m.end) && m.end > m.start && m.start >= 0);
  if (!valid.length) return [{ text, marks: [] }];

  const cuts = new Set([0, text.length]);
  for (const m of valid) {
    cuts.add(Math.min(m.start, text.length));
    cuts.add(Math.min(m.end, text.length));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (a === b) continue;
    const covering = valid
      .filter((m) => m.start <= a && m.end >= b)
      .sort((x, y) => PRIORITY[x.tone] - PRIORITY[y.tone]);
    out.push({ text: text.slice(a, b), start: a, marks: covering });
  }
  return out;
}

// Collects the highlight marks for every exhibit from a verified analysis.
// Conflicts the reviewer dismissed are left unmarked.
export function marksByExhibit(result, review = {}) {
  const byId = {};
  const add = (exhibit, mark) => {
    (byId[exhibit] ||= []).push(mark);
  };
  for (const c of result?.contradictions ?? []) {
    if (review[c.id] === 'dismissed') continue;
    for (const ev of c.evidence) {
      if (ev.match?.status === 'missing') continue;
      add(ev.exhibit, { start: ev.match.start, end: ev.match.end, tone: c.severity, ref: c.id, title: c.title });
    }
  }
  for (const k of result?.corroborations ?? []) {
    for (const ev of k.evidence) {
      if (ev.match?.status === 'missing') continue;
      add(ev.exhibit, { start: ev.match.start, end: ev.match.end, tone: 'agree', ref: k.id, title: k.fact });
    }
  }
  return byId;
}
