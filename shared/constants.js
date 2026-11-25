// Shared by the API server and the browser bundle. Keep this file free of Node- or DOM-only APIs.

export const EXHIBIT_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

export const EXHIBIT_KINDS = [
  { value: 'statement', label: 'Statement' },
  { value: 'witness', label: 'Witness account' },
  { value: 'report', label: 'Report' },
  { value: 'record', label: 'Record or log' },
  { value: 'message', label: 'Message or email' },
  { value: 'document', label: 'Document' },
  { value: 'claim_notification', label: 'Claim notification' },
  { value: 'claimant_statement', label: "Claimant statement" },
  { value: 'third_party_statement', label: 'Third-party statement' },
  { value: 'witness_statement', label: 'Witness statement' },
  { value: 'police_report', label: 'Police report' },
  { value: 'cctv', label: 'CCTV footage summary' },
  { value: 'dashcam', label: 'Dashcam footage summary' },
  { value: 'photograph', label: 'Photograph evidence' },
  { value: 'vehicle_inspection', label: 'Vehicle inspection report' },
  { value: 'repair_estimate', label: 'Repair estimate' },
  { value: 'medical_report', label: 'Medical report' },
  { value: 'telematics', label: 'Telematics data' },
  { value: 'gps', label: 'GPS data' },
  { value: 'phone_records', label: 'Phone records' },
  { value: 'insurance_policy', label: 'Insurance policy' },
  { value: 'claim_history', label: 'Claim history' },
  { value: 'email_correspondence', label: 'Email correspondence' },
  { value: 'investigator_notes', label: 'Investigator notes' },
  { value: 'garage_report', label: 'Garage report' },
  { value: 'recovery_report', label: 'Recovery report' },
  { value: 'other', label: 'Other' },
];

export const EVIDENCE_CATEGORIES = [
  { value: 'time', label: 'Date & Time' },
  { value: 'place', label: 'Location & Junction' },
  { value: 'sequence', label: 'Sequence of Events' },
  { value: 'physical_damage', label: 'Vehicle & Damage' },
  { value: 'injury', label: 'Medical & Injury' },
  { value: 'telematics', label: 'Telematics & GPS' },
  { value: 'audio_visual', label: 'CCTV & Dashcam' },
  { value: 'statement', label: 'Personal Statement' },
  { value: 'financial', label: 'Financial & Repair Costs' },
  { value: 'other', label: 'Other' },
];

export const LIMITS = {
  minExhibits: 2,
  maxExhibits: 16,
  minChars: 40,
  maxChars: 40000,
  maxTotalChars: 180000,
  maxContextChars: 1200,
  maxLabelChars: 80,
  maxAttachmentsPerExhibit: 10,
  maxAttachmentSizeBytes: 50 * 1024 * 1024,
};

export const SEVERITIES = ['critical', 'major', 'minor'];

export const CATEGORIES = [
  'time',
  'place',
  'sequence',
  'quantity',
  'people',
  'condition',
  'cause',
  'statement',
  'omission',
];

export const EVENT_STATUSES = ['corroborated', 'single_source', 'disputed'];

// Progress stages reported while the model streams its answer.
export const STAGES = [
  'Reading the exhibits',
  'Rebuilding the timeline',
  'Cross-examining the statements',
  'Checking what agrees',
  'Mapping gaps and next steps',
  'Verifying every quote',
];
