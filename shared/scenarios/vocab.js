// Controlled vocabularies for the motor claims scenario library. Every filter in the UI and the
// API comes from these lists, and every scenario record is validated against them, so adding a
// value here is the only change needed to make it filterable. Shared by the server and the browser.

export const COUNTRIES = [
  { value: 'UK', label: 'United Kingdom', aliases: ['uk', 'britain', 'great britain', 'england', 'scotland', 'wales', 'british', 'gb'] },
  { value: 'US', label: 'United States', aliases: ['us', 'usa', 'america', 'american', 'united states'] },
  { value: 'IN', label: 'India', aliases: ['india', 'indian', 'bharat'] },
  { value: 'CA', label: 'Canada', aliases: ['canada', 'canadian', 'ontario', 'quebec'] },
  { value: 'AU', label: 'Australia', aliases: ['australia', 'australian', 'aussie'] },
  { value: 'AE', label: 'United Arab Emirates', aliases: ['uae', 'emirates', 'dubai', 'abu dhabi'] },
  { value: 'DE', label: 'Germany', aliases: ['germany', 'german', 'deutschland'] },
  { value: 'FR', label: 'France', aliases: ['france', 'french'] },
  { value: 'ZA', label: 'South Africa', aliases: ['south africa', 'south african', 'sa'] },
  { value: 'SG', label: 'Singapore', aliases: ['singapore'] },
  { value: 'IE', label: 'Ireland', aliases: ['ireland', 'irish'] },
  { value: 'NZ', label: 'New Zealand', aliases: ['new zealand', 'nz', 'kiwi'] },
  { value: 'JP', label: 'Japan', aliases: ['japan', 'japanese'] },
  { value: 'BR', label: 'Brazil', aliases: ['brazil', 'brazilian', 'brasil'] },
  { value: 'NG', label: 'Nigeria', aliases: ['nigeria', 'nigerian', 'lagos'] },
  { value: 'KE', label: 'Kenya', aliases: ['kenya', 'kenyan', 'nairobi'] },
  { value: 'MY', label: 'Malaysia', aliases: ['malaysia', 'malaysian'] },
  { value: 'NL', label: 'Netherlands', aliases: ['netherlands', 'dutch', 'holland'] },
  { value: 'IT', label: 'Italy', aliases: ['italy', 'italian'] },
  { value: 'ES', label: 'Spain', aliases: ['spain', 'spanish'] },
];

// The eight scenario families asked for in the brief.
export const CATEGORIES = [
  { value: 'genuine-accident', label: 'Genuine accident' },
  { value: 'unintentional-damage', label: 'Unintentional damage' },
  { value: 'environmental', label: 'Weather and natural events' },
  { value: 'mechanical', label: 'Mechanical and vehicle-related' },
  { value: 'theft', label: 'Theft and vandalism' },
  { value: 'negligence', label: 'Negligence' },
  { value: 'fraud', label: 'Intentional fraud' },
  { value: 'grey-area', label: 'Grey area' },
];

// Intent classification. "family" groups them so an AI call can be compared with the reference:
// the same intent is a match, the same family is a near match, anything else is a disagreement.
export const INTENTS = [
  { value: 'genuine', label: 'Genuine', family: 'genuine' },
  { value: 'genuine-negligence', label: 'Genuine with negligence', family: 'genuine' },
  { value: 'genuine-reporting-errors', label: 'Genuine with reporting errors', family: 'genuine' },
  { value: 'genuine-exaggeration', label: 'Genuine with potential exaggeration', family: 'genuine' },
  { value: 'suspicious', label: 'Suspicious', family: 'uncertain' },
  { value: 'disputed', label: 'Disputed', family: 'uncertain' },
  { value: 'insufficient-evidence', label: 'Insufficient evidence', family: 'uncertain' },
  { value: 'mixed', label: 'Mixed scenario', family: 'uncertain' },
  { value: 'potential-fraud', label: 'Potential fraud', family: 'fraud' },
  { value: 'confirmed-fraud', label: 'Confirmed fraud scenario', family: 'fraud' },
  { value: 'third-party-fraud', label: 'Third-party fraud', family: 'fraud' },
  { value: 'organised-fraud', label: 'Organised fraud', family: 'fraud' },
];

export const INTENT_FAMILIES = [
  { value: 'genuine', label: 'Genuine' },
  { value: 'uncertain', label: 'Needs a closer look' },
  { value: 'fraud', label: 'Fraud' },
];

