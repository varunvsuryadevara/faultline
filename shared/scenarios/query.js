import { COUNTRIES, FILTER_KEYS, labelOf, rankOf, stageGroupOf } from './vocab.js';

// Filtering, natural-language search, facet counts and random picks over the scenario library.
// Pure functions shared by the API server and the browser, so both give identical results.

const STOPWORDS = new Set(
  'us a an the and or of in on at to for from by with about into over near after before during while where when who what which that this these those is are was were be been being show me find give list get some any all claim claims scenario scenarios case cases example examples involving involve involves related type types kind kinds please i want need like'.split(
    ' ',
  ),
);

// Words people use in searches, mapped to the words the scenarios use. Each query word becomes a
// group of alternatives; a scenario matches the group when any alternative starts a word in it.
const SYNONYMS = {
  bike: ['bike', 'motorcycle', 'motorbike', 'two-wheeler', 'two wheeler', 'scooter', 'cyclist', 'bicycle', 'boda'],
  motorbike: ['motorbike', 'motorcycle', 'two-wheeler', 'two wheeler', 'scooter'],
  motorcycle: ['motorcycle', 'motorbike', 'two-wheeler', 'two wheeler', 'scooter', 'boda'],
  scooter: ['scooter', 'two-wheeler', 'two wheeler', 'activa', 'pmd', 'e-scooter'],
  twowheeler: ['two-wheeler', 'two wheeler', 'motorcycle', 'scooter'],
  cyclist: ['cyclist', 'cyclists', 'bicycle', 'bike', 'cycle lane', 'cycling'],
  ev: ['ev', 'electric car', 'electric vehicle', 'electric scooter', 'e-scooter', 'battery', 'charging', 'charger'],
  electric: ['electric', 'ev', 'battery'],
  flood: ['flood', 'floodwater', 'submerged', 'monsoon', 'storm surge', 'waterlogged', 'water entered', 'hydrostatic', 'hydrolock', 'dana'],
  flooding: ['flood', 'floodwater', 'submerged', 'monsoon', 'storm surge', 'waterlogged'],
  monsoon: ['monsoon', 'heavy rain', 'flood', 'waterlogged'],
  rain: ['rain', 'raining', 'rainfall', 'wet', 'monsoon', 'downpour', 'storm'],
  storm: ['storm', 'cyclone', 'hurricane', 'tornado', 'gale', 'wind', 'lightning', 'tempête'],
  wind: ['wind', 'gust', 'gale', 'storm', 'cyclone'],
  snow: ['snow', 'snowing', 'ice', 'icy', 'black ice', 'frost', 'winter', 'snowplow', 'snowplough'],
  ice: ['ice', 'icy', 'black ice', 'frost', 'winter', 'snow'],
  fire: ['fire', 'burnt', 'burned', 'burning', 'blaze', 'arson', 'flames', 'wildfire', 'bushfire'],
  wildfire: ['wildfire', 'bushfire', 'smoke', 'ash'],
  theft: ['theft', 'stolen', 'steal', 'hijack', 'carjack', 'robbery', 'roubo'],
  stolen: ['stolen', 'theft', 'steal', 'hijack', 'carjack', 'robbery'],
  hijacking: ['hijack', 'carjack', 'robbery', 'gunpoint'],
  carjacking: ['carjack', 'hijack', 'robbery', 'gunpoint'],
  catalytic: ['catalytic', 'silencer', 'converter'],
  fraud: ['fraud', 'staged', 'fake', 'false', 'induced collision', 'induced accident', 'deliberately induced', 'provoked', 'ghost', 'collusion', 'fraudulent'],
  scam: ['scam', 'fraud', 'staged', 'fake', 'ghost', 'induced collision', 'induced accident', 'deliberately induced', 'provoked'],
  fake: ['fake', 'false', 'forged', 'bogus', 'ghost', 'invalid'],
  staged: ['staged', 'induced collision', 'induced accident', 'deliberately induced', 'provoked', 'crash-for-cash', 'crash for cash', 'swoop', 'slam', 'brake-check', 'deliberately'],
  garage: ['garage', 'workshop', 'body shop', 'repairer', 'panel beater', 'mechanic', 'werkstatt', 'service centre'],
  repairer: ['repairer', 'garage', 'workshop', 'body shop', 'panel beater'],
  invoice: ['invoice', 'bill', 'estimate', 'receipt', 'gstin'],
  dashcam: ['dashcam', 'dash cam', 'dashboard camera', 'in-car camera'],
  cctv: ['cctv', 'camera', 'footage'],
  injury: ['injury', 'injured', 'injuries', 'whiplash', 'hurt', 'hospital', 'chiropractic', 'mact'],
  whiplash: ['whiplash', 'neck', 'soft tissue', 'injury'],
  taxi: ['taxi', 'cab', 'rideshare', 'uber', 'lyft', 'private-hire', 'private hire', 'grab', 'matatu', 'auto-rickshaw'],
  rideshare: ['rideshare', 'uber', 'lyft', 'private-hire', 'private hire', 'grab'],
  delivery: ['delivery', 'courier', 'doordash', 'swiggy', 'zomato', 'food'],
  truck: ['truck', 'lorry', 'hgv', 'semi', 'trailer', '18-wheeler'],
  lorry: ['lorry', 'truck', 'hgv'],
  bus: ['bus', 'buses', 'coach', 'minibus', 'matatu', 'danfo'],
  auto: ['auto-rickshaw', 'auto rickshaw', 'autorickshaw', 'tuk-tuk', 'auto driver', 'auto '],
  rickshaw: ['rickshaw', 'auto-rickshaw', 'tuk-tuk'],
  animal: ['animal', 'deer', 'cow', 'cattle', 'moose', 'kangaroo', 'camel', 'boar', 'wildunfall'],
  cattle: ['cattle', 'cow', 'buffalo'],
  pothole: ['pothole', 'pot hole', 'crater', 'road defect'],
  rental: ['rental', 'rented', 'hire car', 'car hire', 'cdw'],
  hire: ['hire', 'courtesy car', 'credit hire', 'rental', 'replacement vehicle'],
  towing: ['tow', 'towed', 'towing', 'recovery truck', 'recovery driver', 'recovery firm', 'recovery operator', 'storage'],
  tow: ['tow', 'towed', 'towing', 'recovery truck', 'recovery driver', 'recovery firm', 'recovery operator'],
  storage: ['storage', 'stored', 'compound', 'yard'],
  roundabout: ['roundabout', 'rotary', 'traffic circle'],
  junction: ['junction', 'intersection', 'crossroads', 'signal', 'traffic light'],
  intersection: ['intersection', 'junction', 'crossroads', 'signal'],
  motorway: ['motorway', 'freeway', 'interstate', 'expressway', 'highway', 'autobahn'],
  highway: ['highway', 'motorway', 'freeway', 'interstate', 'expressway', 'autobahn', ' nh'],
  phone: ['phone', 'mobile', 'texting', 'distracted', 'app'],
  drunk: ['drunk', 'alcohol', 'dui', 'drink-driving', 'drink driving', 'intoxicated'],
  licence: ['licence', 'license', 'unlicensed', 'learner'],
  license: ['license', 'licence', 'unlicensed', 'learner'],
  passenger: ['passenger', 'passengers', 'occupant', 'jump-in'],
  hail: ['hail', 'hailstorm', 'hailstones', 'grele', 'hagel'],
  windscreen: ['windscreen', 'windshield', 'glass', 'chip'],
  windshield: ['windshield', 'windscreen', 'glass', 'chip'],
  'write-off': ['write-off', 'written off', 'total loss', 'totaled', 'ctl', 'cat s', 'cat n'],
  writeoff: ['write-off', 'written off', 'total loss', 'totaled', 'ctl'],
  telematics: ['telematics', 'black box', 'gps', 'tracker', 'vltd', 'eld'],
  surveyor: ['surveyor', 'assessor', 'gutachter', 'expert', 'loss adjuster'],
  fir: ['fir', 'first information report'],
  cash: ['cash', 'crash-for-cash', 'crash for cash'],
  exaggerated: ['exaggerat', 'inflated', 'added', 'padded'],
  inflated: ['inflated', 'exaggerat', 'padded', 'overcharg'],
  genuine: ['genuine'],
  suspicious: ['suspicious', 'suspicion'],
  duplicate: ['duplicate', 'twice', 'double', 'two insurers'],
  late: ['late', 'delay', 'delayed', 'days later', 'weeks later'],
  delay: ['delay', 'delayed', 'late'],
  // Multi-word phrases (looked up with the spaces removed).
  catalyticconverter: ['catalytic', 'silencer', 'converter'],
  carpark: ['car park', 'car-park', 'parking', 'parking lot', 'multi-storey'],
  parkinglot: ['parking lot', 'car park', 'parking'],
  hitandrun: ['hit-and-run', 'hit and run', 'drove off', 'fled', 'fahrerflucht', 'untraced'],
  crashforcash: ['crash-for-cash', 'crash for cash', 'induced collision', 'induced accident', 'deliberately induced', 'provoked', 'slammed on', 'brake-check'],
  flashforcash: ['flash-for-cash', 'flash for cash', 'flashed'],
  blackice: ['black ice', 'ice', 'icy'],
  towtruck: ['tow truck', 'tow', 'towed', 'towing', 'recovery truck'],
  heavyrain: ['heavy rain', 'monsoon', 'downpour', 'torrential'],
  flashflood: ['flash flood', 'flood', 'dana'],
  writtenoff: ['written off', 'write-off', 'total loss', 'totaled'],
  totalloss: ['total loss', 'write-off', 'written off', 'totaled', 'ctl'],
  policereport: ['police report', 'fir', 'police', 'boletim', 'saps'],
  drunkdriving: ['drunk', 'alcohol', 'dui', 'drink-driving', 'drink driving'],
  drinkdriving: ['drunk', 'alcohol', 'dui', 'drink-driving', 'drink driving'],
  blindspot: ['blind spot', 'blind-spot', 'merg', 'lane change'],
  lanechange: ['lane change', 'lane-change', 'merg', 'changed lanes', 'lane-splitting'],
  redlight: ['red light', 'red-light', 'jumped the signal', 'ran the red'],
  wrongside: ['wrong side', 'wrong-side'],
  stormsurge: ['storm surge', 'surge', 'hurricane'],
  ghostbroking: ['ghost broking', 'ghost broker', 'fake policy'],
  blackbox: ['black box', 'telematics'],
  credithire: ['credit hire', 'hire'],
  courtesycar: ['courtesy car', 'hire car', 'replacement vehicle'],
  bodyshop: ['body shop', 'garage', 'repairer', 'workshop'],
  panelbeater: ['panel beater', 'garage', 'repairer'],
  autorickshaw: ['auto-rickshaw', 'auto rickshaw', 'rickshaw', 'tuk-tuk'],
  noclaims: ['no-claims', 'no claims', 'ncd', 'ncb', 'no claim bonus'],
  accident: ['accident', 'collision', 'crash', 'incident', 'impact', 'smash', 'shunt'],
  collision: ['collision', 'accident', 'crash', 'incident', 'impact', 'smash', 'shunt'],
  damage: ['damage', 'damaged', 'dent', 'scratch', 'scrape', 'scuffed', 'crush', 'smashed', 'broken', 'shattered'],
  witness: ['witness', 'witnesses', 'onlooker', 'bystander', 'passerby', 'statement'],
  thief: ['theft', 'stolen', 'steal', 'hijack', 'carjack', 'robbery'],
  thieves: ['theft', 'stolen', 'steal', 'hijack', 'carjack', 'robbery'],
};

