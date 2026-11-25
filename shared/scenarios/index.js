import { libraryProblems } from './validate.js';
import { EXISTING_STAGES } from './stages.js';
import UK from './data/uk.js';
import UK_B from './data/uk-b.js';
import UK_C from './data/uk-c.js';
import UK_D from './data/uk-d.js';
import UK_E from './data/uk-e.js';
import UK_F from './data/uk-f.js';
import US from './data/us.js';
import US_B from './data/us-b.js';
import US_C from './data/us-c.js';
import US_D from './data/us-d.js';
import US_E from './data/us-e.js';
import US_F from './data/us-f.js';
import IN from './data/in.js';
import IN_B from './data/in-b.js';
import IN_C from './data/in-c.js';
import IN_D from './data/in-d.js';
import IN_E from './data/in-e.js';
import IN_F from './data/in-f.js';
import CA from './data/ca.js';
import CA_B from './data/ca-b.js';
import AU from './data/au.js';
import AU_B from './data/au-b.js';
import AE from './data/ae.js';
import AE_B from './data/ae-b.js';
import DE from './data/de.js';
import DE_B from './data/de-b.js';
import FR from './data/fr.js';
import FR_B from './data/fr-b.js';
import ZA from './data/za.js';
import ZA_B from './data/za-b.js';
import SG from './data/sg.js';
import SG_B from './data/sg-b.js';
import OTHER from './data/other.js';
import OTHER_B from './data/other-b.js';

// The motor claims scenario library. Each data file is a plain list of records (see
// shared/scenarios/validate.js for the fields); add a record to a file and it appears in the
// library, the filters, the search and the API with no other change. Large countries are split
// across several files (uk.js, uk-b.js, ...) only to keep each file a manageable size.
// Files ending -e, -f (and ca-b.js, au-b.js, ...) hold the claims-stage pack: UK-037 onwards.
const RECORDS = [
  ...UK, ...UK_B, ...UK_C, ...UK_D, ...UK_E, ...UK_F,
  ...US, ...US_B, ...US_C, ...US_D, ...US_E, ...US_F,
  ...IN, ...IN_B, ...IN_C, ...IN_D, ...IN_E, ...IN_F,
  ...CA, ...CA_B, ...AU, ...AU_B, ...AE, ...AE_B, ...DE, ...DE_B, ...FR, ...FR_B, ...ZA, ...ZA_B, ...SG, ...SG_B, ...OTHER, ...OTHER_B,
];

// Every scenario has a claim stage. The original 166 records are left exactly as written and take
// theirs from stages.js; newer records carry it themselves.
const withStage = (s) => (s.stage || !EXISTING_STAGES[s.id] ? s : { ...s, stage: EXISTING_STAGES[s.id] });

export const SCENARIOS = RECORDS.map(withStage);

export const SCENARIO_BY_ID = new Map(SCENARIOS.map((s) => [s.id, s]));

export const getScenario = (id) => SCENARIO_BY_ID.get(String(id ?? '').toUpperCase()) ?? null;

// Structural problems in the data, if any. The tests fail on these; the server logs them.
export const SCENARIO_PROBLEMS = libraryProblems(SCENARIOS);
