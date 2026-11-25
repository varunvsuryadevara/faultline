// AI evaluation cases for UK-048 to UK-058. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-012',
    scenario: 'UK-048',
    title: 'Whiplash claim longer than the medical prognosis',
    rule: 'Whiplash claims are valued on the statutory tariff by duration, using the medical evidence; any uplift for exceptional circumstances is capped and must be proved, and lost earnings need records.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Values the injury on the medical prognosis, not the longer period claimed', any: ['exaggerated in duration', 'overstated', 'longer than the medical', 'longer than the prognosis', 'exceeds the prognosis', 'exceeds the medical', 'beyond the prognosis', '6-month injury', 'six-month injury', 'value on 6 months', 'value it at 6 months', 'tariff for 6 months', 'tariff for six months', 'tariff for a 6', 'tariff for a six'], required: true },
        { label: 'Puts the salon post to her side as an inconsistency', any: ['put the instagram', 'put the post', 'raise the post', 'raise the instagram', 'ask about the post', 'contradicts her', 'inconsistent with her', 'undermines', 'who posted', 'scheduled'], required: true },
        { label: 'Asks for proof of the lost earnings', any: ['tax return', 'invoices', 'appointment book', 'business records', 'proof of earnings', 'evidence of earnings', 'earnings evidence'] },
        { label: 'Values on the tariff and questions the uplift', any: ['tariff', 'uplift', 'exceptional'] },
      ],
    },
  },
  {
    id: 'TC-013',
    scenario: 'UK-049',
    title: 'Foreign lorry lane change and evidence preservation',
    rule: 'Claims against foreign vehicles in the UK go to the vehicle insurer’s UK claims representative, or the Motor Insurers’ Bureau. Lorry camera and tachograph data must be requested quickly before it is overwritten.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Uses the dashcam timing and the steady legal speed', any: ['steady speed', 'not speeding', 'steady 64', 'within the limit'], required: true },
        { label: 'Asks for the lorry’s footage, tachograph or sensor data', any: ['tachograph', "lorry's camera", 'lorry camera', 'lorry footage', "lorry's footage", 'preserv', 'sensor data', 'blind-spot sensor', 'blind spot sensor'], required: true },
        { label: 'Routes the claim through the foreign insurer’s UK representative or the MIB', any: ['claims handling agent', 'claims representative', 'green card', 'mib', "motor insurers' bureau", 'foreign insurer', "lorry's insurer"] },
      ],
    },
  },
  {
    id: 'TC-014',
    scenario: 'UK-050',
    title: 'Child injury settlement needs court approval',
    rule: 'A settlement with a child (under 18) is only binding once approved by the court (CPR Part 21); limitation does not start until the child turns 18. Speeding outside a school weighs heavily on liability.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Says the settlement must be approved by the court', any: ['court approval', 'approved by the court', 'approval of the court', 'court must approve', 'part 21', 'cpr 21', 'infant approval', 'approval hearing', 'court-approved', 'court approved'], required: true },
        { label: 'Notes 24 mph in a 20 mph zone', any: ['over the limit', 'speeding', 'exceeded the'], required: true },
        { label: 'Mentions limitation running from age 18', any: ['18', 'eighteen', 'limitation'] },
        { label: 'Gets medical evidence or offers an interim payment', any: ['medical report', 'interim payment', 'scar'] },
      ],
    },
  },
  {
    id: 'TC-015',
    scenario: 'UK-051',
    title: 'Part 36 offer about to expire',
    rule: 'A Part 36 offer has a relevant period (here 21 days). If the claimant beats her own offer at trial, the defendant faces enhanced interest, indemnity costs and an additional amount.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Identifies the deadline (21 days from 3 March)', any: ['24 march', 'deadline', 'expire'], required: true },
        { label: 'Explains the costs risk of ignoring the offer', any: ['costs consequence', 'indemnity costs', 'enhanced interest', 'additional amount', 'additional sum', 'adverse costs', 'penalt'], required: true },
        { label: 'Sees the van turning across a cyclist in a cycle lane', any: ['left hook', 'turned left across', 'turning left', 'cycle lane', 'overtook'] },
      ],
    },
  },
  {
    id: 'TC-016',
    scenario: 'UK-052',
    title: 'Uninsured friend driving with permission',
    rule: 'Road Traffic Act 1988 section 151: the insurer must meet third-party claims even where the driver was not covered, and may recover from the driver or the person who permitted the use (s.151(8)).',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Sees that the friend was not insured to drive', any: ['not insured', 'uninsured', 'not covered', 'only the policyholder'], required: true },
        { label: 'Pays the third parties and recovers the outlay', any: ['section 151', 's.151', 's151', 'recover'], required: true },
        { label: 'Declines the policyholder’s own repairs', any: ['own damage', 'own-damage', 'his own car', 'his repairs', 'his own repairs'] },
      ],
    },
  },
  {
    id: 'TC-017',
    scenario: 'UK-053',
    title: 'Car park exclusion sign and a known sensor fault',
    rule: 'Consumer Rights Act 2015: a term excluding liability for negligence is subject to the fairness test (and cannot exclude death or injury). Recovery is reduced for the customer’s own contributory negligence.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Challenges the operator’s exclusion of liability', any: ['consumer rights act', 'unfair term', 'fairness', 'unfair', 'not bind', 'cannot exclude', 'may not be enforceable', 'unenforceable'], required: true },
        { label: 'Uses the operator’s knowledge of the sensor fault as negligence', any: ['known sensor fault', 'known fault', 'kept in service', 'despite the fault', 'aware of the fault', 'knew of the fault', 'knew about the fault', 'evidence of negligence', 'negligent maintenance', 'failed to repair', 'failure to repair'], required: true },
        { label: 'Allows for her following too closely', any: ['tailgat', 'followed', 'following', 'contributory', 'shared', 'apportion'] },
      ],
    },
  },
  {
    id: 'TC-018',
    scenario: 'UK-054',
    title: 'Edited dashcam clip',
    rule: 'Video evidence must be authenticated. Re-encoding, missing metadata, frame-rate changes and a non-standard overlay are signs of editing; ask for the original memory card before concluding.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Treats the clip as unreliable because of signs of editing', any: ['metadata', 'font', 'tamper', 'manipulat', 'altered', 'doctored'], required: true },
        { label: 'Asks for the original memory card or files', any: ['memory card', 'sd card', 'original file', 'original footage', 'original video'], required: true },
        { label: 'Relies on the independent van footage', any: ['van camera', "van's camera", 'van operator', 'gps'] },
        { label: 'Refers to the counter-fraud team', any: ['counter-fraud', 'counter fraud', 'siu', 'fraud team', 'investigation unit', 'special investigation'] },
      ],
    },
  },
  {
    id: 'TC-019',
    scenario: 'UK-055',
    title: 'Settlement diversion by a look-alike email',
    rule: 'Payment diversion: verify any change of bank details through a known, independent contact before paying; the customer is the victim, not the suspect.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Spots the look-alike email address', any: ['look-alike', 'lookalike', 'spoof', 'different email', 'fake email', 'similar email', 'different domain'], required: true },
        { label: 'Verifies with the customer through the number on file before paying', any: ['number on file', 'known number', 'call her', 'phone her', 'verify', 'verif'], required: true },
        { label: 'Notes the failed payee name check', any: ['confirmation of payee', 'payee', 'no match', 'j f services'] },
        { label: 'Treats the customer as the victim', any: ['victim', 'vulnerab', 'innocent', 'target'] },
      ],
    },
  },
  {
    id: 'TC-020',
    scenario: 'UK-056',
    title: 'Policy bought after the crash',
    rule: 'Cover only applies to losses after the policy starts. Moving the time of an accident to bring it into cover is a fraudulent claim; the third party is then an uninsured-driver claim for the MIB.',
    expect: {
      family: ['fraud'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Puts the accident before the policy start', any: ['before the policy', 'before cover', 'not yet insured', 'uninsured at the time', 'before inception', 'prior to inception', 'before it was bought', 'before the policy started', 'before purchasing', 'before buying'], required: true },
        { label: 'Declines the claim', any: ['decline', 'reject', 'refuse', 'repudiat', 'not covered', 'no cover'], required: true },
        { label: 'Points the Puma owner to the MIB', any: ['mib', "motor insurers' bureau", 'motor insurers bureau'] },
        { label: 'Reports or records the fraud', any: ['police', 'ifed', 'fraud register', 'cue', 'report'] },
      ],
    },
  },
  {
    id: 'TC-021',
    scenario: 'UK-057',
    title: 'Subject access request during an investigation',
    rule: 'UK GDPR: answer a subject access request within one month. The Data Protection Act 2018 crime exemption allows withholding only what would prejudice the prevention or detection of crime; the rest must be disclosed.',
    expect: {
      family: ['uncertain', 'fraud'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Identifies the one-month deadline', any: ['one month', '1 month', 'one-month', '3 march', 'calendar month'], required: true },
        { label: 'Limits withholding to the crime exemption', any: ['exemption', 'exempt', 'crime and taxation', 'schedule 2', 'redact'], required: true },
        { label: 'Still discloses non-exempt data such as call recordings', any: ['call recording', 'disclose', 'non-exempt'] },
        { label: 'Keeps the theft concerns in view', any: ['second key', 'arrears', 'finance'] },
      ],
    },
  },
  {
    id: 'TC-022',
    scenario: 'UK-058',
    title: 'Bereaved spouse reporting the claim',
    rule: 'Customers in vulnerable circumstances (here bereavement) need adapted handling: one contact, minimal repetition, clear steps. The settlement goes to the estate; the fatal claim is against the at-fault driver’s insurer.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Recognises the vulnerability and adapts the handling', any: ['vulnerab', 'bereave', 'sensitiv', 'compassion', 'single point of contact', 'one point of contact', 'named contact', 'dedicated'], required: true },
        { label: 'Sees the policyholder was not at fault', any: ['not at fault'], required: true },
        { label: 'Explains the estate receives the settlement', any: ['estate', 'executor', 'personal representative', 'probate', 'administrator'] },
        { label: 'Arranges a replacement vehicle', any: ['replacement', 'hire car', 'courtesy car'] },
      ],
    },
  },
];