const COUNTRY_ALIASES = new Map();
for (const c of COUNTRIES) for (const a of c.aliases) COUNTRY_ALIASES.set(a, c.value);

export const normalize = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9₹£$€\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const WEIGHTS = {
  id: 8,
  title: 5,
  tags: 4,
  type: 4,
  facets: 3,
  story: 1.2,
  statement: 1,
  accounts: 0.8,
  damage: 0.8,
  evidence: 0.6,
  reference: 0.5,
};

const docCache = new WeakMap();
function docOf(s) {
  let doc = docCache.get(s);
  if (doc) return doc;
  const facets = [
    s.country,
    labelOf('country', s.country),
    ...(COUNTRIES.find((c) => c.value === s.country)?.aliases ?? []),
    labelOf('stage', s.stage),
    stageGroupOf(s.stage)?.label ?? '',
    labelOf('category', s.category),
    labelOf('claimType', s.claimType),
    labelOf('intent', s.intent),
    s.fraudType !== 'none' ? labelOf('fraudType', s.fraudType) : '',
    labelOf('risk', s.risk),
    labelOf('difficulty', s.difficulty),
    labelOf('vehicle', s.vehicle),
    s.weather,
    labelOf('weather', s.weather),
    s.accidentType !== 'none' ? labelOf('accidentType', s.accidentType) : '',
    s.isCustom ? 'custom customised customisation' : '',
  ].join(' | ');
  doc = {
    id: ` ${normalize(s.id)} ${normalize(s.id.replace('-', ''))}`,
    title: ` ${normalize(s.title)}`,
    tags: ` ${normalize((s.tags ?? []).join(' | '))}`,
    type: ` ${normalize(s.type)}`,
    facets: ` ${normalize(facets)}`,
    story: ` ${normalize(s.story)}`,
    statement: ` ${normalize(s.statement)}`,
    accounts: ` ${normalize((s.accounts ?? []).map((a) => `${a.who} ${a.text}`).join(' '))}`,
    damage: ` ${normalize(`${s.damage} ${(s.thirdParties ?? []).join(' ')}`)}`,
    evidence: ` ${normalize([...(s.evidence ?? []), ...(s.missing ?? [])].join(' '))}`,
    reference: ` ${normalize([s.whatHappened, s.assessment, ...(s.indicators ?? []), ...(s.inconsistencies ?? [])].join(' '))}`,
  };
  docCache.set(s, doc);
  return doc;
}

