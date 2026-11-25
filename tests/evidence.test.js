import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import * as xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { combineExhibitText, parseEvidenceCitation, formatAttachmentContent } from '../shared/evidence-combine.js';
import { LIMITS } from '../shared/constants.js';

test('Evidence: combineExhibitText formats attachments with source markers and verbatim text', () => {
  const manual = 'The claimant states they came to a complete halt at the roundabout.';
  const attachments = [
    {
      id: 'att-1',
      name: 'Claimant_Statement.pdf',
      type: 'application/pdf',
      size: 15400,
      status: 'ready',
      summary: '2 pages • 15.4 KB • Processed ✓',
      extractedText: '[Source: Exhibit A - Claimant_Statement.pdf, Page 1]\nVehicle was stationary immediately before impact.\n\n[Source: Exhibit A - Claimant_Statement.pdf, Page 2]\nThird party was driving excessively fast.',
    },
    {
      id: 'att-2',
      name: 'Repair_Estimate.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 42000,
      status: 'ready',
      summary: '1 worksheet • Processed ✓',
      extractedText: '[Source: Exhibit A - Repair_Estimate.xlsx, Sheet: Repair Costs]\nRow 1: Cell A1: Rear Bumper | Cell B1: £450\nRow 2: Cell G18: Total Claimed: £3,200',
    },
  ];

  const combined = combineExhibitText(manual, attachments, 'A', 'Claimant Statement');
  assert.ok(combined.includes(manual));
  assert.ok(combined.includes('[Source: Exhibit A - Claimant_Statement.pdf, Page 1]'));
  assert.ok(combined.includes('Vehicle was stationary immediately before impact.'));
  assert.ok(combined.includes('[Source: Exhibit A - Repair_Estimate.xlsx, Sheet: Repair Costs]'));
  assert.ok(combined.includes('Cell G18: Total Claimed: £3,200'));
});

test('Evidence: parseEvidenceCitation correctly extracts filename, page, sheet and cell references', () => {
  const cite1 = '[Source: Exhibit A - Claimant_Statement.pdf, Page 3]';
  const parsed1 = parseEvidenceCitation(cite1);
  assert.equal(parsed1.exhibitId, 'A');
  assert.equal(parsed1.filename, 'Claimant_Statement.pdf');
  assert.equal(parsed1.page, 3);

  const cite2 = 'Exhibit D — Repair_Estimate.xlsx, Sheet: Repair Costs, Cell: G18';
  const parsed2 = parseEvidenceCitation(cite2);
  assert.equal(parsed2.filename, 'Repair_Estimate.xlsx');
  assert.equal(parsed2.sheet, 'Repair Costs');
  assert.equal(parsed2.cell, 'G18');

  const cite3 = 'Dashcam.mp4 at Timestamp: 00:01:24';
  const parsed3 = parseEvidenceCitation(cite3);
  assert.equal(parsed3.filename, 'Dashcam.mp4');
  assert.equal(parsed3.timestamp, '00:01:24');
});

test('Evidence: PDFParse extracts text per page from valid PDF buffer', async () => {
  const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 62>> stream
BT /F1 12 Tf 100 700 Td (Claimant Statement: Stopped at the give-way line) Tj ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000357 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
425
%%EOF`;

  const parser = new PDFParse({ data: Buffer.from(pdfContent) });
  await parser.load();
  const res = await parser.getText();
  assert.equal(res.total, 1);
  assert.ok(res.text.includes('Stopped at the give-way line'));
});

test('Evidence: Excel workbook extraction iterates sheets and extracts cell coordinates', () => {
  const wb = xlsx.utils.book_new();
  const ws1 = xlsx.utils.aoa_to_sheet([
    ['Part', 'Cost'],
    ['Bumper', 450],
  ]);
  const ws2 = xlsx.utils.aoa_to_sheet([
    ['Labor Type', 'Hours', 'Rate', 'Total'],
    ['Paint', 4, 80, 320],
  ]);
  xlsx.utils.book_append_sheet(wb, ws1, 'Parts');
  xlsx.utils.book_append_sheet(wb, ws2, 'Labor Breakdown');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const readWb = xlsx.read(buf, { type: 'buffer' });

  assert.deepEqual(readWb.SheetNames, ['Parts', 'Labor Breakdown']);
  const partsJson = xlsx.utils.sheet_to_json(readWb.Sheets['Parts'], { header: 1 });
  assert.equal(partsJson[1][0], 'Bumper');
  assert.equal(partsJson[1][1], 450);
});

test('Evidence: Limits allow larger character counts for exhibits with multi-page attachments', () => {
  assert.ok(LIMITS.maxChars >= 30000, 'maxChars must be at least 30k for multi-page documents');
  assert.ok(LIMITS.maxTotalChars >= 120000, 'maxTotalChars must be at least 120k for large investigations');
});

test('Evidence: verifyEvidence mechanically verifies verbatim quotes cited from attached document text', async () => {
  const { verifyEvidence } = await import('../shared/verify.js');
  const manual = 'Claimant completed standard FNOL telephone report.';
  const attachments = [
    {
      id: 'att-pdf-1',
      name: 'Claimant_Statement.pdf',
      type: 'application/pdf',
      size: 12000,
      status: 'ready',
      summary: '1 page • Processed ✓',
      extractedText: '[Source: Exhibit A - Claimant_Statement.pdf, Page 1]\nThe other vehicle came to a sudden halt on the roundabout without any brake lights activating.',
    },
  ];

  const combined = combineExhibitText(manual, attachments, 'A', 'Claimant Statement');
  const exhibits = [{ id: 'A', text: combined }];

  const analysis = {
    contradictions: [
      {
        id: 'C1',
        title: 'Braking conflict',
        evidence: [{ exhibit: 'A', quote: 'The other vehicle came to a sudden halt on the roundabout' }],
      },
    ],
    corroborations: [],
  };

  const verified = verifyEvidence(analysis, exhibits);
  const match = verified.contradictions[0].evidence[0].match;

  assert.equal(match.status, 'exact');
  assert.ok(match.start >= 0);
  assert.ok(match.end > match.start);
});
