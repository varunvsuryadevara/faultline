// WorkflowIntelligenceService: Guides claims handlers through procedural next steps,
// generates evidence verification checklists, assigns prioritized action packs,
// and enforces jurisdictional statutory investigation deadlines.

import { auditEvidenceCompleteness } from './evidence.js';
import { evaluateCompetingHypotheses } from './hypothesis.js';

export const STATUTORY_DEADLINES = {
  UK: {
    regulation: 'Civil Procedure Rules — Pre-Action Protocol for Personal Injury Claims Below Small Claims Limit in Road Traffic Accidents',
    windowDays: 15,
    unit: 'business days',
    obligation: 'Insurer must complete preliminary liability investigation and provide formal response to claimant.',
  },
  'US-CA': {
    regulation: 'California Fair Claims Settlement Practices Regulations (10 CCR § 2695.7)',
    windowDays: 40,
    unit: 'calendar days',
    obligation: 'Insurer must accept or deny claim, or provide detailed written statement of needed additional investigation time.',
  },
  'US-NY': {
    regulation: 'New York State Insurance Regulation 64 (11 NYCRR 216)',
    windowDays: 15,
    unit: 'business days',
    obligation: 'Insurer must decide liability upon receipt of properly executed proof of loss.',
  },
  'US-FL': {
    regulation: 'Florida Insurance Code (F.S. § 627.736 / 627.70131)',
    windowDays: 14,
    unit: 'calendar days',
    obligation: 'Acknowledge communications within 14 days; pay or deny PIP benefits within 30 days.',
  },
  'US-TX': {
    regulation: 'Texas Prompt Payment of Claims Act (Tex. Ins. Code § 542.056)',
    windowDays: 15,
    unit: 'business days',
    obligation: 'Notify claimant of acceptance or rejection of claim within 15 business days of receiving all requested items.',
  },
  AU: {
    regulation: 'General Insurance Code of Practice (Australia)',
    windowDays: 10,
    unit: 'business days',
    obligation: 'Notify claimant of decision within 10 business days of receiving all necessary information.',
  },
  DEFAULT: {
    regulation: 'Standard Motor Claims Good-Faith Investigation Standard',
    windowDays: 30,
    unit: 'calendar days',
    obligation: 'Complete fact-finding, evidence preservation, and liability determination without unreasonable delay.',
  },
};

/**
 * Computes statutory deadline date based on incident or claim creation date.
 */
export function calculateStatutoryDeadline(jurisdiction = 'UK', startDate = new Date()) {
  const normJur = String(jurisdiction || 'UK').toUpperCase();
  const rule = STATUTORY_DEADLINES[normJur] || STATUTORY_DEADLINES.UK || STATUTORY_DEADLINES.DEFAULT;

  const start = startDate instanceof Date ? startDate : new Date(startDate || Date.now());
  const target = new Date(start.getTime());

  if (rule.unit === 'business days') {
    let addedDays = 0;
    while (addedDays < rule.windowDays) {
      target.setDate(target.getDate() + 1);
      const day = target.getDay();
      if (day !== 0 && day !== 6) { // Skip Sat/Sun
        addedDays++;
      }
    }
  } else {
    target.setDate(target.getDate() + rule.windowDays);
  }

  const remainingMs = target.getTime() - Date.now();
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  return {
    jurisdiction: normJur,
    regulation: rule.regulation,
    statutoryWindow: `${rule.windowDays} ${rule.unit}`,
    deadlineDate: target.toISOString().split('T')[0],
    remainingDays: Math.max(0, remainingDays),
    isOverdue: remainingDays < 0,
    obligation: rule.obligation,
  };
}

/**
 * Prepares an actionable evidence checklist, prioritized actions, and next steps for the active investigation.
 */
