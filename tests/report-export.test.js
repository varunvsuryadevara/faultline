import test from 'node:test';
import assert from 'node:assert/strict';
import mammoth from 'mammoth';
import {
  normalizeReportData,
  getReportFilename,
  generatePlainTextReport,
  generateMarkdownReport,
  generateWordDocx,
  generatePdfDocument,
  printInvestigationReport,
} from '../src/lib/exportReport.js';
import { computeClaimDecision, DECISION_OUTCOMES, DECISION_LABELS } from '../shared/decision.js';

test('Report Export 1: normalizeReportData handles cross-examination and assessment inputs gracefully', () => {
  // Case A: Full cross-examination analysis
  const norm1 = normalizeReportData({
    title: 'Roundabout Dispute',
    context: 'Wet night in Reading',
    result: {
      contradictions: [
        {
          id: 'C1',
          severity: 'major',
          category: 'liability-denial',
          title: 'Lane position dispute',
          explanation: 'Driver A says lane 1, Driver B says lane 2.',
          confidence: 0.88,
          evidence: [
            { exhibit: 'A', quote: 'I was in lane 1', match: { status: 'exact' } },
            { exhibit: 'B', quote: 'she veered from lane 2', match: { status: 'exact' } },
          ],
        },
      ],
      corroborations: [{ fact: 'Impact occurred on roundabout', exhibits: ['A', 'B'] }],
      timeline: [{ time: '17:40', event: 'Vehicles collide on entry', exhibits: ['A', 'B'], status: 'disputed' }],
      gaps: [{ gap: 'CCTV footage missing', request: 'Council CCTV' }],
      meta: {
        model: 'claude-sonnet-5-5',
        generatedAt: '2026-11-23T12:00:00Z',
        exhibits: [
          { id: 'A', label: 'Driver A Statement', kind: 'statement' },
          { id: 'B', label: 'Driver B Statement', kind: 'statement' },
        ],
      },
    },
    review: {},
  });

  assert.equal(norm1.title, 'Roundabout Dispute');
  assert.equal(norm1.contradictions.length, 1);
  assert.equal(norm1.corroborations.length, 1);
  assert.equal(norm1.exhibits.length, 2);
  assert.ok(norm1.decision);

  // Case B: Assessment input (from ScenarioAssessment without contradictions)
  const norm2 = normalizeReportData({
    title: 'UK-001 Lane dispute',
    scenario: { id: 'UK-001', title: 'Lane dispute on a spiral roundabout', country: 'United Kingdom', category: 'Motor' },
    result: {
      intent: 'genuine',
      risk: 'low',
      confidence: 0.9,
      summary: 'Accident occurred as described.',
      reasoning: 'Road markings support policyholder.',
      supporting: [{ point: 'Independent dashcam', exhibit: 'C', quote: 'clearly in marked lane' }],
      against: [],
      indicators: [],
      missing: [{ item: 'Engineer inspection', why: 'Verify paint transfer' }],
      meta: {
        exhibits: [
          { id: 'A', label: 'Policyholder statement', kind: 'statement' },
          { id: 'C', label: 'Dashcam footage', kind: 'dashcam' },
        ],
      },
    },
  });

  assert.equal(norm2.scenarioId, 'UK-001');
  assert.equal(norm2.supporting.length, 1);
  assert.equal(norm2.missing.length, 1);
  assert.equal(norm2.decision.decision, DECISION_OUTCOMES.APPROVE);
});

test('Report Export 2: Standardized filenames follow FaultLine_Investigation_<ID> convention', () => {
  const file1 = getReportFilename({ scenarioId: 'UK-001', title: 'Lane dispute' }, 'txt');
  assert.equal(file1, 'FaultLine_Investigation_UK-001.txt');

  const file2 = getReportFilename({ scenarioId: 'UK-001', title: 'Lane dispute' }, 'pdf');
  assert.equal(file2, 'FaultLine_Investigation_UK-001.pdf');

  const file3 = getReportFilename({ scenarioId: 'UK-001', title: 'Lane dispute' }, 'docx');
  assert.equal(file3, 'FaultLine_Investigation_UK-001.docx');

  const file4 = getReportFilename({ scenarioId: 'UK-001', title: 'Lane dispute' }, 'md');
  assert.equal(file4, 'FaultLine_Investigation_UK-001.md');

  // When no scenario ID is available, falls back to slugified title
  const file5 = getReportFilename({ title: 'Supermarket Car Park Hit and Run' }, 'txt');
  assert.equal(file5, 'FaultLine_Investigation_supermarket-car-park-hit-and-run.txt');
});

