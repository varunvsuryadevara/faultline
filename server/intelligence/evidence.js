// EvidenceRetrievalService: Ingests, searches, and audits exhibit texts and attachments.
// Provides traceable exhibit citations and identifies key factual metrics (dates, speeds, damages).
// Powered by local BM25 RAG for deep semantic and lexical search.

import { queryInvestigationRAG, chunkExhibit } from './rag.js';

export { queryInvestigationRAG, chunkExhibit };

/**
 * Searches exhibits for specific keywords and extracts matching quotes with Exhibit ID.
 * Retains backward compatibility with existing unit tests while providing enriched chunk metadata.
 */
export function searchExhibits(exhibits = [], query = '') {
  if (!Array.isArray(exhibits) || exhibits.length === 0) {
    return { matches: [], totalExhibits: 0 };
  }

  const q = String(query || '').toLowerCase().trim();
  const matches = [];

  exhibits.forEach((e, i) => {
    const exhibitId = String.fromCharCode(65 + i);
    const label = e.label || `Exhibit ${exhibitId}`;
    const text = String(e.text || '');
    const fullSearchable = `${label} ${e.kind || ''} ${text}`.toLowerCase();
    const lower = text.toLowerCase();

    if (!q || fullSearchable.includes(q)) {
      // Find relevant snippet
      let snippet = text.slice(0, 160).replace(/\s+/g, ' ');
      let charStart = 0;
      let charEnd = Math.min(text.length, 160);

      if (q && lower.includes(q)) {
        const idx = lower.indexOf(q);
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 80);
        snippet = (start > 0 ? '...' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '...' : '');
        charStart = start;
        charEnd = end;
      } else if (q && (label.toLowerCase().includes(q) || (e.kind && String(e.kind).toLowerCase().includes(q)))) {
        snippet = `[Match in ${label}] ${text.slice(0, 120).replace(/\s+/g, ' ')}`;
      }

      matches.push({
        exhibitId,
        label,
        kind: e.kind || 'statement',
        snippet,
        charStart,
        charEnd,
        characterCount: text.length,
        attachmentsCount: e.attachments ? e.attachments.length : 0,
      });
    }
  });

  return {
    matches,
    totalExhibits: exhibits.length,
  };
}

/**
 * Forensically extracts dates, speeds, vehicle plates, and amounts from exhibits.
 */
export function extractFactualEntities(exhibits = []) {
  const dates = new Set();
  const speeds = new Set();
  const plates = new Set();
  const monetary = new Set();

  for (const e of exhibits) {
    const text = String(e.text || '');

    // Dates & Times
    const dateMatches = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi) || [];
    dateMatches.forEach((d) => dates.add(d.trim()));

    // Speeds (mph / km/h)
    const speedMatches = text.match(/\b\d{1,3}\s*(?:mph|km\/?h|kph)\b/gi) || [];
    speedMatches.forEach((s) => speeds.add(s.trim()));

    // Vehicle Registrations (UK, US, EU patterns)
    const plateMatches = text.match(/\b(?:[A-Z]{2}[0-9]{2}\s*[A-Z]{3}|[0-9][A-Z]{3}[0-9]{3}|[A-Z]{1,3}[-\s][0-9]{1,4})\b/g) || [];
    plateMatches.forEach((p) => plates.add(p.trim()));

    // Amounts ($ £ €)
    const moneyMatches = text.match(/(?:[$£€]\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?\s*(?:GBP|USD|EUR))/gi) || [];
    moneyMatches.forEach((m) => monetary.add(m.trim()));
  }

  return {
    dates: Array.from(dates),
    speeds: Array.from(speeds),
    plates: Array.from(plates),
    monetary: Array.from(monetary),
  };
}

/**
 * Checks for common critical evidence types and flags gaps.
 */
export function auditEvidenceCompleteness(exhibits = []) {
  const allText = exhibits.map((e) => `${e.label} ${e.text}`).join(' ').toLowerCase();

  const checks = [
    { type: 'Police Incident Report / CAD', present: /police|cad|officer|constabulary|patrol/i.test(allText) },
    { type: 'Independent Witness Account', present: /witness|bystander|pedestrian|independent account/i.test(allText) },
    { type: 'Objective Telematics / GPS Data', present: /telematics|gps|black box|speed sensor|accelerometer/i.test(allText) },
    { type: 'Dashcam / CCTV Footage', present: /dashcam|cctv|camera|video footage|recording/i.test(allText) },
    { type: 'Vehicle Damage Inspection / Engineer Report', present: /engineer|damage appraisal|repair estimate|paint transfer|impact point/i.test(allText) },
  ];

  const present = checks.filter((c) => c.present).map((c) => c.type);
  const missing = checks.filter((c) => !c.present).map((c) => c.type);

  return {
    completenessRatio: `${present.length} / ${checks.length}`,
    completenessPercentage: Math.round((present.length / checks.length) * 100),
    present,
    missing,
  };
}
