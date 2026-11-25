// Local RAG & Document Chunking Engine for FaultLine.
// 100% Offline Capable: Implements in-memory Okapi BM25 index, sliding-window chunking,
// and span-level citation attribution without external vector databases or remote embeddings.

import { extractFactualEntities } from './evidence.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'the', 'this', 'but', 'they', 'have', 'had', 'what', 'when',
  'where', 'who', 'which', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'just', 'should', 'now',
]);

/**
 * Tokenizes text into normalized lexical terms, excluding punctuation and stop words.
 */
export function tokenize(text) {
  if (!text) return [];
  const words = String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-_]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return words;
}

/**
 * Chunks an exhibit into manageable, overlapping passages while preserving
 * character offsets, document provenance, and extracted physical entities.
 */
export function chunkExhibit(exhibit, { chunkSizeWords = 120, overlapWords = 30 } = {}) {
  const text = String(exhibit.text || '');
  if (!text.trim()) return [];

  const exhibitId = exhibit.id || 'A';
  const label = exhibit.label || `Exhibit ${exhibitId}`;
  const kind = exhibit.kind || 'statement';

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks = [];
  let chunkIndex = 1;

  if (paragraphs.length <= 1 && text.split(/\s+/).length <= chunkSizeWords * 1.5) {
    // Single chunk for short exhibits
    const entities = extractFactualEntities([{ text }]);
    chunks.push({
      chunkId: `${exhibitId}-CHK-01`,
      exhibitId,
      label,
      kind,
      text: text.trim(),
      charStart: 0,
      charEnd: text.length,
      wordCount: text.split(/\s+/).length,
      entities,
    });
    return chunks;
  }

  // Sliding window across sentences/words
  const words = text.split(/(\s+)/); // preserves whitespace tokens
  const cleanWordIndices = [];
  let currentOffset = 0;

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (token.trim().length > 0) {
      cleanWordIndices.push({
        word: token,
        start: currentOffset,
        end: currentOffset + token.length,
      });
    }
    currentOffset += token.length;
  }

  const step = Math.max(1, chunkSizeWords - overlapWords);
  for (let i = 0; i < cleanWordIndices.length; i += step) {
    const slice = cleanWordIndices.slice(i, i + chunkSizeWords);
    if (slice.length === 0) break;

    const charStart = slice[0].start;
    const charEnd = slice[slice.length - 1].end;
    const chunkText = text.slice(charStart, charEnd).trim();

    const entities = extractFactualEntities([{ text: chunkText }]);

    chunks.push({
      chunkId: `${exhibitId}-CHK-${String(chunkIndex++).padStart(2, '0')}`,
      exhibitId,
      label,
      kind,
      text: chunkText,
      charStart,
      charEnd,
      wordCount: slice.length,
      entities,
    });

    if (i + chunkSizeWords >= cleanWordIndices.length) break;
  }

  return chunks;
}

/**
 * In-memory Okapi BM25 Index for fast, deterministic lexical search across case exhibits.
 */
export class BM25Index {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.chunks = [];
    this.docCount = 0;
    this.avgDocLength = 0;
    this.docLengths = [];
    this.termFreqs = []; // Array of Maps: [chunkIdx => Map(term => count)]
    this.docFreqs = new Map(); // term => count of documents containing term
    this.idfCache = new Map();
  }

  /**
   * Indexes an array of document chunks.
   */
  index(chunks = []) {
    this.chunks = chunks;
    this.docCount = chunks.length;
    this.docLengths = [];
    this.termFreqs = [];
    this.docFreqs = new Map();
    this.idfCache = new Map();

    if (this.docCount === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalLength = 0;

    chunks.forEach((chunk, idx) => {
      const tokens = tokenize(chunk.text);
      const length = tokens.length;
      this.docLengths.push(length);
      totalLength += length;

      const tf = new Map();
      const seenTerms = new Set();

      tokens.forEach((term) => {
        tf.set(term, (tf.get(term) || 0) + 1);
        seenTerms.add(term);
      });

      this.termFreqs.push(tf);

      seenTerms.forEach((term) => {
        this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
      });
    });

    this.avgDocLength = totalLength / this.docCount;

    // Precalculate IDFs
    for (const [term, df] of this.docFreqs.entries()) {
      // Okapi BM25 IDF formula with smoothing
      const idf = Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5));
      this.idfCache.set(term, Math.max(0.1, idf));
    }
  }

  /**
   * Queries the BM25 index and returns ranked matching chunks with scores.
   */
  search(query, topK = 4) {
    if (!query || this.docCount === 0) return [];

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores = new Array(this.docCount).fill(0);

    queryTerms.forEach((term) => {
      const idf = this.idfCache.get(term);
      if (!idf) return;

      for (let i = 0; i < this.docCount; i++) {
        const tf = this.termFreqs[i].get(term) || 0;
        if (tf === 0) continue;

        const docLen = this.docLengths[i];
        const denom = tf + this.k1 * (1 - this.b + (this.b * docLen) / (this.avgDocLength || 1));
        const score = (idf * (tf * (this.k1 + 1))) / denom;
        scores[i] += score;
      }
    });

    const results = [];
    for (let i = 0; i < this.docCount; i++) {
      if (scores[i] > 0) {
        results.push({
          chunk: this.chunks[i],
          score: Number(scores[i].toFixed(4)),
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}

/**
 * High-level Hybrid RAG query across an investigation's exhibits.
 * Combines BM25 lexical ranking with entity-overlap scoring and verbatim span attribution.
 */
export function queryInvestigationRAG(query, exhibits = [], { topK = 4 } = {}) {
  if (!Array.isArray(exhibits) || exhibits.length === 0) {
    return {
      query,
      results: [],
      totalChunks: 0,
      contextSnippet: '',
    };
  }

  // 1. Chunk all exhibits
  const allChunks = [];
  exhibits.forEach((e, idx) => {
    const exhibitId = String.fromCharCode(65 + idx);
    const chunks = chunkExhibit({ ...e, id: exhibitId });
    allChunks.push(...chunks);
  });

  // 2. Build index
  const index = new BM25Index();
  index.index(allChunks);

  // 3. Search
  const searchHits = index.search(query, topK);

  // 4. Boost chunks with physical entity matches (speeds, dates, plates)
  const queryLower = String(query).toLowerCase();
  const boostedResults = searchHits.map(({ chunk, score }) => {
    let finalScore = score;
    // Boost if chunk mentions numbers or speeds queried
    if (chunk.entities) {
      if (chunk.entities.speeds.some((s) => queryLower.includes(s.toLowerCase()))) finalScore += 1.5;
      if (chunk.entities.plates.some((p) => queryLower.includes(p.toLowerCase()))) finalScore += 2.0;
      if (chunk.entities.dates.some((d) => queryLower.includes(d.toLowerCase()))) finalScore += 1.2;
    }
    return {
      chunkId: chunk.chunkId,
      exhibitId: chunk.exhibitId,
      label: chunk.label,
      kind: chunk.kind,
      text: chunk.text,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      score: Number(finalScore.toFixed(3)),
      entities: chunk.entities,
    };
  });

  boostedResults.sort((a, b) => b.score - a.score);

  // 5. Format grounded context snippet for prompt injection
  const contextSnippet = boostedResults
    .map(
      (hit) =>
        `[Source: Exhibit ${hit.exhibitId} (${hit.label}) • Chk ${hit.chunkId}]\n"${hit.text}"`
    )
    .join('\n\n');

  return {
    query,
    results: boostedResults,
    totalChunks: allChunks.length,
    contextSnippet,
  };
}