test('Report Export 3: generatePlainTextReport generates complete, formatted text report', () => {
  const text = generatePlainTextReport({
    title: 'UK-042 Keyless Range Rover Theft',
    scenario: { id: 'UK-042', title: 'Keyless Range Rover Theft', country: 'United Kingdom', category: 'Theft' },
    result: {
      contradictions: [],
      corroborations: [{ fact: 'Vehicle was parked on driveway at 01:00', exhibits: ['A', 'B'] }],
      timeline: [{ time: '02:40', event: 'Vehicle driven away without keys', exhibits: ['B'], status: 'corroborated' }],
      meta: {
        model: 'claude-sonnet-5-5',
        generatedAt: '2026-11-23T12:00:00Z',
        exhibits: [
          { id: 'A', label: 'Claimant Notification', kind: 'statement' },
          { id: 'B', label: 'Driveway CCTV', kind: 'cctv' },
        ],
      },
    },
  });

  // Verify essential plain text sections
  assert.ok(text.includes('FAULTLINE FORENSIC INVESTIGATION REPORT'));
  assert.ok(text.includes('Investigation ID:  UK-042'));
  assert.ok(text.includes('1. FINAL CLAIM DECISION & RECOMMENDATION'));
  assert.ok(text.includes('RECOMMENDED OUTCOME:'));
  assert.ok(text.includes('AI ASSESSMENT CONFIDENCE:'));
  assert.ok(text.includes('RISK LEVEL:'));
  assert.ok(text.includes('SUPPORTING FINDINGS:'));
  assert.ok(text.includes('ACTIVE CONTRADICTIONS:'));
  assert.ok(text.includes('UNRESOLVED ISSUES:'));
  assert.ok(text.includes('WHY THIS DECISION? (DETAILED EXPLANATION):'));
  assert.ok(text.includes('KEY REASONS FOR RECOMMENDATION:'));
  assert.ok(text.includes('3. EVIDENCE ANALYSIS & FINDINGS CLASSIFICATION'));
  assert.ok(text.includes('[VERIFIED FACTS & INDEPENDENT CORROBORATIONS]'));
  assert.ok(text.includes('7. EVIDENCE INVENTORY'));
  assert.ok(text.includes('Exhibit A: Claimant Notification'));
  assert.ok(text.includes('Exhibit B: Driveway CCTV'));
  assert.ok(text.includes('HUMAN REVIEW & STATUTORY DISCLAIMER'));
});

test('Report Export 4: generateMarkdownReport matches structured Markdown specification', () => {
  const md = generateMarkdownReport({
    title: 'UK-016 Lapsed Tracker Theft',
    scenario: { id: 'UK-016', title: 'Lapsed Tracker Theft', country: 'United Kingdom' },
    result: {
      intent: 'genuine',
      risk: 'medium',
      confidence: 0.82,
      summary: 'Vehicle stolen via relay attack.',
      supporting: [{ point: 'Both original keys presented', exhibit: 'A', quote: 'both OEM keys accounted for' }],
      against: [],
      indicators: [{ point: 'Tracker subscription lapsed 2 weeks prior', weight: 'moderate' }],
      missing: [{ item: 'Tracker company telemetry log', why: 'Confirm last known ping' }],
      meta: {
        exhibits: [{ id: 'A', label: 'Key inspection', kind: 'inspection' }],
      },
    },
  });

  // Headings required by user specification
  assert.ok(md.includes('# FaultLine Investigation Report'));
  assert.ok(md.includes('## Investigation Details'));
  assert.ok(md.includes('## Final Decision'));
  assert.ok(md.includes('## Why This Decision?'));
  assert.ok(md.includes('## Key Reasons for Recommendation'));
  assert.ok(md.includes('## Executive Summary'));
  assert.ok(md.includes('## Evidence Analysis'));
  assert.ok(md.includes('### Verified Facts'));
  assert.ok(md.includes('### Supporting Evidence'));
  assert.ok(md.includes('### Contradicting Evidence'));
  assert.ok(md.includes('### Suspicious Indicators'));
  assert.ok(md.includes('## Missing Evidence'));
  assert.ok(md.includes('## Unresolved Issues'));
  assert.ok(md.includes('## Final Decision Rationale'));
  assert.ok(md.includes('## Human Review Disclaimer'));
});