export const CLAIM_TYPES = [
  { value: 'own-damage', label: 'Own damage' },
  { value: 'third-party', label: 'Third-party property' },
  { value: 'injury', label: 'Injury' },
  { value: 'theft', label: 'Theft' },
  { value: 'vandalism', label: 'Vandalism or malicious damage' },
  { value: 'glass', label: 'Windscreen and glass' },
  { value: 'weather', label: 'Weather or natural peril' },
  { value: 'fire', label: 'Fire' },
  { value: 'total-loss', label: 'Total loss or write-off' },
  { value: 'mechanical', label: 'Mechanical or electrical' },
  { value: 'hire-recovery', label: 'Hire, recovery or storage' },
  { value: 'policy', label: 'Policy or cover dispute' },
];

export const FRAUD_TYPES = [
  { value: 'none', label: 'No fraud element' },
  { value: 'staged-accident', label: 'Staged accident' },
  { value: 'induced-accident', label: 'Induced accident (crash-for-cash)' },
  { value: 'ghost-accident', label: 'Ghost or paper accident' },
  { value: 'false-details', label: 'False date, time or place' },
  { value: 'pre-existing-damage', label: 'Old or unrelated damage' },
  { value: 'opportunistic-exaggeration', label: 'Opportunistic exaggeration' },
  { value: 'inflated-repair', label: 'Inflated or unnecessary repairs' },
  { value: 'false-expenses', label: 'False hire, towing or storage costs' },
  { value: 'false-injury', label: 'False or exaggerated injury' },
  { value: 'phantom-passenger', label: 'Phantom passengers' },
  { value: 'duplicate-claim', label: 'Duplicate or double claim' },
  { value: 'false-theft', label: 'False theft report' },
  { value: 'arson-deliberate-damage', label: 'Deliberate damage or arson' },
  { value: 'misrepresentation', label: 'Misrepresentation (driver, use or details)' },
  { value: 'ghost-broking', label: 'Ghost broking or fake cover' },
  { value: 'fake-documents', label: 'Fake documents or invoices' },
  { value: 'identity-fraud', label: 'Identity fraud or cloning' },
  { value: 'repairer-fraud', label: 'Garage or repairer fraud' },
  { value: 'recovery-fraud', label: 'Recovery or storage fraud' },
  { value: 'witness-fraud', label: 'Witness fraud' },
  { value: 'organised-ring', label: 'Organised network' },
  { value: 'insider-fraud', label: 'Insider or staff fraud' },
];

// The stage of the claims process where a scenario's key decision sits, grouped into the four
// areas of a claims operation. A scenario has one primary stage, even if it touches others.
export const STAGE_GROUPS = [
  { value: 'intake', label: 'Intake and cover' },
  { value: 'assessment-settlement', label: 'Assessment and settlement' },
  { value: 'third-parties', label: 'Third parties, recovery and legal' },
  { value: 'fraud-compliance', label: 'Fraud, compliance and customer' },
];

export const STAGES = [
  { value: 'notification', label: 'Notice and reporting', group: 'intake' },
  { value: 'coverage', label: 'Cover checks', group: 'intake' },
  { value: 'assessment', label: 'Survey and valuation', group: 'assessment-settlement' },
  { value: 'settlement', label: 'Settlement and payment', group: 'assessment-settlement' },
  { value: 'third-party', label: 'Third-party claims', group: 'third-parties' },
  { value: 'legal', label: 'Court and tribunal', group: 'third-parties' },
  { value: 'recovery', label: 'Recovery and subrogation', group: 'third-parties' },
  { value: 'fraud', label: 'Fraud investigation', group: 'fraud-compliance' },
  { value: 'compliance', label: 'Regulatory compliance', group: 'fraud-compliance' },
  { value: 'customer', label: 'Complaints and customer care', group: 'fraud-compliance' },
];

export const RISKS = [
  { value: 'low', label: 'Low risk', rank: 1 },
  { value: 'medium', label: 'Medium risk', rank: 2 },
  { value: 'high', label: 'High risk', rank: 3 },
  { value: 'critical', label: 'Critical risk', rank: 4 },
];

export const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', rank: 1 },
  { value: 'moderate', label: 'Moderate', rank: 2 },
  { value: 'hard', label: 'Hard', rank: 3 },
  { value: 'expert', label: 'Expert', rank: 4 },
];

export const CONFIDENCES = [
  { value: 'low', label: 'Low confidence' },
  { value: 'medium', label: 'Medium confidence' },
  { value: 'high', label: 'High confidence' },
];