export function generateWorkflowChecklist({ caseFile, scenario, decisionState, jurisdiction = 'UK' } = {}) {
  const exhibits = caseFile?.exhibits || [];
  const completeness = auditEvidenceCompleteness(exhibits);

  const title = caseFile?.title || scenario?.title || 'Active Investigation';
  const risk = scenario?.risk?.toUpperCase() || 'MEDIUM';
  const effectiveJur = scenario?.country || jurisdiction || 'UK';
  const deadlineInfo = calculateStatutoryDeadline(effectiveJur);

  // Evaluate Hypotheses to extract dynamic discriminators
  const hypothesesEval = exhibits.length > 0 ? evaluateCompetingHypotheses(exhibits) : null;

  // Base Procedural Checklist Items
  const items = [
    {
      task: 'Verify Vehicle Identification Numbers & Registrations',
      status: exhibits.length >= 2 ? 'COMPLETED' : 'PENDING',
      details: 'Check claimant and insured vehicle registrations against national motor insurance databases (e.g. MID/CUE).',
    },
    {
      task: 'Obtain Objective Physical Corroboration',
      status: completeness.present.some((p) => p.includes('Telematics') || p.includes('Dashcam')) ? 'COMPLETED' : 'REQUIRED',
      details: 'Secure vehicle GPS telematics, accelerometer speed traces, or third-party dashcam/CCTV footage.',
    },
    {
      task: 'Cross-Reference Independent Police CAD / Collision Report',
      status: completeness.present.some((p) => p.includes('Police')) ? 'COMPLETED' : 'RECOMMENDED',
      details: 'Request official police collision report or officer notebook to confirm weather, road conditions, and breathalyzer checks.',
    },
    {
      task: 'Independent Automotive Engineer Damage Consistency Appraisal',
      status: completeness.present.some((p) => p.includes('Damage')) ? 'COMPLETED' : 'REQUIRED',
      details: 'Commission forensic inspection of bumper height, paint transfer, and crumple severity to verify biomechanical compatibility.',
    },
    {
      task: 'Resolve Witness Statement Inconsistencies',
      status: 'ACTION REQUIRED',
      details: 'Re-interview witnesses on identified temporal or trajectory discrepancies prior to final indemnity determination.',
    },
  ];

  // Dynamic Prioritized Action Pack
  const prioritizedActions = [];

  // P1: Critical Hypothesis Discriminators
  if (hypothesesEval?.criticalDiscriminators?.length > 0) {
    hypothesesEval.criticalDiscriminators.forEach((disc) => {
      prioritizedActions.push({
        priority: 'P1_CRITICAL',
        badge: 'URGENT',
        title: disc.testName,
        target: disc.targetExhibit,
        objective: disc.purpose,
        assignedRole: 'FORENSIC_ENGINEERING_EXPERT',
        deadline: `${deadlineInfo.deadlineDate} (${deadlineInfo.remainingDays} days remaining)`,
      });
    });
  }

  // P2: Missing Objective Evidence
  if (!completeness.present.some((p) => p.includes('Telematics'))) {
    prioritizedActions.push({
      priority: 'P2_HIGH',
      badge: 'HIGH PRIORITY',
      title: 'Subpoena / Request On-Board CAN-Bus Telematics Dump',
      target: 'Lead Vehicle / Telematics Provider',
      objective: 'Secure calibrated 100Hz pre-impact accelerometer records to establish deceleration curve.',
      assignedRole: 'FIELD_INVESTIGATOR',
      deadline: `${deadlineInfo.deadlineDate}`,
    });
  }

  // P3: Statement Clarifications
  prioritizedActions.push({
    priority: 'P3_STANDARD',
    badge: 'PROCEDURAL',
    title: 'Conduct Focused Recorded Re-Interview on Timeline Discrepancies',
    target: 'Claimant and Third-Party Drivers',
    objective: 'Clarify whether observed time variances reflect approximate recollection or material conflicts.',
    assignedRole: 'CLAIMS_EXAMINER',
    deadline: `${deadlineInfo.deadlineDate}`,
  });

  return {
    investigationTitle: title,
    riskClassification: risk,
    jurisdiction: effectiveJur,
    statutoryDeadline: deadlineInfo,
    evidenceCompletenessRatio: completeness.completenessRatio,
    evidenceCompletenessPercentage: completeness.completenessPercentage,
    checklistItems: items,
    prioritizedActions,
    criticalGaps: completeness.missing,
    competingHypotheses: hypothesesEval ? {
      primary: hypothesesEval.primaryHypothesis,
      alternative: hypothesesEval.competingAlternative,
    } : null,
  };
}

/**
 * Drafts a structured investigator field note template.
 */
export function draftInvestigatorNotes({ caseFile, scenario, userQuery = '', jurisdiction = 'UK' } = {}) {
  const title = caseFile?.title || scenario?.title || 'Motor Collision Investigation';
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const exhibits = caseFile?.exhibits || [];
  const deadlineInfo = calculateStatutoryDeadline(jurisdiction);

  return `### Investigator Field Case Note\n\n` +
    `**Investigation Title:** ${title}\n` +
    `**Date of Assessment:** ${date}\n` +
    `**Jurisdiction:** ${deadlineInfo.jurisdiction} (${deadlineInfo.statutoryWindow} statutory window | Target: ${deadlineInfo.deadlineDate})\n` +
    `**Investigating Examiner:** FaultLine Forensic Intelligence Desk\n` +
    `**Exhibits Evaluated: ${exhibits.length} exhibits submitted** (${exhibits.map((e, i) => String.fromCharCode(65 + i)).join(', ') || 'None'})\n\n` +
    `#### 1. Incident Overview & Summary of Allegations\n` +
    `Collision occurred at the locus specified in the initial claim notice. Accounts provided by parties demonstrate material differences regarding deceleration behavior and point of impact.\n\n` +
    `#### 2. Key Evidentiary Observations\n` +
    `• Review of submitted statements indicates divergent estimates of speed and braking behavior.\n` +
    `• Objective evidence verification required to substantiate whether lead vehicle braking was emergency avoidance or induced.\n\n` +
    `#### 3. Outstanding Verifications Prior to Settlement (Statutory Due Date: ${deadlineInfo.deadlineDate})\n` +
    `• Request forensic automotive engineer appraisal of bumper reinforcement rust oxidation.\n` +
    `• Extract vehicle CAN-Bus G-force deceleration curves.\n` +
    `• Confirm whether local road maintenance logs record wet pavement or debris at the incident hour.\n\n` +
    `*Note: This draft note must be reviewed and countersigned by the assigned claims investigator under FaultLine Two-Key Governance.*`;
}
