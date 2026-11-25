// Controlled vocabularies, categories, and jurisdiction metadata for the FaultLine
// Motor Insurance Laws, Regulations, Claims Procedures & Legal Reference Library.
// Expanded to cover the 16 Master Motor Law & Insurance Intelligence Categories.

// 1. Legacy 10 Categories (Retained at length 10 for full backward compatibility)
export const REGULATION_CATEGORIES = [
  {
    id: 'mandatory-insurance',
    label: 'Mandatory Motor Insurance',
    description: 'Statutory insurance requirements, minimum third-party limits, and uninsured vehicle provisions.',
    icon: 'Shield',
    masterId: 'motor-insurance-laws',
  },
  {
    id: 'accident-reporting',
    label: 'Accident Reporting Requirements',
    description: 'Police reporting triggers, statutory notification deadlines, and accident statement forms.',
    icon: 'AlertCircle',
    masterId: 'accident-incident-laws',
  },
  {
    id: 'liability-negligence',
    label: 'Liability and Negligence',
    description: 'Fault allocation principles, comparative/contributory negligence, and right-of-way rules.',
    icon: 'Scale',
    masterId: 'courts-liability-disputes',
  },
  {
    id: 'claims-procedures',
    label: 'Claims Procedures',
    description: 'Notification timeframes, proof of loss requirements, insurer duties, and settlement protocols.',
    icon: 'FileText',
    masterId: 'insurance-claims-regulations',
  },
  {
    id: 'injury-compensation',
    label: 'Personal Injury and Compensation',
    description: 'Bodily injury frameworks, medical evidence mandates, statutory compensation tariffs, and tribunals.',
    icon: 'HeartPulse',
    masterId: 'motor-claims-compensation',
  },
  {
    id: 'vehicle-damage',
    label: 'Vehicle Damage Claims',
    description: 'Damage assessment guidelines, repair authorizations, total-loss thresholds, and salvage procedures.',
    icon: 'Wrench',
    masterId: 'repair-assessment-damage',
  },
  {
    id: 'insurance-fraud',
    label: 'Motor Insurance Fraud',
    description: 'Statutory fraud definitions, staged collisions, false statements, and criminal penal provisions.',
    icon: 'ShieldAlert',
    masterId: 'insurance-fraud-misrepresentation',
  },
  {
    id: 'traffic-laws',
    label: 'Road Traffic Laws Relevant to Claims',
    description: 'Driver scene obligations, telematics rules, speed/impairment thresholds affecting claim indemnity.',
    icon: 'Compass',
    masterId: 'road-traffic-rules',
  },
  {
    id: 'evidence-requirements',
    label: 'Evidence Requirements',
    description: 'Admissibility of dashcam, CCTV, police reports, black-box telematics, and forensic inspection.',
    icon: 'FileCheck',
    masterId: 'privacy-data-evidence',
  },
  {
    id: 'disputes-appeals',
    label: 'Disputes, Appeals and Complaints',
    description: 'Internal dispute resolution, statutory insurance ombudsman, tribunal appeals, and arbitration.',
    icon: 'Gavel',
    masterId: 'courts-liability-disputes',
  },
];

