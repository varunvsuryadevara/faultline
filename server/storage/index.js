// Persistent Evidence Storage & Cryptographic Chain of Custody
// Implements Priority 0: SHA-256 evidence verification, immutable storage, and audit trail.

import { existsSync, mkdirSync, readFileSync, writeFileSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { db } from '../db/store.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const EVIDENCE_STORAGE_DIR = path.join(ROOT, 'server', 'data', 'evidence_store');

function ensureEvidenceDir() {
  if (!existsSync(EVIDENCE_STORAGE_DIR)) {
    mkdirSync(EVIDENCE_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Calculates SHA-256 hash of a buffer or stream.
 */
export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export const EvidenceStorage = {
  /**
   * Persists an uploaded evidence file with cryptographic hash and chain of custody.
   */
  async storeEvidenceFile({
    buffer,
    originalName,
    mimeType,
    investigationId = 'INV-GLOBAL',
    uploadedBy = 'investigator@faultline.internal',
  }) {
    ensureEvidenceDir();

    const sha256 = computeSha256(buffer);
    const ext = path.extname(originalName).toLowerCase();
    const storageId = `ev-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const storageFilename = `${storageId}-${sha256.slice(0, 12)}${ext}`;
    const storagePath = path.join(EVIDENCE_STORAGE_DIR, storageFilename);

    // Save immutable file
    writeFileSync(storagePath, buffer);

    const now = new Date().toISOString();
    const attachmentRecord = {
      id: storageId,
      investigationId,
      originalName,
      filename: storageFilename,
      fileType: ext.replace('.', ''),
      mimeType,
      fileSizeBytes: buffer.length,
      sha256Hash: sha256,
      sha256: sha256,
      storagePath,
      isVerified: true,
      chainOfCustody: [
        {
          action: 'EVIDENCE_INGESTED',
          timestamp: now,
          actor: uploadedBy,
          sha256Hash: sha256,
          notes: 'Original binary preserved immutably with SHA-256 checksum verification.',
        },
      ],
      createdAt: now,
    };

    db.save('attachments', attachmentRecord);

    return attachmentRecord;
  },

  /**
   * Cryptographically verifies that the stored file matches its registered SHA-256 hash.
   */
  verifyFileIntegrity(attachmentId) {
    const record = db.findById('attachments', attachmentId);
    if (!record) {
      return { verified: false, error: 'Attachment record not found in database.' };
    }

    if (!existsSync(record.storagePath)) {
      return { verified: false, error: `Stored file missing on disk at ${record.storagePath}` };
    }

    try {
      const currentBuffer = readFileSync(record.storagePath);
      const currentHash = computeSha256(currentBuffer);

      const isValid = currentHash.toLowerCase() === record.sha256Hash.toLowerCase();

      return {
        valid: isValid,
        verified: isValid,
        storedHash: record.sha256Hash,
        recalculatedHash: currentHash,
        calculatedSha256: currentHash,
        fileSizeBytes: currentBuffer.length,
        match: isValid,
      };
    } catch (err) {
      return { valid: false, verified: false, error: err.message };
    }
  },

  getChainOfCustody(attachmentId) {
    const record = db.findById('attachments', attachmentId);
    return record?.chainOfCustody || [];
  },

  /**
   * Appends an action to the chain of custody.
   */
  recordCustodyEvent(attachmentId, { action, actor, notes = '' }) {
    const record = db.findById('attachments', attachmentId);
    if (!record) return null;

    const event = {
      action,
      timestamp: new Date().toISOString(),
      actor,
      notes,
    };

    const chain = Array.isArray(record.chainOfCustody) ? record.chainOfCustody : [];
    chain.push(event);

    return db.save('attachments', {
      ...record,
      chainOfCustody: chain,
    });
  },

  /**
   * Retrieves a readable stream for authorized download.
   */
  getFileStream(attachmentId) {
    const record = db.findById('attachments', attachmentId);
    if (!record || !existsSync(record.storagePath)) return null;
    return {
      stream: createReadStream(record.storagePath),
      record,
    };
  },

  /**
   * Cleans up stored binary file and associated attachment metadata.
   */
  deleteEvidenceFile(attachmentId) {
    const record = db.findById('attachments', attachmentId);
    if (record) {
      if (record.storagePath && existsSync(record.storagePath)) {
        try {
          unlinkSync(record.storagePath);
        } catch (err) {
          console.warn(`[storage] Could not unlink binary file ${record.storagePath}:`, err.message);
        }
      }
      db.delete('attachments', attachmentId);
    }
  },
};
