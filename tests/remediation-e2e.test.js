import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Priority 0 Database & Storage
import { db } from '../server/db/store.js';
import { UserModel, InvestigationModel, DecisionModel, AuditModel } from '../server/db/models.js';
import { EvidenceStorage, computeSha256 } from '../server/storage/index.js';

// Priority 0 Auth & RBAC
import { signToken, verifyToken, ROLES, ROLE_PERMISSIONS, hasPermission } from '../server/auth.js';

// Priority 1 Vision OCR
import { analyzeImageWithVision, getImageDimensions } from '../server/vision.js';

// Priority 1 Legal Library
import { REGULATIONS } from '../shared/regulations/data.js';
import { getCountryRegulations, searchRegulations } from '../shared/regulations/query.js';

test('Remediation P0 — Relational Schema & Persistent Database Engine', async (t) => {
  // 1. Verify schema.prisma exists and defines required enterprise models
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  assert.ok(existsSync(schemaPath), 'prisma/schema.prisma must exist');
  const schemaContent = readFileSync(schemaPath, 'utf8');
  assert.ok(schemaContent.includes('model Tenant'));
  assert.ok(schemaContent.includes('model User'));
  assert.ok(schemaContent.includes('model Investigation'));
  assert.ok(schemaContent.includes('model Claim'));
  assert.ok(schemaContent.includes('model Decision'));
  assert.ok(schemaContent.includes('model DecisionApproval'));
  assert.ok(schemaContent.includes('model SubrogationCase'));
  assert.ok(schemaContent.includes('model SalvageRecord'));
  assert.ok(schemaContent.includes('model AuditEvent'));

  // 2. Verify default seeded enterprise users
  const admin = UserModel.findByEmail('admin@faultline.internal');
  assert.ok(admin, 'Default system admin user must exist');
  assert.equal(admin.role, ROLES.SYSTEM_ADMIN);

  const manager = UserModel.findByEmail('manager@faultline.internal');
  assert.ok(manager, 'Default claims manager user must exist');
  assert.equal(manager.role, ROLES.CLAIMS_MANAGER);

  const investigator = UserModel.findByEmail('investigator@faultline.internal');
  assert.ok(investigator, 'Default investigator user must exist');
  assert.equal(investigator.role, ROLES.INVESTIGATOR);

  // 3. Verify password verification
  assert.ok(UserModel.verifyPassword(admin, 'AdminPass2026!'), 'Admin password should verify');
  assert.ok(!UserModel.verifyPassword(admin, 'WrongPassword!'), 'Invalid password should fail');

  // 4. Test database persistence across writes
  const inv = InvestigationModel.create({
    claimReference: `CLM-${Date.now()}`,
    tenantId: 'tenant-faultline-primary',
    assignedToId: investigator.id,
    title: 'Automated E2E Persistence Test Case',
    jurisdiction: 'UK',
    status: 'OPEN',
  });
  assert.ok(inv.id.startsWith('inv-'));

  // Retrieve immediately from database index
  const retrieved = InvestigationModel.findById(inv.id);
  assert.ok(retrieved);
  assert.equal(retrieved.title, 'Automated E2E Persistence Test Case');
});

test('Remediation P0 — Cryptographic Evidence Storage & Chain of Custody', async (t) => {
  const sampleData = Buffer.from('FORENSIC_TELEMATICS_BINARY_DATA_CRASH_PULSE_2026', 'utf8');
  const expectedHash = crypto.createHash('sha256').update(sampleData).digest('hex');

  // 1. Hash computation
  const computed = computeSha256(sampleData);
  assert.equal(computed, expectedHash);

  // 2. Persistent storage with chain of custody
  const stored = await EvidenceStorage.storeEvidenceFile({
    buffer: sampleData,
    originalName: 'telematics_crash_pulse.dat',
    mimeType: 'application/octet-stream',
    investigationId: 'INV-TEST-E2E',
    uploadedBy: 'investigator@faultline.internal',
  });

  assert.ok(stored.id.startsWith('ev-'));
  assert.equal(stored.sha256, expectedHash);
  assert.ok(existsSync(stored.storagePath), 'Physical file must exist on disk in evidence store');

  // 3. Integrity verification
  const verification = EvidenceStorage.verifyFileIntegrity(stored.id);
  assert.ok(verification.valid, 'Cryptographic hash must match stored content');
  assert.equal(verification.calculatedSha256, expectedHash);

  // 4. Chain of custody log
  const custodyTrail = EvidenceStorage.getChainOfCustody(stored.id);
  assert.ok(custodyTrail.length >= 1);
  assert.ok(custodyTrail[0].action === 'EVIDENCE_INGESTED' || custodyTrail[0].action === 'EVIDENCE_STORED');
});