// 2. Comprehensive 16 Master Motor Law Categories (A through P)
export const MASTER_LEGAL_CATEGORIES = [
  {
    id: 'motor-insurance-laws',
    code: 'A',
    label: 'Motor Insurance Laws',
    description: 'Mandatory third-party coverage, minimum liability limits, insurance certificates, permitted drivers, usage exclusions, cross-border, and commercial/fleet indemnity.',
    icon: 'Shield',
    subcategories: ['Compulsory Third-Party', 'Minimum Limits', 'Certificates of Insurance', 'Permitted Drivers', 'Vehicle Usage', 'Uninsured Drivers Fund', 'Commercial & Fleet'],
  },
  {
    id: 'motor-vehicle-laws',
    code: 'B',
    label: 'Motor Vehicle Laws',
    description: 'Vehicle registration, title transfers, roadworthiness certification, periodic safety inspections, unauthorized modifications, safety recalls, and total-loss write-off classifications.',
    icon: 'Car',
    subcategories: ['Registration & Title', 'Roadworthiness & Inspections', 'Modifications & Defects', 'Recalls', 'Salvage & Total Loss Write-Offs'],
  },
  {
    id: 'driver-laws',
    code: 'C',
    label: 'Driver Laws',
    description: 'Driver licensing classifications, provisional/learner permits, foreign license validity, suspension/revocation, commercial driver mandates, and medical fitness to drive.',
    icon: 'UserCheck',
    subcategories: ['License Categories', 'Provisional Drivers', 'Foreign Licenses', 'Suspensions & Revocations', 'Medical Disqualification'],
  },
  {
    id: 'road-traffic-rules',
    code: 'D',
    label: 'Road Traffic Rules',
    description: 'Statutory rules of the road: speed limits, junction priority, roundabout lane discipline, safe following distances, rear-end fault principles, distracted driving, and impairment thresholds.',
    icon: 'Compass',
    subcategories: ['Speed Limits', 'Right-of-Way & Junctions', 'Roundabouts', 'Following Distance', 'Distracted Driving', 'Impairment (DUI/DWI)'],
  },
  {
    id: 'accident-incident-laws',
    code: 'E',
    label: 'Accident & Incident Laws',
    description: 'Statutory duty to stop and report, police reporting thresholds and deadlines, exchange of driver/insurer particulars, hit-and-run penalties, and scene evidence preservation.',
    icon: 'AlertCircle',
    subcategories: ['Duty to Stop', 'Police Reporting Triggers', 'Deadlines & Forms', 'Hit-and-Run Penalties', 'Evidence Preservation'],
  },
  {
    id: 'motor-claims-compensation',
    code: 'F',
    label: 'Motor Claims & Compensation',
    description: 'Bodily injury compensation frameworks, statutory whiplash/medical tariffs, lost earnings, funeral expenses, no-fault benefits vs tort liability, and uninsured motorist guarantee funds.',
    icon: 'HeartPulse',
    subcategories: ['Bodily Injury Compensation', 'Whiplash & Soft Tissue Tariffs', 'Lost Earnings', 'No-Fault vs Fault', 'Uninsured Driver Schemes'],
  },
  {
    id: 'insurance-claims-regulations',
    code: 'G',
    label: 'Insurance Claims Regulations',
    description: 'Insurer statutory claims handling standards, mandatory acknowledgement and settlement deadlines, proof of loss requirements, fair customer treatment, and claims dispute resolution.',
    icon: 'FileText',
    subcategories: ['Claim Filing Deadlines', 'Insurer Response Standards', 'Proof of Loss', 'Denial Requirements', 'Complaints & Ombudsman'],
  },
  {
    id: 'insurance-fraud-misrepresentation',
    code: 'H',
    label: 'Insurance Fraud & Misrepresentation',
    description: 'Statutory definitions of motor insurance fraud, staged collisions, deliberate false statements, material misrepresentation, duplicate claims, penal consequences, and evidentiary thresholds.',
    icon: 'ShieldAlert',
    subcategories: ['Fraudulent Claims', 'Material Misrepresentation', 'Staged Accidents', 'Exaggerated Damages', 'Criminal Penalties'],
  },
  {
    id: 'policy-coverage-framework',
    code: 'I',
    label: 'Policy & Coverage Legal Framework',
    description: 'Contractual rules of policy interpretation, utmost good faith, pre-contractual disclosure obligations, policy voidance, statutory restrictions on coverage exclusion clauses, and consumer rights.',
    icon: 'BookOpen',
    subcategories: ['Contract Formation', 'Disclosure Obligations', 'Policy Voidance', 'Statutory Exclusions', 'Consumer Protection'],
  },
  {
    id: 'repair-assessment-damage',
    code: 'J',
    label: 'Repair, Assessment & Vehicle Damage',
    description: 'Accredited vehicle repair standards, OEM vs aftermarket parts authorization, independent engineering damage assessment, total loss valuation benchmarks, and salvage titles.',
    icon: 'Wrench',
    subcategories: ['Repair Standards', 'OEM vs Aftermarket Parts', 'Assessor Licensing', 'Valuation & Depreciation', 'Salvage Titles'],
  },
  {
    id: 'towing-storage-recovery',
    code: 'K',
    label: 'Towing, Storage & Recovery',
    description: 'Statutory accident scene towing regulations, maximum fee caps for storage and recovery, vehicle release mandates, and licensing of recovery operators.',
    icon: 'Truck',
    subcategories: ['Scene Towing Rights', 'Storage Fee Caps', 'Vehicle Release', 'Recovery Licensing'],
  },
  {
    id: 'commercial-special-vehicles',
    code: 'L',
    label: 'Commercial & Special Vehicle Regulations',
    description: 'Heavy goods vehicle (HGV) operator licensing, tachograph hours of service, taxi/private hire ride-hailing insurance regulations, public transport requirements, and fleet mandates.',
    icon: 'Bus',
    subcategories: ['HGV & Commercial Fleet', 'Taxis & Ride-Hailing', 'Tachograph & Hours', 'Public Transport'],
  },
  {
    id: 'ev-emerging-vehicles',
    code: 'M',
    label: 'Electric Vehicle & Emerging Tech',
    description: 'High-voltage EV battery safety regulations, battery fire and thermal runaway liability, automated/autonomous vehicle driver liability, ADAS sensor calibration, and connected vehicle telematics.',
    icon: 'Zap',
    subcategories: ['EV Battery Safety & Fire', 'Autonomous Vehicles (AV)', 'ADAS Calibration', 'Connected Telematics'],
  },
  {
    id: 'privacy-data-evidence',
    code: 'N',
    label: 'Privacy, Data & Evidence Laws',
    description: 'Statutory admissibility and evidential weight of dashcam, CCTV, telematics, GPS, and EDR black-box data, alongside GDPR/data protection rules governing claimant and driver data.',
    icon: 'FileCheck',
    subcategories: ['Digital Telematics Admissibility', 'Dashcam & CCTV Rules', 'Data Protection & GDPR', 'Evidence Retention'],
  },
  {
    id: 'consumer-regulatory-rules',
    code: 'O',
    label: 'Consumer & Regulatory Requirements',
    description: 'Prudential and market conduct rules enforced by national insurance regulators, vulnerable customer protection, unfair contract terms regulations, and market oversight reporting.',
    icon: 'Layers',
    subcategories: ['Market Conduct Oversight', 'Vulnerable Customers', 'Unfair Contract Terms', 'Regulatory Reporting'],
  },
  {
    id: 'courts-liability-disputes',
    code: 'P',
    label: 'Courts, Liability & Dispute Resolution',
    description: 'Civil liability principles in motor collisions: duty of care, pure/modified comparative negligence, contributory negligence bars, vicarious liability, limitation periods, and burden of proof.',
    icon: 'Scale',
    subcategories: ['Duty of Care', 'Comparative/Contributory Negligence', 'Vicarious Liability', 'Statutory Limitation Periods', 'Burden of Proof'],
  },
];

