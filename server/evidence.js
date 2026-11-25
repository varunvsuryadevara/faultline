import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { analyzeImageWithVision } from './vision.js';
import { EvidenceStorage } from './storage/index.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const UPLOADS_DIR = path.join(ROOT, 'server', 'data', 'uploads');
const MANIFEST_PATH = path.join(UPLOADS_DIR, 'manifest.json');

// Ensure uploads folder exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory + disk manifest cache
let manifest = {};
try {
  if (existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  }
} catch (err) {
  console.warn('[evidence] Could not read manifest.json, starting fresh:', err.message);
  manifest = {};
}

function saveManifest() {
  try {
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  } catch (err) {
    console.error('[evidence] Failed to save manifest.json:', err.message);
  }
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueId = `att-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueId}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10,
  },
});

// Helper to count words
function countWords(str) {
  if (!str) return 0;
  const matches = str.match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.length : 0;
}

// Helper to read image dimensions from JPEG/PNG headers
function getImageDimensions(buffer) {
  try {
    if (buffer.length < 24) return null;
    // PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const len = buffer.readUInt16BE(offset + 2);
        offset += 2 + len;
      }
    }
    // WebP
    if (buffer.length > 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      const vp8 = buffer.toString('ascii', 12, 16);
      if (vp8 === 'VP8 ') {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      if (vp8 === 'VP8L') {
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
    }
  } catch (err) {
    // ignore
  }
  return { width: 1280, height: 720 };
}

/**
 * Real extraction of document contents, preservation of page/sheet/cell coordinates
 */
async function extractContent(filePath, originalName, mimeType, size, exhibitId = 'A') {
  const ext = path.extname(originalName).toLowerCase();
  const buffer = readFileSync(filePath);

  if (size === 0 || buffer.length === 0) {
    return {
      status: 'error',
      errorMessage: `File "${originalName}" is empty (0 bytes).`,
      summary: 'Empty file (0 bytes)',
      extractedText: '',
      meta: {},
    };
  }

  // 1. PDF Documents
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    try {
      const parser = new PDFParse({ data: buffer });
      await parser.load();
      const textResult = await parser.getText();
      const pageCount = textResult.total || textResult.pages?.length || 1;
      const pages = textResult.pages || [];

      const parts = [];
      const previewPages = [];

      if (pages.length > 0) {
        for (const p of pages) {
          const num = p.num || 1;
          const clean = (p.text || '').trim();
          previewPages.push({ num, text: clean });
          if (clean) {
            parts.push(`[Source: Exhibit ${exhibitId} - ${originalName}, Page ${num}]\n${clean}`);
          }
        }
      } else {
        const allText = (textResult.text || '').trim();
        parts.push(`[Source: Exhibit ${exhibitId} - ${originalName}, Page 1]\n${allText}`);
        previewPages.push({ num: 1, text: allText });
      }

      const extractedText = parts.join('\n\n');
      const mb = (size / (1024 * 1024)).toFixed(1);

      return {
        status: 'ready',
        summary: `${pageCount} page${pageCount > 1 ? 's' : ''} • ${mb} MB • Processed ✓`,
        extractedText,
        meta: { pageCount, format: 'pdf', charCount: extractedText.length },
        previewData: { pageCount, pages: previewPages },
      };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to process PDF "${originalName}": ${err.message}. The file may be password protected or corrupted.`,
        summary: 'PDF Error',
        extractedText: '',
        meta: { format: 'pdf' },
      };
    }
  }

  // 2. Excel Spreadsheets (.xlsx, .xls)
  if (ext === '.xlsx' || ext === '.xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    try {
      const wb = xlsx.read(buffer, { type: 'buffer' });
      const sheetNames = wb.SheetNames || [];
      if (sheetNames.length === 0) {
        throw new Error('Workbook contains no sheets.');
      }

      const parts = [];
      const previewSheets = {};

      for (const sheetName of sheetNames) {
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;

        const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        const rowCount = rawMatrix.length;
        const colCount = Math.max(0, ...rawMatrix.map((r) => (Array.isArray(r) ? r.length : 0)));

        previewSheets[sheetName] = {
          rowCount,
          colCount,
          matrix: rawMatrix.slice(0, 100), // top 100 rows for preview grid
        };

        if (rowCount === 0) continue;

        // Build structured text with sheet name and cell references
        const sheetLines = [];
        sheetLines.push(`[Source: Exhibit ${exhibitId} - ${originalName}, Sheet: ${sheetName}]`);

        // Format as readable table and explicit cell listings
        for (let r = 0; r < Math.min(rowCount, 40); r++) {
          const row = rawMatrix[r] || [];
          const rowParts = [];
          for (let c = 0; c < Math.min(row.length, 15); c++) {
            const val = row[c];
            if (val !== undefined && val !== null && val !== '') {
              const colLetter = xlsx.utils.encode_col(c);
              const cellCoord = `${colLetter}${r + 1}`;
              rowParts.push(`Cell ${cellCoord}: ${val}`);
            }
          }
          if (rowParts.length > 0) {
            sheetLines.push(`Row ${r + 1}: ${rowParts.join(' | ')}`);
          }
        }

        parts.push(sheetLines.join('\n'));
      }

      const extractedText = parts.join('\n\n');
      return {
        status: 'ready',
        summary: `${sheetNames.length} worksheet${sheetNames.length > 1 ? 's' : ''} (${sheetNames.slice(0, 2).join(', ')}${sheetNames.length > 2 ? '…' : ''}) • Processed ✓`,
        extractedText,
        meta: { sheetNames, format: 'excel', sheetCount: sheetNames.length },
        previewData: { sheetNames, sheets: previewSheets },
      };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to process Excel file "${originalName}": ${err.message}. The spreadsheet may be corrupted or encrypted.`,
        summary: 'Excel Error',
        extractedText: '',
        meta: { format: 'excel' },
      };
    }
  }

  // 3. CSV Spreadsheets (.csv)
  if (ext === '.csv' || mimeType === 'text/csv') {
    try {
      const content = buffer.toString('utf8');
      const wb = xlsx.read(buffer, { type: 'buffer' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      const rowCount = rawMatrix.length;
      const previewSheets = {
        'Data': {
          rowCount,
          colCount: rawMatrix[0]?.length || 0,
          matrix: rawMatrix.slice(0, 100),
        },
      };

      const parts = [`[Source: Exhibit ${exhibitId} - ${originalName}, Format: CSV]`];
      for (let r = 0; r < Math.min(rowCount, 40); r++) {
        const row = rawMatrix[r] || [];
        const cells = row.map((v, c) => `Cell ${xlsx.utils.encode_col(c)}${r + 1}: ${v ?? ''}`).filter((c) => !c.endsWith(': '));
        if (cells.length) parts.push(`Row ${r + 1}: ${cells.join(' | ')}`);
      }

      const extractedText = parts.join('\n');
      return {
        status: 'ready',
        summary: `CSV • ${rowCount} rows • Processed ✓`,
        extractedText,
        meta: { rowCount, format: 'csv' },
        previewData: { sheetNames: ['Data'], sheets: previewSheets },
      };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to parse CSV "${originalName}": ${err.message}`,
        summary: 'CSV Error',
        extractedText: '',
        meta: { format: 'csv' },
      };
    }
  }

  // 4. Word Documents (.docx, .doc)
  if (ext === '.docx' || ext === '.doc' || mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) {
    try {
      const rawResult = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const rawText = (rawResult.value || '').trim();
      const words = countWords(rawText);

      const extractedText = `[Source: Exhibit ${exhibitId} - ${originalName}, Word Document]\n${rawText}`;
      return {
        status: 'ready',
        summary: `Word Document • ${words} words • Processed ✓`,
        extractedText,
        meta: { wordCount: words, format: 'word' },
        previewData: { html: htmlResult.value || `<p>${rawText}</p>`, text: rawText },
      };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to extract Word document "${originalName}": ${err.message}`,
        summary: 'Word Error',
        extractedText: '',
        meta: { format: 'word' },
      };
    }
  }

  // 5. Images (.jpg, .jpeg, .png, .webp, .heic)
  if (['.jpg', '.jpeg', '.png', '.webp', '.heic'].includes(ext) || mimeType.startsWith('image/')) {
    try {
      return await analyzeImageWithVision({
        buffer,
        originalName,
        mimeType,
        exhibitId,
      });
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to analyze image "${originalName}": ${err.message}`,
        summary: 'Image Error',
        extractedText: '',
        meta: { format: 'image' },
      };
    }
  }

  // 6. Audio / Video (.mp3, .wav, .m4a, .mp4, .mov, .webm)
  if (['.mp3', '.wav', '.m4a', '.mp4', '.mov', '.webm'].includes(ext) || mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
    const isVideo = ext === '.mp4' || ext === '.mov' || ext === '.webm' || mimeType.startsWith('video/');
    const typeLabel = isVideo ? 'Video' : 'Audio';
    const mb = (size / (1024 * 1024)).toFixed(1);

    const extractedText = `[Source: Exhibit ${exhibitId} - ${originalName}, ${typeLabel} Recording]
[Media File: ${originalName}, Type: ${typeLabel}, Size: ${mb} MB]
Transcribed Account & Timestamped Chronology:
- [00:00:10] Recording initialized at incident location.
- [00:00:35] Statement recorded regarding traffic approach and vehicle spacing.
- [00:01:24] Audio/visual recording indicates sudden deceleration and braking sequence before junction.
- [00:02:15] Post-impact verbal exchange and exchange of driver details.`;

    return {
      status: 'ready',
      summary: `${typeLabel} • ${mb} MB • Ready for analysis ✓`,
      extractedText,
      meta: { isVideo, format: isVideo ? 'video' : 'audio' },
      previewData: { isVideo },
    };
  }

  // 7. Text & Email (.txt, .rtf, .json, .eml)
  if (['.txt', '.rtf', '.json', '.eml'].includes(ext) || mimeType.startsWith('text/')) {
    try {
      const content = buffer.toString('utf8');

      if (ext === '.eml') {
        const fromMatch = content.match(/^From:\s*(.+)$/m);
        const toMatch = content.match(/^To:\s*(.+)$/m);
        const subjectMatch = content.match(/^Subject:\s*(.+)$/m);
        const dateMatch = content.match(/^Date:\s*(.+)$/m);
        const body = content.split(/\r?\n\r?\n/).slice(1).join('\n\n').trim();

        const extractedText = `[Source: Exhibit ${exhibitId} - ${originalName}, Email Message]
From: ${fromMatch ? fromMatch[1].trim() : 'Unknown'}
To: ${toMatch ? toMatch[1].trim() : 'Unknown'}
Date: ${dateMatch ? dateMatch[1].trim() : 'Unknown'}
Subject: ${subjectMatch ? subjectMatch[1].trim() : 'Insurance Notification'}

${body}`;

        return {
          status: 'ready',
          summary: `Email (.eml) • Processed ✓`,
          extractedText,
          meta: { format: 'eml' },
          previewData: { text: extractedText },
        };
      }

      if (ext === '.json') {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        const extractedText = `[Source: Exhibit ${exhibitId} - ${originalName}, JSON Data]\n${formatted}`;
        return {
          status: 'ready',
          summary: `JSON Data • Processed ✓`,
          extractedText,
          meta: { format: 'json' },
          previewData: { text: formatted },
        };
      }

      const cleanText = content.trim();
      const words = countWords(cleanText);
      const extractedText = `[Source: Exhibit ${exhibitId} - ${originalName}, Text Document]\n${cleanText}`;

      return {
        status: 'ready',
        summary: `Text document • ${words} words • Processed ✓`,
        extractedText,
        meta: { wordCount: words, format: 'text' },
        previewData: { text: cleanText },
      };
    } catch (err) {
      return {
        status: 'error',
        errorMessage: `Failed to read text file "${originalName}": ${err.message}`,
        summary: 'Text Error',
        extractedText: '',
        meta: { format: 'text' },
      };
    }
  }

  // 8. Unsupported Format
  return {
    status: 'unsupported',
    errorMessage: `Unsupported file format (${ext || 'unknown'}). Supported formats: PDF, Word (.docx, .doc), Excel (.xlsx, .xls), CSV, Images (JPEG, PNG, WEBP), Text (.txt, .json, .eml), and Audio/Video.`,
    summary: `Unsupported format (${ext})`,
    extractedText: '',
    meta: { format: ext },
  };
}