// Splits a query into groups of alternatives. Country names become country filters as well as
// search words, so "UK roundabout dashcam" finds UK roundabout scenarios that mention a dashcam.
const MULTI_WORD = [
  'crash for cash',
  'flash for cash',
  'black ice',
  'hit and run',
  'red light',
  'wrong side',
  'two wheeler',
  'storm surge',
  'ghost broking',
  'black box',
  'credit hire',
  'courtesy car',
  'body shop',
  'panel beater',
  'write off',
  'written off',
  'total loss',
  'police report',
  'drunk driving',
  'drink driving',
  'blind spot',
  'lane change',
  'catalytic converter',
  'car park',
  'parking lot',
  'auto rickshaw',
  'heavy rain',
  'flash flood',
  'tow truck',
  'no claims',
];

export function parseQuery(query) {
  const raw = String(query ?? '');
  const phrases = [];
  const unquoted = raw.replace(/["\u201c\u201d]([^"\u201c\u201d]+)["\u201c\u201d]/g, (_, p) => {
    phrases.push(normalize(p));
    return ' ';
  });
  let text = ` ${normalize(unquoted)} `;
  const countries = new Set();
  // "us" is only a country when typed as US or U.S.; in lower case it is usually the pronoun.
  const saysUS = /(^|[^A-Za-z])(US|U\.S\.?)([^A-Za-z]|$)/.test(raw);
  // Longest aliases first, so "south africa" wins over "africa".
  for (const [alias, code] of [...COUNTRY_ALIASES.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (alias.length < 3 && alias !== 'uk' && alias !== 'us' && alias !== 'nz') continue;
    if (alias === 'us' && !saysUS) continue;
    while (text.includes(` ${alias} `)) {
      countries.add(code);
      text = text.replace(` ${alias} `, ' ');
    }
  }
  const groups = [];
  // Known phrases before stop words are dropped, so "crash for cash" stays one idea.
  for (const m of MULTI_WORD) {
    if (text.includes(` ${m} `)) {
      groups.push([...new Set([m, m.replace(/ /g, '-'), ...(SYNONYMS[m.replace(/ /g, '')] ?? []).map(normalize)])]);
      text = text.replace(` ${m} `, ' ');
    }
  }
  function editDistanceAtMostOne(a, b) {
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (a === b) return true;
    let diff = 0;
    let i = 0;
    let j = 0;
    while (i < la && j < lb) {
      if (a[i] !== b[j]) {
        diff += 1;
        if (diff > 1) return false;
        if (la > lb) i++;
        else if (la < lb) j++;
        else { i++; j++; }
      } else {
        i++;
        j++;
      }
    }
    return true;
  }

  const words = text.split(' ').filter((w) => w.length > 1 && !STOPWORDS.has(w));
  for (const w of words) {
    const key = w.replace(/-/g, '');
    const alts = new Set([w]);

    // Check inflections (plurals, verb endings)
    const bases = [w, key];
    if (w.endsWith('ies') && w.length > 4) bases.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es') && w.length > 4) bases.push(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) bases.push(w.slice(0, -1));
    if (w.endsWith('ing') && w.length > 5) {
      bases.push(w.slice(0, -3));
      bases.push(w.slice(0, -3) + 'e');
    }
    if (w.endsWith('ed') && w.length > 4) {
      bases.push(w.slice(0, -2));
      bases.push(w.slice(0, -1));
    }

    for (const b of bases) {
      const syn = SYNONYMS[b];
      if (syn) syn.forEach((s) => alts.add(s));
    }

    // Prefix & fuzzy lookup against SYNONYMS keys:
    // When typing (e.g. 'thef' -> 'theft', 'cras' -> 'crash', 'frau' -> 'fraud', 'roun' -> 'roundabout'),
    // or when keys are prefixes of w (e.g. 'thefts' -> 'theft'),
    // or 1-edit distance typos (e.g. 'colision' -> 'collision', 'acident' -> 'accident', 'rounabout' -> 'roundabout').
    if (w.length >= 3 && !WHOLE_WORD_EXACT.has(w)) {
      for (const [k, vals] of Object.entries(SYNONYMS)) {
        if (k.startsWith(w) || (k.length >= 4 && w.startsWith(k)) || (w.length >= 4 && editDistanceAtMostOne(w, k))) {
          alts.add(k);
          vals.forEach((s) => alts.add(s));
        }
      }
    }

    groups.push([...alts].map(normalize).filter(Boolean));
  }
  for (const p of phrases) if (p) groups.push([p]);
  return { groups, countries: [...countries] };
}

