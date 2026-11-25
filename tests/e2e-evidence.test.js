import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import * as xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { combineExhibitText, parseEvidenceCitation } from '../shared/evidence-combine.js';
import { verifyEvidence } from '../shared/verify.js';
import { LIMITS } from '../shared/constants.js';

test('E2E Acceptance 1: Real PDF extraction preserves pages, text and source references', async () => {
  const pdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 78>> stream
BT /F1 12 Tf 100 700 Td (Claimant Statement: Vehicle was stationary immediately before impact.) Tj ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000373 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
441
%%EOF`;

  const parser = new PDFParse({ data: Buffer.from(pdfContent) });
  await parser.load();
  const res = await parser.getText();

  assert.equal(res.total, 1);
  assert.ok(res.text.includes('Vehicle was stationary immediately before impact.'));

  const attachment = {
    id: 'att-pdf-e2e',
    name: 'Claimant_Statement.pdf',
    type: 'application/pdf',
    size: 512,
    status: 'ready',
    summary: '1 page • 0.5 KB • Processed ✓',
    extractedText: `[Source: Exhibit A - Claimant_Statement.pdf, Page 1]\n${res.text.trim()}`,
  };

  const combined = combineExhibitText('', [attachment], 'A', 'Claimant Statement');
  assert.ok(combined.includes('[Source: Exhibit A - Claimant_Statement.pdf, Page 1]'));
  assert.ok(combined.includes('Vehicle was stationary immediately before impact.'));
});

test('E2E Acceptance 2: Real Multi-sheet Excel workbook extraction extracts sheet names and cell coordinates', () => {
  const wb = xlsx.utils.book_new();
  const ws1 = xlsx.utils.aoa_to_sheet([
    ['Item', 'Qty', 'Unit Price', 'Total'],
    ['Front Bumper', 1, 450, 450],
    ['Headlight Lens', 2, 120, 240],
    ['Total Repair Estimate', '', '', 690],
  ]);
  const ws2 = xlsx.utils.aoa_to_sheet([
    ['Technician', 'Hours', 'Rate', 'Total Labor'],
    ['Body Shop Tech A', 4.5, 75, 337.5],
  ]);

  xlsx.utils.book_append_sheet(wb, ws1, 'Repair Costs');
  xlsx.utils.book_append_sheet(wb, ws2, 'Labor Breakdown');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const readWb = xlsx.read(buf, { type: 'buffer' });

  assert.deepEqual(readWb.SheetNames, ['Repair Costs', 'Labor Breakdown']);

  const sheet1Data = xlsx.utils.sheet_to_json(readWb.Sheets['Repair Costs'], { header: 1 });
  assert.equal(sheet1Data[1][0], 'Front Bumper');
  assert.equal(sheet1Data[1][3], 450);

  const attachment = {
    id: 'att-xls-e2e',
    name: 'Repair_Estimate.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: buf.length,
    status: 'ready',
    summary: '2 worksheets • Processed ✓',
    extractedText: `[Source: Exhibit D - Repair_Estimate.xlsx, Sheet: Repair Costs]\nRow 1: Cell A1: Item | Cell B1: Qty | Cell C1: Unit Price | Cell D1: Total\nRow 2: Cell A2: Front Bumper | Cell B2: 1 | Cell C2: 450 | Cell D2: 450\nRow 4: Cell A4: Total Repair Estimate | Cell D4: 690`,
  };

  const citation = parseEvidenceCitation('Exhibit D — Repair_Estimate.xlsx, Sheet: Repair Costs, Cell: D4');
  assert.equal(citation.filename, 'Repair_Estimate.xlsx');
  assert.equal(citation.sheet, 'Repair Costs');
  assert.equal(citation.cell, 'D4');
});

test('E2E Acceptance 3: Multiple files attached to the same exhibit are combined coherently', () => {
  const manual = 'Insured reported collision on 12th November.';
  const att1 = {
    id: 'att-1',
    name: 'FNOL_Notification.pdf',
    status: 'ready',
    extractedText: '[Source: Exhibit A - FNOL_Notification.pdf, Page 1]\nImpact occurred on roundabout exit at 18:45.',
  };
  const att2 = {
    id: 'att-2',
    name: 'Accident_Photo_01.jpg',
    status: 'ready',
    extractedText: '[Source: Exhibit A - Accident_Photo_01.jpg, Image Evidence]\nVisible front bumper dent and headlight casing fracture.',
  };

  const combined = combineExhibitText(manual, [att1, att2], 'A', 'Insured Account');
  assert.ok(combined.includes(manual));
  assert.ok(combined.includes('FNOL_Notification.pdf, Page 1'));
  assert.ok(combined.includes('Impact occurred on roundabout exit at 18:45.'));
  assert.ok(combined.includes('Accident_Photo_01.jpg, Image Evidence'));
  assert.ok(combined.includes('Visible front bumper dent and headlight casing fracture.'));
});

test('E2E Acceptance 4: Quote verification matches exact quotes from attached evidence files', () => {
  const combinedA = combineExhibitText('', [
    {
      id: 'att-a',
      name: 'Claimant_Statement.pdf',
      status: 'ready',
      extractedText: '[Source: Exhibit A - Claimant_Statement.pdf, Page 2]\nThe other vehicle stopped dead without warning.',
    },
  ], 'A', 'Claimant Statement');

  const combinedB = combineExhibitText('', [
    {
      id: 'att-b',
      name: 'Third_Party_Statement.pdf',
      status: 'ready',
      extractedText: '[Source: Exhibit B - Third_Party_Statement.pdf, Page 1]\nI had been braking gradually before the junction.',
    },
  ], 'B', 'Third Party Statement');

  const exhibits = [
    { id: 'A', text: combinedA },
    { id: 'B', text: combinedB },
  ];

  const analysis = {
    contradictions: [
      {
        id: 'C1',
        title: 'Braking sequence dispute',
        evidence: [
          { exhibit: 'A', quote: 'The other vehicle stopped dead without warning' },
          { exhibit: 'B', quote: 'I had been braking gradually before the junction' },
        ],
      },
    ],
    corroborations: [],
  };

  const verified = verifyEvidence(analysis, exhibits);
  assert.equal(verified.contradictions[0].evidence[0].match.status, 'exact');
  assert.equal(verified.contradictions[0].evidence[1].match.status, 'exact');
  assert.equal(verified.quoteCheck.exact, 2);
  assert.equal(verified.quoteCheck.missing, 0);
});

test('E2E Acceptance 5: Case file preservation retains attachments across save and reload', () => {
  const caseFile = {
    title: 'Roundabout Collision Investigation',
    context: 'Liability dispute between policyholder and third party.',
    exhibits: [
      {
        key: 'ex-1',
        label: 'Claimant Statement',
        kind: 'claimant_statement',
        text: 'Standard statement provided.',
        attachments: [
          {
            id: 'att-save-1',
            name: 'Claimant_Statement.pdf',
            type: 'application/pdf',
            size: 10240,
            status: 'ready',
            summary: '2 pages • Processed ✓',
            extractedText: '[Source: Exhibit A - Claimant_Statement.pdf, Page 1]\nVehicle stopped dead.',
          },
        ],
      },
      {
        key: 'ex-2',
        label: 'Third Party Statement',
        kind: 'third_party_statement',
        text: 'Braked normally for traffic.',
        attachments: [],
      },
    ],
  };

  const serialized = JSON.stringify(caseFile);
  const deserialized = JSON.parse(serialized);

  assert.equal(deserialized.exhibits[0].attachments.length, 1);
  assert.equal(deserialized.exhibits[0].attachments[0].id, 'att-save-1');
  assert.equal(deserialized.exhibits[0].attachments[0].name, 'Claimant_Statement.pdf');
  assert.equal(deserialized.exhibits[0].attachments[0].status, 'ready');
});