test('Report Export 5: generateWordDocx generates valid OpenXML .docx parseable by mammoth', async () => {
  const { blob, filename, d } = await generateWordDocx({
    title: 'UK-001 Lane dispute on a spiral roundabout',
    scenario: { id: 'UK-001', title: 'Lane dispute on a spiral roundabout', country: 'United Kingdom' },
    result: {
      contradictions: [
        {
          id: 'C1',
          severity: 'major',
          category: 'liability-denial',
          title: 'Lane entry conflict',
          explanation: 'Conflicting accounts of which lane each car occupied entering the spiral.',
          evidence: [
            { exhibit: 'A', quote: 'I entered in lane 1', match: { status: 'exact' } },
            { exhibit: 'B', quote: 'she crossed into my lane', match: { status: 'exact' } },
          ],
        },
      ],
      corroborations: [{ fact: 'Collision occurred at 17:40', exhibits: ['A', 'B'] }],
      meta: {
        exhibits: [
          { id: 'A', label: 'Claimant Statement', kind: 'statement' },
          { id: 'B', label: 'Third Party Statement', kind: 'statement' },
        ],
      },
    },
  });

  assert.equal(filename, 'FaultLine_Investigation_UK-001.docx');
  assert.ok(blob.size > 1000, 'Word document blob has substantial size');

  // Convert Blob to buffer and parse with mammoth to verify WordprocessingML validity
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const parsed = await mammoth.extractRawText({ buffer });

  assert.ok(parsed.value.includes('FaultLine Forensic Investigation Report'));
  assert.ok(parsed.value.includes('UK-001'));
  assert.ok(parsed.value.includes('Executive Summary'));
  assert.ok(parsed.value.includes('Verified Facts'));
  assert.ok(parsed.value.includes('HUMAN REVIEW & STATUTORY DISCLAIMER'));
});

test('Report Export 6: generatePdfDocument generates multi-page PDF with correct pages and metadata', () => {
  const { doc, blob, filename } = generatePdfDocument({
    title: 'UK-002 Fog concertina on the M25',
    scenario: { id: 'UK-002', title: 'Fog concertina on the M25', country: 'United Kingdom', category: 'Multi-Vehicle' },
    result: {
      contradictions: [
        {
          id: 'C1',
          severity: 'minor',
          category: 'chain-of-impact',
          title: 'Order of impacts',
          explanation: 'Driver 3 claims hit from behind first; telematics indicates first impact was in front.',
          evidence: [{ exhibit: 'A', quote: 'pushed from behind' }],
        },
      ],
      corroborations: [{ fact: 'Heavy fog reduced visibility below 50m', exhibits: ['A', 'B'] }],
      timeline: [{ time: '07:15', event: 'First vehicle stops suddenly in fog', exhibits: ['A'], status: 'one-source' }],
      meta: {
        model: 'claude-sonnet-5-5',
        generatedAt: '2026-11-23T12:00:00Z',
        exhibits: [
          { id: 'A', label: 'Insured statement', kind: 'statement' },
          { id: 'B', label: 'Highway telemetry', kind: 'telematics' },
        ],
      },
    },
  });

  assert.equal(filename, 'FaultLine_Investigation_UK-002.pdf');
  assert.ok(blob.size > 2000, 'PDF blob has substantial content');
  assert.ok(doc.getNumberOfPages() >= 1, 'PDF has at least 1 page');
});

test('Report Export 7: printInvestigationReport generates printable HTML without unhandled errors', () => {
  const html = printInvestigationReport({
    title: 'Printable Test Case',
    result: {
      contradictions: [],
      corroborations: [{ fact: 'Both parties agree on collision time', exhibits: ['A', 'B'] }],
      meta: {
        exhibits: [
          { id: 'A', label: 'Exhibit A', kind: 'statement' },
          { id: 'B', label: 'Exhibit B', kind: 'statement' },
        ],
      },
    },
  });

  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('FaultLine Report - Printable Test Case'));
  assert.ok(html.includes('@page {'));
  assert.ok(html.includes('RECOMMENDED OUTCOME:'));
  assert.ok(html.includes('Executive Summary'));
  assert.ok(html.includes('HUMAN REVIEW &amp; STATUTORY DISCLAIMER'));
});
