import express from 'express';
import { db } from '../db/store.js';
import { AuditModel } from '../db/models.js';

export const subrogationRouter = express.Router();

/**
 * POST /api/subrogation/evaluate
 * Evaluates third-party recovery potential and drafts Section 152 / subrogation demand
 */
subrogationRouter.post('/evaluate', (req, res) => {
  const {
    investigationId,
    claimReference = 'CLM-2026-SUB',
    thirdPartyName = 'Third Party Driver',
    thirdPartyInsurer = 'Target Motor Insurance Co.',
    thirdPartyPolicy = 'TP-POL-9941',
    incidentDescription = '',
    insuredLiabilityPercentage = 0,
    repairCost = 4250,
    creditHireCost = 1200,
    towingAndStorage = 350,
    policyholderDeductible = 250,
    jurisdiction = 'UK',
  } = req.body || {};

  const tpFaultPercentage = Math.max(0, Math.min(100, 100 - Number(insuredLiabilityPercentage)));
  const grossClaimOutlay = Number(repairCost) + Number(creditHireCost) + Number(towingAndStorage);
  const netRecoverableAmount = Math.round(grossClaimOutlay * (tpFaultPercentage / 100));
  const deductibleRefundToInsured = Math.round(Number(policyholderDeductible) * (tpFaultPercentage / 100));

  let recoveryProspect = 'HIGH';
  if (tpFaultPercentage < 30) recoveryProspect = 'UNVIABLE';
  else if (tpFaultPercentage < 70) recoveryProspect = 'SPLIT_LIABILITY_MODERATE';

  // Statutory legal reference
  let statutoryBasis = 'Road Traffic Act 1988 s.151/152 (UK) — Statutory Third-Party Insurer Duty to Satisfy Judgments';
  if (jurisdiction === 'US') {
    statutoryBasis = 'State Tort Claims Act & Comparative Fault Rules — Equitable Subrogation Doctrine';
  } else if (jurisdiction === 'CA') {
    statutoryBasis = 'Insurance Act (Ontario) s.263 — Direct Compensation Property Damage & Indemnity Recovery';
  } else if (jurisdiction === 'AU') {
    statutoryBasis = 'Insurance Contracts Act 1984 (Cth) s.65 — Insurer Right of Subrogation';
  }

  // Draft official demand letter
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const statutoryNoticeLetter = `FORMAL NOTICE OF SUBROGATION CLAIM & RECOVERY DEMAND
Date: ${today}
To: ${thirdPartyInsurer} (Claims Recoveries Department)
Third Party Insured: ${thirdPartyName} | Policy Ref: ${thirdPartyPolicy}
Our Claim Reference: ${claimReference} | Incident Locus/Date: As per notice

STATUTORY BASIS OF RECOVERY:
${statutoryBasis}

STATEMENT OF SUBROGATED LOSSES:
1. Insured Vehicle Repairs: £${repairCost.toFixed(2)}
2. Necessary Replacement Vehicle (Credit Hire): £${creditHireCost.toFixed(2)}
3. Recovery, Storage & Assessment Disbursements: £${towingAndStorage.toFixed(2)}
------------------------------------------------------------
TOTAL OUTLAY INCURRED: £${grossClaimOutlay.toFixed(2)}
APPORTIONED THIRD-PARTY LIABILITY (${tpFaultPercentage}%): £${netRecoverableAmount.toFixed(2)}
INSURED UNINSURED LOSSES (Deductible Recovery): £${deductibleRefundToInsured.toFixed(2)}

LIABILITY RATIONALE:
${incidentDescription || 'Telematics and locus evidence confirm third-party vehicle failed to maintain safe stopping distance / failed to give way at intersection, precipitating collision.'}

Please confirm formal indemnity acceptance within 21 statutory business days and remit payment to avoid escalation to litigation proceedings.`;

  const subrogationRecord = {
    id: `sub-${Date.now()}`,
    investigationId: investigationId || 'INV-GLOBAL',
    claimReference,
    thirdPartyName,
    thirdPartyInsurer,
    thirdPartyPolicy,
    tpFaultPercentage,
    grossClaimOutlay,
    netRecoverableAmount,
    deductibleRefundToInsured,
    recoveryProspect,
    statutoryBasis,
    statutoryNoticeLetter,
    evaluatedAt: new Date().toISOString(),
  };

  db.save('subrogations', subrogationRecord);

  AuditModel.record({
    tenantId: 'tenant-faultline-primary',
    actorType: 'SYSTEM',
    actorId: 'subrogation-engine',
    action: 'SUBROGATION_EVALUATED',
    entityType: 'SUBROGATION_CASE',
    entityId: subrogationRecord.id,
    investigationId: subrogationRecord.investigationId,
    details: {
      netRecoverableAmount,
      tpFaultPercentage,
      recoveryProspect,
    },
  });

  res.json({
    ok: true,
    subrogation: subrogationRecord,
  });
});

/**
 * GET /api/subrogation/:investigationId
 */
subrogationRouter.get('/:investigationId', (req, res) => {
  const { investigationId } = req.params;
  const cases = db.find('subrogations', (s) => s.investigationId === investigationId);

  res.json({
    ok: true,
    subrogation: cases[0] || null,
  });
});
