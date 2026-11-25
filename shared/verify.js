// Checks every quote the model cites against the exhibit text, mechanically.
// exact   = found character for character (ignoring case, curly quotes, dashes and spacing)
// close   = found with small wording differences (at least 80% of its words, in order)
// missing = not found; the UI warns that the quote cannot be verified
// Offsets (start, end) index into the cleaned exhibit text so the UI can highlight them.

const CHAR_MAP = {
  '‘': "'", '’': "'", '‚': "'", '‛': "'", '′': "'", '`': "'",
  '“': '"', '”': '"', '„': '"', '‟': '"', '″': '"',
  '‐': '-', '‑': '-', '‒': '-', '–': '-', '—': '-', '―': '-', '−': '-',
  '…': '...',
};

// Lower-cases and folds punctuation/whitespace, keeping a map back to original offsets.
function normalizeWithMap(text) {
  let out = '';
  const map = [];
  let wsStart = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (wsStart === -1) wsStart = i;
      continue;
    }
    if (wsStart !== -1) {
      if (out.length) {
        out += ' ';
        map.push(wsStart);
      }
      wsStart = -1;
    }
    const folded = (CHAR_MAP[ch] ?? ch).toLowerCase();
    for (let k = 0; k < folded.length; k++) {
      out += folded[k];
      map.push(i);
    }
  }
  return { text: out, map };
}

const fold = (s) => normalizeWithMap(s).text;

function findExact(norm, needle) {
  if (!needle) return null;
  const idx = norm.text.indexOf(needle);
  if (idx === -1) return null;
  return { start: norm.map[idx], end: norm.map[idx + needle.length - 1] + 1 };
}

function quoteVariants(quote) {
  const base = fold(quote).replace(/^["'\s]+|["'\s]+$/g, '');
  const trimmedPunct = base.replace(/[.,;:!?]+$/g, '').trim();
  const noLead = trimmedPunct.replace(/^(and|but|so|then)\s+/, '');
  return [...new Set([base, trimmedPunct, noLead])].filter((v) => v.length >= 3);
}

const WORD = /[\p{L}\p{N}]+/gu;
function words(text) {
  const out = [];
  for (const m of text.matchAll(WORD)) out.push({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  return out;
}

// Best in-order word overlap within a window slightly longer than the quote. Quotes under five
// words are too short to match loosely without false positives, so they must match exactly.
function findClose(sourceWords, quote) {
  const q = words(quote).map((t) => t.w);
  if (q.length < 5 || sourceWords.length === 0) return null;
  const windowLen = q.length + Math.ceil(q.length * 0.3) + 1;
  let best = null;
  for (let i = 0; i < sourceWords.length; i++) {
    let qi = 0;
    let matched = 0;
    let first = -1;
    let last = -1;
    const stop = Math.min(sourceWords.length, i + windowLen);
    for (let j = i; j < stop && qi < q.length; j++) {
      for (let k = qi; k < Math.min(q.length, qi + 3); k++) {
        if (sourceWords[j].w === q[k]) {
          matched += 1;
          qi = k + 1;
          if (first === -1) first = j;
          last = j;
          break;
        }
      }
    }
    const score = matched / q.length;
    if (first !== -1 && (!best || score > best.score)) {
      best = { score, start: sourceWords[first].start, end: sourceWords[last].end };
    }
  }
  return best && best.score >= 0.8 ? best : null;
}

function locate(exhibit, quote) {
  for (const variant of quoteVariants(quote)) {
    const hit = findExact(exhibit.norm, variant);
    if (hit) return { status: 'exact', ...hit };
  }
  // The model sometimes elides with "..." despite instructions: match the pieces in order.
  const pieces = fold(quote)
    .split('...')
    .map((p) => p.replace(/^["'\s]+|["'\s]+$/g, ''))
    .filter((p) => p.length >= 10);
  if (pieces.length > 1) {
    const hits = pieces.map((p) => findExact(exhibit.norm, p));
    if (hits.every(Boolean) && hits.every((h, i) => i === 0 || h.start >= hits[i - 1].end)) {
      return { status: 'close', start: hits[0].start, end: hits.at(-1).end };
    }
  }
  const close = findClose(exhibit.words, quote);
  if (close) return { status: 'close', start: close.start, end: close.end };
  return { status: 'missing' };
}

// A reusable checker: check({exhibit, quote}) returns the item with its exhibit (corrected if the
// quote was cited to the wrong one) and a match; stats counts the outcomes.
export function createQuoteChecker(exhibits) {
  const indexed = new Map(
    exhibits.map((e) => [e.id, { id: e.id, text: e.text, norm: normalizeWithMap(e.text), words: words(e.text) }]),
  );
  const stats = { total: 0, exact: 0, close: 0, missing: 0 };

  const check = (ev) => {
    let exhibitId = ev.exhibit;
    let match = indexed.has(exhibitId) ? locate(indexed.get(exhibitId), ev.quote) : { status: 'missing' };
    // Cited the wrong exhibit? If the words appear verbatim in another one, re-attribute and say so.
    if (match.status === 'missing') {
      for (const other of indexed.values()) {
        if (other.id === exhibitId) continue;
        const hit = locate(other, ev.quote);
        if (hit.status === 'exact') {
          match = { ...hit, citedAs: exhibitId };
          exhibitId = other.id;
          break;
        }
      }
    }
    stats.total += 1;
    stats[match.status] += 1;
    return { exhibit: exhibitId, quote: ev.quote, match };
  };

  return { check, stats };
}

export function verifyEvidence(analysis, exhibits) {
  const { check, stats } = createQuoteChecker(exhibits);
  return {
    ...analysis,
    contradictions: analysis.contradictions.map((c) => ({ ...c, evidence: c.evidence.map(check) })),
    corroborations: analysis.corroborations.map((k) => {
      const evidence = k.evidence.map(check);
      return { ...k, evidence, exhibits: [...new Set(evidence.map((ev) => ev.exhibit))] };
    }),
    quoteCheck: stats,
  };
}
