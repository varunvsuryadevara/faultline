import { LIMITS } from '../constants.js';
import { isValid } from './vocab.js';

// Structural checks for scenario records. Run by the offline tests and when the server starts,
// so a malformed record added later is caught before anyone sees it.

const TEXT_FIELDS = ['title', 'type', 'story', 'statement', 'whatHappened', 'damage', 'assessment', 'action'];
const LIST_FIELDS = ['thirdParties', 'evidence', 'missing', 'inconsistencies', 'indicators', 'innocent', 'questions', 'steps', 'outcomes'];
const NON_EMPTY_LISTS = ['thirdParties', 'evidence', 'missing', 'innocent', 'questions', 'steps', 'outcomes'];
const VOCAB_FIELDS = [
  'country',
  'stage',
  'category',
  'claimType',
  'intent',
  'fraudType',
  'risk',
  'difficulty',
  'confidence',
  'vehicle',
  'weather',
  'accidentType',
];

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

export function scenarioProblems(s) {
  const problems = [];
  if (!s || typeof s !== 'object') return ['not an object'];
  if (!/^[A-Z]{2}-\d{3}$/.test(s.id ?? '')) problems.push(`id "${s.id}" should look like UK-001`);
  for (const f of TEXT_FIELDS) if (!isText(s[f])) problems.push(`${f} is missing`);
  for (const f of LIST_FIELDS) {
    if (!Array.isArray(s[f])) problems.push(`${f} should be a list`);
    else if (s[f].some((x) => !isText(x))) problems.push(`${f} has an empty item`);
  }
  for (const f of NON_EMPTY_LISTS) if (Array.isArray(s[f]) && s[f].length === 0) problems.push(`${f} is empty`);
  for (const f of VOCAB_FIELDS) if (!isValid(f, s[f])) problems.push(`${f} "${s[f]}" is not in the vocabulary`);
  if (s.tags !== undefined && (!Array.isArray(s.tags) || s.tags.some((t) => !isText(t)))) problems.push('tags should be a list of words');
  if (s.accounts !== undefined) {
    if (!Array.isArray(s.accounts) || s.accounts.length > 3) problems.push('accounts should be a list of at most 3');
    else
      s.accounts.forEach((a, i) => {
        if (!isText(a?.who) || a.who.length > LIMITS.maxLabelChars) problems.push(`accounts[${i}].who is missing or too long`);
        if (!isText(a?.text) || a.text.length < LIMITS.minChars) problems.push(`accounts[${i}].text is missing or too short`);
      });
  }
  if (s.claimant !== undefined && (!isText(s.claimant) || s.claimant.length > 60)) problems.push('claimant should be a short name');
  // Fraud indicators belong with fraud-flavoured intents; a genuine scenario can still list
  // "indicators" that turn out to be innocent, so only the reverse is enforced.
  if (['potential-fraud', 'confirmed-fraud', 'third-party-fraud', 'organised-fraud'].includes(s.intent) && s.indicators?.length === 0) {
    problems.push('a fraud scenario needs at least one fraud indicator');
  }
  if (s.intent !== 'genuine' && s.category !== 'grey-area' && s.fraudType === undefined) problems.push('fraudType is missing');
  return problems;
}

export function libraryProblems(list) {
  const problems = [];
  const seen = new Set();
  const titles = new Set();
  for (const s of list) {
    for (const p of scenarioProblems(s)) problems.push(`${s?.id ?? '?'}: ${p}`);
    if (seen.has(s.id)) problems.push(`${s.id}: duplicate id`);
    seen.add(s.id);
    const t = s.title?.trim().toLowerCase();
    if (titles.has(t)) problems.push(`${s.id}: duplicate title "${s.title}"`);
    titles.add(t);
  }
  return problems;
}