// Words that must be whole words so they don't match longer unrelated words:
// E.g. "ev" must not match "evening", "fir" must not match "fire", "us" must not match "use".
const WHOLE_WORD_EXACT = new Set(['ev', 'fir', 'nh', 'us', 'uk', 'ca', 'nz']);

// How a search word is found in a field. Very short acronyms/abbreviations (3 letters or fewer)
// must be whole words so "ev" does not match "evening" and "fir" does not match "fire".
// Words of 4 letters or more match the start of any word (e.g. "thef" matches "theft", "roun" matches
// "roundabout", "acci" matches "accident"), and stems of eight letters or more also match inside words.
const matcherCache = new Map();
function matcherFor(a) {
  let m = matcherCache.get(a);
  if (m) return m;
  if (WHOLE_WORD_EXACT.has(a) || a.length <= 3) {
    const re = new RegExp(`(^| )${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?(?=$| |\\d|-)`);
    m = (hay) => re.test(hay);
  } else if (a.length >= 8) {
    m = (hay) => hay.includes(a);
  } else {
    m = (hay) => hay.includes(` ${a}`);
  }
  matcherCache.set(a, m);
  return m;
}

// The strongest field any alternative appears in. The word the person typed counts for more than
// a synonym, and matches in several parts of the file break ties between equally strong matches.
function groupScore(doc, alternatives) {
  const literal = matcherFor(alternatives[0]);
  let best = 0;
  let literalBest = 0;
  let fields = 0;
  for (const [field, weight] of Object.entries(WEIGHTS)) {
    const hay = doc[field];
    if (!alternatives.some((a) => matcherFor(a)(hay))) continue;
    fields += 1;
    if (weight > best) best = weight;
    if (weight > literalBest && literal(hay)) literalBest = weight;
  }
  if (!best) return 0;
  return best + (literalBest ? 1 + literalBest * 0.2 : 0) + fields * 0.05;
}