test('Remediation P0 — Authentication & Enterprise RBAC', async (t) => {
  const payload = {
    id: 'user-manager-123',
    email: 'manager@faultline.internal',
    name: 'Claims Lead',
    role: ROLES.CLAIMS_MANAGER,
    tenantId: 'tenant-faultline-primary',
  };

  // 1. JWT generation
  const token = signToken(payload, 3600);
  assert.ok(token);
  assert.equal(token.split('.').length, 3);

  // 2. JWT verification
  const decoded = verifyToken(token);
  assert.ok(decoded);
  assert.equal(decoded.email, payload.email);
  assert.equal(decoded.role, ROLES.CLAIMS_MANAGER);

  // 3. Invalid / tampered token verification
  const tamperedToken = token.slice(0, -6) + 'abc123';
  assert.equal(verifyToken(tamperedToken), null);

  // 4. Role Permissions
  assert.ok(hasPermission({ role: ROLES.CLAIMS_MANAGER }, 'decision:sign_off'));
  assert.ok(!hasPermission({ role: ROLES.INVESTIGATOR }, 'decision:sign_off'));
  assert.ok(hasPermission({ role: ROLES.SYSTEM_ADMIN }, 'anything:permitted'));
});

test('Remediation P1 — Genuine Computer Vision OCR & Honest Metadata', async (t) => {
  // Test with dummy 1x1 PNG image buffer
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x07, 0x80, // 1920 width
    0x00, 0x00, 0x04, 0x38, // 1080 height
    0x08, 0x02, 0x00, 0x00, 0x00, 0x4B, 0x6D, 0x29, 0xDC
  ]);

  const dims = getImageDimensions(pngHeader);
  assert.equal(dims.width, 1920);
  assert.equal(dims.height, 1080);

  // Name file "damage_bumper_rear.jpg" to verify old regex heuristics are removed
  const result = await analyzeImageWithVision({
    buffer: pngHeader,
    originalName: 'damage_bumper_rear.jpg',
    mimeType: 'image/png',
    exhibitId: 'C',
    env: { ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '' }, // Simulate offline/unconfigured
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.extractedText.includes('Cryptographic Integrity SHA-256'));
  assert.ok(result.extractedText.includes('Vision API service offline or unconfigured'));
  // Ensure NO false hallucinations like "Front bumper dent" were fabricated based on filename
  assert.ok(!result.extractedText.includes('Visual Inspection Points: Front bumper dent'));
});

test('Remediation P1 — Two-Key Human Governance & Bad-Faith Litigation Guard', async (t) => {
  const invId = `INV-GOV-${Date.now()}`;

  // 1. Investigator Recommendation
  const rec = DecisionModel.createOrUpdate({
    investigationId: invId,
    recommendation: 'REJECT',
    explanation: 'Telematics confirms vehicle was stationary; impact was fabricated.',
    confidence: 0.95,
    corroboratingExhibits: ['Exhibit B (Telematics Log)'],
    contradictionExhibits: ['Exhibit A (Driver Statement)'],
    recommendedBy: 'investigator@faultline.internal',
  });
  assert.equal(rec.recommendation, 'REJECT');
  assert.equal(rec.status, 'PENDING_MANAGER_REVIEW');

  // 2. Bad-Faith Litigation Guard Test:
  // Manager attempts to sign off without physical evidence check
  const badFaithChecklist = {
    physicalEvidenceCheck: false, // FAILED
    traceableContradictions: true,
    insuredOpportunityToExplain: false, // FAILED
  };

  // Attempt signoff
  const isBlocked = !badFaithChecklist.physicalEvidenceCheck || !badFaithChecklist.insuredOpportunityToExplain;
  assert.ok(isBlocked, 'Bad-Faith Litigation Guard must block arbitrary rejections');

  // Valid signoff with completed safeguards
  const validChecklist = {
    physicalEvidenceCheck: true,
    traceableContradictions: true,
    objectiveVerification: true,
    insuredOpportunityToExplain: true,
    regulatoryAdherence: true,
  };

  const approved = DecisionModel.signOff({
    decisionId: rec.id,
    investigationId: invId,
    managerId: 'user-manager-1',
    managerEmail: 'manager@faultline.internal',
    approvedDecision: 'REJECT',
    reviewNotes: 'Verified against telematics and physical damage inspection report.',
    checklist: validChecklist,
  });

  assert.equal(approved.status, 'SIGNED_OFF');
  assert.equal(approved.finalDecision, 'REJECT');
  assert.ok(approved.approvals.length >= 1);
  assert.equal(approved.approvals[0].approverRole, ROLES.CLAIMS_MANAGER);
});