// Helper to resolve canonical category from any legacy or master ID
export function resolveMasterCategory(categoryId) {
  if (!categoryId) return MASTER_LEGAL_CATEGORIES[0];
  const direct = MASTER_LEGAL_CATEGORIES.find((m) => m.id === categoryId);
  if (direct) return direct;
  const legacy = REGULATION_CATEGORIES.find((r) => r.id === categoryId);
  if (legacy?.masterId) {
    return MASTER_LEGAL_CATEGORIES.find((m) => m.id === legacy.masterId) || legacy;
  }
  return MASTER_LEGAL_CATEGORIES[0];
}

// 3. Verification & Quality Statuses (Section 18 Quality Framework)
export const VERIFICATION_STATUSES = {
  VERIFIED: {
    id: 'VERIFIED',
    label: 'Verified Official Source',
    shortLabel: 'Verified',
    badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dotCls: 'bg-emerald-400',
    description: 'Cross-referenced and confirmed against official government statutes or regulator publications.',
  },
  PARTIALLY_VERIFIED: {
    id: 'PARTIALLY_VERIFIED',
    label: 'Partially Verified',
    shortLabel: 'Partial',
    badgeCls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    dotCls: 'bg-cyan-400',
    description: 'Primary provisions confirmed; subordinate regional regulations or guidelines pending review.',
  },
  NEEDS_REVIEW: {
    id: 'NEEDS_REVIEW',
    label: 'Needs Review',
    shortLabel: 'Needs Review',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotCls: 'bg-amber-400',
    description: 'Extracted from secondary statutory summaries; primary legislative text requires human confirmation.',
  },
  NEEDS_VERIFICATION: {
    id: 'NEEDS_VERIFICATION',
    label: 'Needs Verification',
    shortLabel: 'Needs Check',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dotCls: 'bg-amber-400',
    description: 'Pending primary official source verification.',
  },
  OUTDATED: {
    id: 'OUTDATED',
    label: 'Outdated / Pending Review',
    shortLabel: 'Outdated',
    badgeCls: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dotCls: 'bg-orange-400',
    description: 'Legislative amendments enacted since last audit; requires re-benchmarking.',
  },
  HISTORICAL: {
    id: 'HISTORICAL',
    label: 'Historical Law (In-force for past incidents)',
    shortLabel: 'Historical',
    badgeCls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dotCls: 'bg-purple-400',
    description: 'Prior statutory version applicable to claims that occurred during its period of validity.',
  },
  PROPOSED: {
    id: 'PROPOSED',
    label: 'Proposed / Pending Enactment',
    shortLabel: 'Proposed',
    badgeCls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dotCls: 'bg-blue-400',
    description: 'Gazetted bill or draft regulation not yet in force.',
  },
  REPEALED: {
    id: 'REPEALED',
    label: 'Repealed / Revoked',
    shortLabel: 'Repealed',
    badgeCls: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotCls: 'bg-rose-400',
    description: 'Formally superseded or abolished by subsequent legislation.',
  },
  SOURCE_UNAVAILABLE: {
    id: 'SOURCE_UNAVAILABLE',
    label: 'Source Unavailable',
    shortLabel: 'Unavailable',
    badgeCls: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dotCls: 'bg-rose-400',
    description: 'Official government gazette or registry portal was unreachable during verification check.',
  },
  NOT_AVAILABLE: {
    id: 'NOT_AVAILABLE',
    label: 'Not Available',
    shortLabel: 'No Data',
    badgeCls: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dotCls: 'bg-slate-400',
    description: 'No verified official legal data on file. Placeholder architecture ready for future ingestion.',
  },
};