export function matchesFilters(s, filters = {}, skipKey = null) {
  for (const key of FILTER_KEYS) {
    if (key === skipKey) continue;
    const want = filters[key];
    if (want === undefined || want === null || want === '' || (Array.isArray(want) && want.length === 0)) continue;
    const values = Array.isArray(want) ? want : [want];
    if (!values.includes(s[key])) return false;
  }
  return true;
}

const SORTS = {
  relevance: null,
  id: (a, b) => a.s.id.localeCompare(b.s.id),
  'risk-desc': (a, b) => rankOf('risk', b.s.risk) - rankOf('risk', a.s.risk) || a.order - b.order,
  'risk-asc': (a, b) => rankOf('risk', a.s.risk) - rankOf('risk', b.s.risk) || a.order - b.order,
  'difficulty-desc': (a, b) => rankOf('difficulty', b.s.difficulty) - rankOf('difficulty', a.s.difficulty) || a.order - b.order,
  'difficulty-asc': (a, b) => rankOf('difficulty', a.s.difficulty) - rankOf('difficulty', b.s.difficulty) || a.order - b.order,
};
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'id', label: 'Scenario ID' },
  { value: 'risk-desc', label: 'Highest risk first' },
  { value: 'risk-asc', label: 'Lowest risk first' },
  { value: 'difficulty-desc', label: 'Hardest first' },
  { value: 'difficulty-asc', label: 'Easiest first' },
];