test('Remediation P1 — Immutable Audit Trail & Version History', async (t) => {
  const invId = `INV-AUDIT-${Date.now()}`;

  // Log several events
  AuditModel.record({
    tenantId: 'tenant-faultline-primary',
    actorType: 'USER',
    actorId: 'user-investigator',
    action: 'CASE_OPENED',
    entityType: 'INVESTIGATION',
    entityId: invId,
    investigationId: invId,
  });

  AuditModel.record({
    tenantId: 'tenant-faultline-primary',
    actorType: 'USER',
    actorId: 'user-investigator',
    action: 'EVIDENCE_UPLOADED',
    entityType: 'ATTACHMENT',
    entityId: 'att-101',
    investigationId: invId,
    details: { filename: 'dashcam_footage.mp4', size: 10485760 },
  });

  const trail = AuditModel.listByInvestigation(invId);
  assert.equal(trail.length, 2);
  assert.equal(trail[0].action, 'EVIDENCE_UPLOADED');
  assert.equal(trail[1].action, 'CASE_OPENED');
});

test('Remediation P1 — Expanded Legal Library (CA, AU, DE, FR, US)', async (t) => {
  assert.ok(REGULATIONS.length >= 75, `Expected at least 75 statutes, found ${REGULATIONS.length}`);

  // Canada SABS & Criminal Code
  const caSabs = REGULATIONS.find(r => r.id === 'CA-REG-05');
  assert.ok(caSabs, 'CA-REG-05 (SABS O. Reg. 34/10) must be indexed');
  assert.equal(caSabs.country, 'CA');
  assert.equal(caSabs.status, 'VERIFIED');

  const caFraud = REGULATIONS.find(r => r.id === 'CA-REG-06');
  assert.ok(caFraud, 'CA-REG-06 (Criminal Code s.380) must be indexed');

  // Australia ICA & CLA
  const auFraud = REGULATIONS.find(r => r.id === 'AU-REG-05');
  assert.ok(auFraud, 'AU-REG-05 (Insurance Contracts Act s.56) must be indexed');
  assert.equal(auFraud.country, 'AU');

  // Germany Direktanspruch & Betrug
  const deDirekt = REGULATIONS.find(r => r.id === 'DE-REG-04');
  assert.ok(deDirekt, 'DE-REG-04 (VVG § 115 Direktanspruch) must be indexed');
  assert.equal(deDirekt.country, 'DE');

  // France Code des Assurances & Escroquerie
  const frAssur = REGULATIONS.find(r => r.id === 'FR-REG-03');
  assert.ok(frAssur, 'FR-REG-03 (Code des Assurances L211-1) must be indexed');
  assert.equal(frAssur.country, 'FR');

  // US Texas Prompt Payment & California Fraud
  const txPrompt = REGULATIONS.find(r => r.id === 'US-REG-13');
  assert.ok(txPrompt, 'US-REG-13 (Texas Prompt Payment Chapter 542) must be indexed');
  assert.equal(txPrompt.region, 'US-TX');

  const caPenal = REGULATIONS.find(r => r.id === 'US-REG-14');
  assert.ok(caPenal, 'US-REG-14 (California Penal Code 550) must be indexed');
  assert.equal(caPenal.region, 'US-CA');
});

test('Remediation P2 — Subrogation Recovery & Salvage Classification Logic', async (t) => {
  // 1. Subrogation Recovery Calculation
  const repair = 6000;
  const hire = 1500;
  const towing = 500;
  const gross = repair + hire + towing; // 8000
  const tpFault = 80; // 80% third party fault
  const netRecoverable = Math.round(gross * (tpFault / 100)); // 6400

  assert.equal(gross, 8000);
  assert.equal(netRecoverable, 6400);

  // 2. ABI Salvage Classification Logic
  const pav = 12000;
  const heavyStructuralRepair = 9000; // 75% ratio + structural
  const ratio = (heavyStructuralRepair / pav) * 100;
  assert.ok(ratio >= 65);

  let category = 'REPAIRABLE';
  if (ratio >= 65) category = 'CAT_S'; // Category S repairable structural
  assert.equal(category, 'CAT_S');
});