// 4. Law & Legal Instrument Types
export const LAW_INSTRUMENT_TYPES = {
  PRIMARY_LEGISLATION: {
    id: 'PRIMARY_LEGISLATION',
    label: 'Primary Legislation (Act / Statute / Code)',
    badgeCls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  SUBORDINATE_REGULATION: {
    id: 'SUBORDINATE_REGULATION',
    label: 'Subordinate Regulation (Statutory Instrument / Rule / Decree)',
    badgeCls: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  REGULATOR_GUIDANCE: {
    id: 'REGULATOR_GUIDANCE',
    label: 'Regulator Guidance (Sourcebook / Circular / Standard)',
    badgeCls: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  },
  JUDICIAL_PRECEDENT: {
    id: 'JUDICIAL_PRECEDENT',
    label: 'Judicial Precedent (Binding Case Law)',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
};

// 5. Regional Jurisdictions
export const REGIONAL_JURISDICTIONS = {
  US: [
    { code: 'US-FED', name: 'Federal / Nationwide' },
    { code: 'US-CA', name: 'California' },
    { code: 'US-NY', name: 'New York' },
    { code: 'US-TX', name: 'Texas' },
    { code: 'US-FL', name: 'Florida' },
  ],
  CA: [
    { code: 'CA-FED', name: 'Federal / Nationwide' },
    { code: 'CA-ON', name: 'Ontario' },
    { code: 'CA-QC', name: 'Quebec' },
    { code: 'CA-BC', name: 'British Columbia' },
    { code: 'CA-AB', name: 'Alberta' },
  ],
  AU: [
    { code: 'AU-FED', name: 'Commonwealth (Federal)' },
    { code: 'AU-NSW', name: 'New South Wales' },
    { code: 'AU-VIC', name: 'Victoria' },
    { code: 'AU-QLD', name: 'Queensland' },
    { code: 'AU-WA', name: 'Western Australia' },
  ],
  UK: [
    { code: 'UK-ALL', name: 'United Kingdom (General)' },
    { code: 'UK-EW', name: 'England & Wales' },
    { code: 'UK-SCT', name: 'Scotland' },
    { code: 'UK-NIR', name: 'Northern Ireland' },
  ],
  IN: [
    { code: 'IN-CEN', name: 'Central / Pan-India' },
    { code: 'IN-DL', name: 'Delhi NCT' },
    { code: 'IN-MH', name: 'Maharashtra' },
    { code: 'IN-KA', name: 'Karnataka' },
    { code: 'IN-TN', name: 'Tamil Nadu' },
  ],
};

// 6. Country Metadata across 20 Jurisdictions
export const COUNTRY_METADATA = {
  UK: { flag: '🇬🇧', code: 'UK', name: 'United Kingdom', legalSystem: 'Common Law', regulator: 'Financial Conduct Authority (FCA) & PRA' },
  US: { flag: '🇺🇸', code: 'US', name: 'United States', legalSystem: 'Federal Common Law / State Regulated', regulator: 'State Insurance Commissioners (NAIC)' },
  IN: { flag: '🇮🇳', code: 'IN', name: 'India', legalSystem: 'Common Law / Statutory Codes', regulator: 'Insurance Regulatory and Development Authority (IRDAI)' },
  CA: { flag: '🇨🇦', code: 'CA', name: 'Canada', legalSystem: 'Common Law / Civil Law (Quebec)', regulator: 'FSRA (Ontario), AMF (Quebec), CCIR' },
  AU: { flag: '🇦🇺', code: 'AU', name: 'Australia', legalSystem: 'Common Law', regulator: 'Australian Prudential Regulation Authority (APRA) / ASIC' },
  AE: { flag: '🇦🇪', code: 'AE', name: 'United Arab Emirates', legalSystem: 'Civil Law with Sharia Principles', regulator: 'Central Bank of the UAE (Insurance Authority)' },
  DE: { flag: '🇩🇪', code: 'DE', name: 'Germany', legalSystem: 'Civil Law (BGB)', regulator: 'Federal Financial Supervisory Authority (BaFin)' },
  FR: { flag: '🇫🇷', code: 'FR', name: 'France', legalSystem: 'Civil Law (Code Civil)', regulator: 'Autorité de Contrôle Prudentiel et de Résolution (ACPR)' },
  ZA: { flag: '🇿🇦', code: 'ZA', name: 'South Africa', legalSystem: 'Mixed Roman-Dutch & Common Law', regulator: 'Financial Sector Conduct Authority (FSCA)' },
  SG: { flag: '🇸🇬', code: 'SG', name: 'Singapore', legalSystem: 'Common Law', regulator: 'Monetary Authority of Singapore (MAS)' },
  IE: { flag: '🇮🇪', code: 'IE', name: 'Ireland', legalSystem: 'Common Law', regulator: 'Central Bank of Ireland' },
  NZ: { flag: '🇳🇿', code: 'NZ', name: 'New Zealand', legalSystem: 'Common Law / Statutory No-Fault (ACC)', regulator: 'Reserve Bank of New Zealand / ACC' },
  JP: { flag: '🇯🇵', code: 'JP', name: 'Japan', legalSystem: 'Civil Law', regulator: 'Financial Services Agency (FSA)' },
  BR: { flag: '🇧🇷', code: 'BR', name: 'Brazil', legalSystem: 'Civil Law', regulator: 'Superintendência de Seguros Privados (SUSEP)' },
  NG: { flag: '🇳🇬', code: 'NG', name: 'Nigeria', legalSystem: 'Common Law / Statutory', regulator: 'National Insurance Commission (NAICOM)' },
  KE: { flag: '🇰🇪', code: 'KE', name: 'Kenya', legalSystem: 'Common Law', regulator: 'Insurance Regulatory Authority (IRA)' },
  MY: { flag: '🇲🇾', code: 'MY', name: 'Malaysia', legalSystem: 'Common Law / Dual Takaful', regulator: 'Bank Negara Malaysia (BNM)' },
  NL: { flag: '🇳🇱', code: 'NL', name: 'Netherlands', legalSystem: 'Civil Law', regulator: 'Dutch Central Bank (DNB) & AFM' },
  IT: { flag: '🇮🇹', code: 'IT', name: 'Italy', legalSystem: 'Civil Law (Codice Civile)', regulator: 'Institute for the Supervision of Insurance (IVASS)' },
  ES: { flag: '🇪🇸', code: 'ES', name: 'Spain', legalSystem: 'Civil Law', regulator: 'Dirección General de Seguros y Fondos de Pensiones (DGSFP)' },
};
