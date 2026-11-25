import express from 'express';
import { db } from '../db/store.js';
import { AuditModel } from '../db/models.js';

export const salvageRouter = express.Router();

/**
 * POST /api/salvage/classify
 * Evaluates vehicle total-loss criteria and categorizes salvage according to ABI / International standards
 */
salvageRouter.post('/classify', (req, res) => {
  const {
    investigationId,
    claimReference = 'CLM-2026-SALV',
    vehicleMake = 'Volkswagen',
    vehicleModel = 'Golf 2.0 TDI',
    vehicleYear = 2021,
    vehicleRegistration = 'VK21 XYZ',
    preAccidentValue = 14500,
    estimatedRepairCost = 11200,
    structuralDamageFlag = true,
    chassisFrameDistortion = false,
    fireImmersionDestruction = false,
    airbagsDeployed = true,
    marketStandard = 'ABI_UK', // 'ABI_UK' | 'US_TLF'
  } = req.body || {};

  const pav = Number(preAccidentValue) || 10000;
  const repair = Number(estimatedRepairCost) || 0;
  const repairRatio = (repair / pav) * 100;

  // Determine ABI Salvage Category (UK Standard)
  let abiCategory = 'REPAIRABLE';
  let categoryName = 'Economically Repairable';
  let categoryDescription = 'Vehicle damage is below total-loss threshold and can be safely repaired.';
  let isTotalLoss = false;
  let salvageRecoveryRate = 0.50; // default estimated recovery

  if (fireImmersionDestruction) {
    isTotalLoss = true;
    abiCategory = 'CAT_A';
    categoryName = 'Category A: Scrap Only';
    categoryDescription = 'Total burnout or severe structural immolation. Vehicle must never be returned to road. Certificate of destruction mandatory.';
    salvageRecoveryRate = 0.05; // 5% scrap metal value
  } else if (structuralDamageFlag && chassisFrameDistortion && repairRatio > 80) {
    isTotalLoss = true;
    abiCategory = 'CAT_B';
    categoryName = 'Category B: Break for Parts Only';
    categoryDescription = 'Structural chassis destroyed beyond safe repair. Usable parts may be salvaged, but body shell must be crushed.';
    salvageRecoveryRate = 0.18; // ~18% parts recovery
  } else if (structuralDamageFlag && repairRatio >= 65) {
    isTotalLoss = true;
    abiCategory = 'CAT_S';
    categoryName = 'Category S: Repairable Structural';
    categoryDescription = 'Sustained structural frame or chassis damage. Repair exceeds economic limit but vehicle can legally return to road if professionally aligned and recertified.';
    salvageRecoveryRate = 0.35; // ~35% salvage auction value
  } else if (!structuralDamageFlag && repairRatio >= 70) {
    isTotalLoss = true;
    abiCategory = 'CAT_N';
    categoryName = 'Category N: Repairable Non-Structural';
    categoryDescription = 'Sustained cosmetic, mechanical, or electrical write-off damage with no structural frame compromise.';
    salvageRecoveryRate = 0.52; // ~52% light salvage auction
  } else if (repairRatio >= 70) {
    isTotalLoss = true;
    abiCategory = 'CAT_S';
    categoryName = 'Category S: Repairable Structural';
    categoryDescription = 'Repair cost exceeds 70% threshold; classified as structural total-loss under insurer guidelines.';
    salvageRecoveryRate = 0.35;
  }

  const estimatedSalvageValue = Math.round(pav * salvageRecoveryRate);
  const netWriteOffCost = isTotalLoss ? Math.max(0, pav - estimatedSalvageValue) : repair;

  const salvageRecord = {
    id: `salv-${Date.now()}`,
    investigationId: investigationId || 'INV-GLOBAL',
    claimReference,
    vehicle: {
      make: vehicleMake,
      model: vehicleModel,
      year: vehicleYear,
      registration: vehicleRegistration,
    },
    economics: {
      preAccidentValue: pav,
      estimatedRepairCost: repair,
      repairRatio: `${repairRatio.toFixed(1)}%`,
      isTotalLoss,
      estimatedSalvageValue,
      netWriteOffCost,
    },
    salvageCategory: {
      code: abiCategory,
      title: categoryName,
      description: categoryDescription,
      regulatoryStandard: 'Association of British Insurers (ABI) Code of Practice for the Categorisation of Motor Vehicle Salvage',
    },
    dispositionInstructions: isTotalLoss
      ? (abiCategory === 'CAT_A' || abiCategory === 'CAT_B'
          ? 'Transfer to licensed Authorised Treatment Facility (ATF). Issue DVLA COD notification.'
          : 'Notify salvage auction portal (Copart/SYNETIQ). Issue V5C total-loss notification.')
      : 'Authorise insurer-approved repair network repair.',
    assessedAt: new Date().toISOString(),
  };

  db.save('salvages', salvageRecord);

  AuditModel.record({
    tenantId: 'tenant-faultline-primary',
    actorType: 'SYSTEM',
    actorId: 'salvage-engine',
    action: 'SALVAGE_CLASSIFIED',
    entityType: 'SALVAGE_RECORD',
    entityId: salvageRecord.id,
    investigationId: salvageRecord.investigationId,
    details: {
      abiCategory,
      isTotalLoss,
      estimatedSalvageValue,
      repairRatio: `${repairRatio.toFixed(1)}%`,
    },
  });

  res.json({
    ok: true,
    salvage: salvageRecord,
  });
});

/**
 * GET /api/salvage/:investigationId
 */
salvageRouter.get('/:investigationId', (req, res) => {
  const { investigationId } = req.params;
  const records = db.find('salvages', (s) => s.investigationId === investigationId);

  res.json({
    ok: true,
    salvage: records[0] || null,
  });
});