export const VEHICLES = [
  { value: 'car', label: 'Car' },
  { value: 'suv', label: 'SUV or 4x4' },
  { value: 'ev', label: 'Electric car' },
  { value: 'two-wheeler', label: 'Motorcycle or scooter' },
  { value: 'van', label: 'Van' },
  { value: 'pickup', label: 'Pickup, ute or bakkie' },
  { value: 'truck', label: 'Truck or HGV' },
  { value: 'bus', label: 'Bus or coach' },
  { value: 'taxi', label: 'Taxi or private hire' },
  { value: 'auto-rickshaw', label: 'Auto-rickshaw' },
];

export const WEATHER = [
  { value: 'clear', label: 'Clear or dry' },
  { value: 'rain', label: 'Rain' },
  { value: 'heavy-rain', label: 'Heavy rain or monsoon' },
  { value: 'flood', label: 'Flood' },
  { value: 'storm', label: 'Storm, cyclone or high wind' },
  { value: 'hail', label: 'Hail' },
  { value: 'snow-ice', label: 'Snow, ice or frost' },
  { value: 'fog', label: 'Fog or poor visibility' },
  { value: 'heat', label: 'Extreme heat' },
  { value: 'wildfire', label: 'Wildfire or smoke' },
  { value: 'dust', label: 'Dust or sandstorm' },
];

export const ACCIDENT_TYPES = [
  { value: 'rear-end', label: 'Rear-end' },
  { value: 'head-on', label: 'Head-on' },
  { value: 'side-impact', label: 'Side impact' },
  { value: 'lane-change', label: 'Lane change or blind spot' },
  { value: 'roundabout', label: 'Roundabout' },
  { value: 'intersection', label: 'Junction or traffic lights' },
  { value: 'parking', label: 'Parking' },
  { value: 'reversing', label: 'Reversing' },
  { value: 'hit-and-run', label: 'Hit-and-run' },
  { value: 'multi-vehicle', label: 'Multi-vehicle' },
  { value: 'single-vehicle', label: 'Single vehicle or loss of control' },
  { value: 'fixed-object', label: 'Wall, pole or fixed object' },
  { value: 'pedestrian', label: 'Pedestrian' },
  { value: 'cyclist', label: 'Cyclist or e-scooter' },
  { value: 'animal', label: 'Animal' },
  { value: 'none', label: 'No collision' },
];

// The eleven filters the library offers, in the order the UI shows them. Options with a `group`
// are shown under that group's heading.
export const FILTERS = [
  { key: 'country', label: 'Country', all: 'All countries', options: COUNTRIES },
  { key: 'stage', label: 'Claim stage', all: 'All claim stages', options: STAGES, groups: STAGE_GROUPS },
  { key: 'category', label: 'Category', all: 'All categories', options: CATEGORIES },
  { key: 'claimType', label: 'Claim type', all: 'All claim types', options: CLAIM_TYPES },
  { key: 'intent', label: 'Intent', all: 'All intents', options: INTENTS },
  { key: 'fraudType', label: 'Fraud type', all: 'All fraud types', options: FRAUD_TYPES },
  { key: 'risk', label: 'Risk level', all: 'All risk levels', options: RISKS },
  { key: 'difficulty', label: 'Difficulty', all: 'All difficulties', options: DIFFICULTIES },
  { key: 'vehicle', label: 'Vehicle type', all: 'All vehicles', options: VEHICLES },
  { key: 'weather', label: 'Weather', all: 'All weather', options: WEATHER },
  { key: 'accidentType', label: 'Accident type', all: 'All accident types', options: ACCIDENT_TYPES },
];

export const FILTER_KEYS = FILTERS.map((f) => f.key);

const LISTS = {
  country: COUNTRIES,
  stage: STAGES,
  category: CATEGORIES,
  claimType: CLAIM_TYPES,
  intent: INTENTS,
  fraudType: FRAUD_TYPES,
  risk: RISKS,
  difficulty: DIFFICULTIES,
  confidence: CONFIDENCES,
  vehicle: VEHICLES,
  weather: WEATHER,
  accidentType: ACCIDENT_TYPES,
};

const INDEX = Object.fromEntries(Object.entries(LISTS).map(([key, list]) => [key, new Map(list.map((o) => [o.value, o]))]));

export const optionsFor = (key) => LISTS[key] ?? [];
export const isValid = (key, value) => Boolean(INDEX[key]?.has(value));
export const labelOf = (key, value) => INDEX[key]?.get(value)?.label ?? value ?? '';
export const intentFamily = (intent) => INDEX.intent.get(intent)?.family ?? null;
export const rankOf = (key, value) => INDEX[key]?.get(value)?.rank ?? 0;
export const countryName = (code) => labelOf('country', code);
export const stageGroupOf = (stage) => STAGE_GROUPS.find((g) => g.value === INDEX.stage.get(stage)?.group) ?? null;
