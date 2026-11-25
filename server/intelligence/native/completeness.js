// Native Completeness Intelligence Engine for FaultLine.
// Evaluates case dossier against insurance evidence standards.
// Strict safeguard: Missing evidence alone is an investigative requirement, never proof of fraud.

export function evaluateInvestigationCompleteness(exhibits = [], context = '') {
  const allText = exhibits.map((e) => `${e.label || ''} ${e.kind || ''} ${e.text || ''}`).join(' ') + ' ' + (context || '');
  const t = allText.toLowerCase();

  const requirements = [
    {
      id: 'REQ-01',
      category: 'PRIMARY_DOCUMENTATION',
      item: 'Claimant Statement / First Notice of Loss (FNOL)',
      status: exhibits.some((e) => /claimant|insured|fnol|driver statement/i.test(`${e.label} ${e.kind}`)) ? 'PRESENT' : 'MISSING',
      level: 'REQUIRED',
      rationale: 'Primary assertion of loss from insured party establishing baseline incident account.',
    },
    {
      id: 'REQ-02',
      category: 'PARTY_IDENTIFICATION',
      item: 'Third Party Counter-Statement / Plate Identification',
      status: exhibits.some((e) => /third party|other driver|defendant/i.test(`${e.label} ${e.kind}`)) ? 'PRESENT' : 'MISSING',
      level: 'REQUIRED',
      rationale: 'Required to compare competing driver narratives and identify liability disputes.',
    },
    {
      id: 'REQ-03',
      category: 'OBJECTIVE_FORENSICS',
      item: 'Vehicle Damage Inspection / Garage Assessment',
      status: exhibits.some((e) => /garage|engineer|estimate|repair|damage/i.test(`${e.label} ${e.kind}`)) ? 'PRESENT' : 'MISSING',
      level: 'REQUIRED',
      rationale: 'Objective physical validation of impact consistency, crush depth, and repair costs.',
    },
    {
      id: 'REQ-04',
      category: 'INDEPENDENT_CORROBORATION',
      item: 'Independent Witness Account or CCTV Footage',
      status: exhibits.some((e) => /witness|cctv|dashcam|bystander/i.test(`${e.label} ${e.kind}`)) ? 'PRESENT' : 'RECOMMENDED',
      level: 'RECOMMENDED',
      rationale: 'Breaks word-versus-word impasse on multi-lane or junction collisions.',
    },
    {
      id: 'REQ-05',
      category: 'OFFICIAL_RECORDS',
      item: 'Police Incident Report / Reference Number',
      status: exhibits.some((e) => /police|constabulary|patrol|cad number/i.test(`${e.label} ${e.text}`)) ? 'PRESENT' : 'OPTIONAL',
      level: 'OPTIONAL',
      rationale: 'Helpful for personal injury or disputed hit-and-run, but optional for minor damage.',
    },
    {
      id: 'REQ-06',
      category: 'TELEMETRY_DATA',
      item: 'Electronic Telematics / GPS Data Stream',
      status: exhibits.some((e) => /telematics|gps|black box|accelerometer/i.test(`${e.label} ${e.kind}`)) ? 'PRESENT' : 'RECOMMENDED',
      level: 'RECOMMENDED',
      rationale: 'Provides millisecond velocity and deceleration profiles preceding impact.',
    },
  ];

  const presentCount = requirements.filter((r) => r.status === 'PRESENT').length;
  const requiredTotal = requirements.filter((r) => r.level === 'REQUIRED').length;
  const requiredPresent = requirements.filter((r) => r.level === 'REQUIRED' && r.status === 'PRESENT').length;

  const completenessPercentage = Math.round((presentCount / requirements.length) * 100);
  const isSufficientForDecision = requiredPresent === requiredTotal;

  const missingRequired = requirements.filter((r) => r.level === 'REQUIRED' && r.status === 'MISSING');
  const missingRecommended = requirements.filter((r) => r.level === 'RECOMMENDED' && r.status === 'MISSING');

  return {
    completenessPercentage,
    completenessRatio: `${presentCount}/${requirements.length}`,
    isSufficientForDecision,
    missingRequiredCount: missingRequired.length,
    missingRequired: missingRequired.map((m) => m.item),
    missingRecommended: missingRecommended.map((m) => m.item),
    requirements,
    safeguardNotice: 'Rule 1 Safeguard: Missing evidence must prompt "KEEP UNDER REVIEW" for further document collection, never an automatic fraud claim denial.',
  };
}