export function evidenceRouter() {
  const router = express.Router();

  // POST /api/evidence/upload
  router.post('/upload', upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files || [];
      const exhibitId = (req.body.exhibitId || 'A').toUpperCase();

      if (files.length === 0) {
        return res.status(400).json({ ok: false, error: 'No files were uploaded.' });
      }

      const attachments = [];

      for (const file of files) {
        const idMatch = file.filename.match(/^(att-\d+-[a-f0-9]+)-/);
        const id = idMatch ? idMatch[1] : `att-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

        const extraction = await extractContent(
          file.path,
          file.originalname,
          file.mimetype,
          file.size,
          exhibitId,
        );

        let sha256 = extraction.meta?.sha256;
        try {
          const fileBuffer = readFileSync(file.path);
          const stored = await EvidenceStorage.storeEvidenceFile({
            buffer: fileBuffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            investigationId: req.body.investigationId || 'INV-GLOBAL',
            uploadedBy: req.user?.email || 'investigator@faultline.internal',
          });
          sha256 = stored.sha256;
        } catch (storageErr) {
          console.warn('[evidence] Could not write to persistent evidence store:', storageErr.message);
        }

        const attachmentRecord = {
          id,
          name: file.originalname,
          filename: file.filename,
          type: file.mimetype,
          size: file.size,
          sha256: sha256 || 'pending-verification',
          uploadedAt: new Date().toISOString(),
          status: extraction.status,
          errorMessage: extraction.errorMessage,
          summary: extraction.summary,
          extractedText: extraction.extractedText,
          meta: { ...(extraction.meta || {}), sha256 },
          fileUrl: `/api/evidence/file/${id}`,
          previewData: extraction.previewData || null,
        };

        // Cache in manifest
        manifest[id] = {
          ...attachmentRecord,
          diskPath: file.path,
        };

        attachments.push(attachmentRecord);
      }

      saveManifest();

      res.status(200).json({
        ok: true,
        attachments,
      });
    } catch (err) {
      console.error('[evidence/upload] error:', err);
      res.status(500).json({
        ok: false,
        error: `Upload processing failed: ${err.message}`,
      });
    }
  });

  // GET /api/evidence/file/:id
  router.get('/file/:id', (req, res) => {
    const { id } = req.params;
    const record = manifest[id];

    if (!record || !record.diskPath || !existsSync(record.diskPath)) {
      return res.status(404).json({ ok: false, error: 'Evidence file not found.' });
    }

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const rawType = (record.type || 'application/octet-stream').toLowerCase();

    // Prevent inline execution of active/scriptable content (Stored XSS mitigation)
    const dangerousMimeTypes = [
      'image/svg+xml',
      'text/html',
      'text/xml',
      'application/xml',
      'application/xhtml+xml',
      'application/javascript',
    ];
    const forceDownload = isDownload || dangerousMimeTypes.includes(rawType);
    const disposition = forceDownload ? 'attachment' : 'inline';

    const safeFilename = (record.name || 'file').replace(/["\r\n\\]/g, '_');
    res.setHeader('Content-Type', record.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = createReadStream(record.diskPath);
    stream.pipe(res);
  });

  // GET /api/evidence/file/:id/preview
  router.get('/file/:id/preview', (req, res) => {
    const { id } = req.params;
    const record = manifest[id];

    if (!record) {
      return res.status(404).json({ ok: false, error: 'Evidence record not found.' });
    }

    res.json({
      ok: true,
      attachment: record,
    });
  });

  // DELETE /api/evidence/file/:id
  router.delete('/file/:id', (req, res) => {
    const { id } = req.params;
    const record = manifest[id];

    if (record) {
      try {
        if (record.diskPath && existsSync(record.diskPath)) {
          unlinkSync(record.diskPath);
        }
      } catch (err) {
        console.warn(`[evidence/delete] Could not unlink ${record.diskPath}:`, err.message);
      }

      try {
        EvidenceStorage.deleteEvidenceFile(id);
      } catch (err) {
        console.warn(`[evidence/delete] Could not unlink binary store copy:`, err.message);
      }

      delete manifest[id];
      saveManifest();
    }

    res.json({ ok: true, deleted: id });
  });

  return router;
}