/**
 * Runs filters and an optional natural-language query.
 * Returns { items, total, partial } where partial is true when no scenario matched every search
 * word and the results fall back to scenarios that match most of them.
 */
export function queryScenarios(list, { filters = {}, q = '', sort = 'relevance' } = {}, skipKey = null) {
  const query = typeof q === 'string' ? q.trim() : '';
  const parsed = query ? parseQuery(query) : { groups: [], countries: [] };
  const filtered = list.filter(
    (s) => matchesFilters(s, filters, skipKey) && (!parsed.countries.length || parsed.countries.includes(s.country)),
  );
  let scored = filtered.map((s, order) => ({ s, order, score: 0, hits: 0 }));
  let partial = false;

  if (parsed.groups.length) {
    for (const row of scored) {
      const doc = docOf(row.s);
      for (const g of parsed.groups) {
        const gs = groupScore(doc, g);
        if (gs > 0) {
          row.hits += 1;
          row.score += gs;
        }
      }
    }
    const all = scored.filter((r) => r.hits === parsed.groups.length);
    if (all.length) scored = all;
    else {
      scored = scored.filter((r) => r.hits > 0);
      partial = scored.length > 0;
    }
    scored.sort((a, b) => b.hits - a.hits || b.score - a.score || a.order - b.order);
  }
  const sorter = SORTS[sort];
  if (sorter) scored.sort(sorter);
  return { items: scored.map((r) => r.s), total: scored.length, partial };
}

// For each filter, how many scenarios each value would leave given the other active filters and
// the search, so the dropdowns can show counts and hide dead ends.
export function facetCounts(list, { filters = {}, q = '' } = {}) {
  const out = {};
  for (const key of FILTER_KEYS) {
    const { items } = queryScenarios(list, { filters, q }, key);
    const counts = {};
    for (const s of items) counts[s[key]] = (counts[s[key]] ?? 0) + 1;
    out[key] = counts;
  }
  return out;
}

export function randomScenario(list, { exclude, random = Math.random } = {}) {
  const pool = list.length > 1 && exclude ? list.filter((s) => s.id !== exclude) : list;
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)];
}

// The compact form used in result lists and the list API.
export function summaryOf(s) {
  const firstSentence = (s.story.match(/^.*?[.!?](\s|$)/)?.[0] ?? s.story).trim();
  return {
    id: s.id,
    title: s.title,
    country: s.country,
    stage: s.stage,
    category: s.category,
    type: s.type,
    claimType: s.claimType,
    intent: s.intent,
    fraudType: s.fraudType,
    risk: s.risk,
    difficulty: s.difficulty,
    vehicle: s.vehicle,
    weather: s.weather,
    accidentType: s.accidentType,
    summary: firstSentence.length > 220 ? `${firstSentence.slice(0, 219).trimEnd()}…` : firstSentence,
  };
}

// Reads filters from URL query parameters (comma-separated values allowed).
export function filtersFromParams(params) {
  const filters = {};
  for (const key of FILTER_KEYS) {
    const raw = params[key];
    if (raw === undefined || raw === '') continue;
    const values = (Array.isArray(raw) ? raw : String(raw).split(',')).map((v) => String(v).trim()).filter(Boolean);
    if (values.length) filters[key] = values;
  }
  return filters;
}
