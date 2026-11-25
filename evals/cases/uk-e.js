// AI evaluation cases for UK-037 to UK-047. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-001',
    scenario: 'UK-037',
    title: 'Late notice after a private deal with the other driver',
    rule: 'Claims condition: report every incident promptly and do not settle privately. Late notice is a breach, but third-party claims are still handled; what matters is whether the delay caused prejudice.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Notices the claim was reported months late', any: ['late notif', 'notified late', 'late report', 'reported late', '5 months', 'five-month', '5-month', 'delay in notif', 'delayed notif', 'delay in report', 'failure to notify', 'failed to notify', 'did not notify', "didn't notify", 'did not report', 'delayed report'], required: true },
        { label: 'Deals with the private settlement under the policy conditions', any: ['credit for the', 'give credit', 'deduct the 650', 'offset', 'set off', 'private deal', 'private arrangement', 'private settlement', 'without telling the insurer', 'without telling his insurer', 'claims condition', 'policy condition', 'breach of the condition', 'breaches the policy'], required: true },
        { label: 'Asks for medical evidence before paying the injury claims', any: ['medical report', 'medical evidence', 'medical records', 'medco'] },
        { label: 'Keeps handling the third-party claims', any: ['third-party claim', 'third party claim', 'injury claims', 'portal', 'official injury claim'] },
      ],
    },
  },
  {
    id: 'TC-002',
    scenario: 'UK-038',
    title: 'Claims firm notifies a claim the policyholder never authorised',
    rule: 'Authority to act: only deal with a representative the customer has genuinely instructed; do not accept charges built up by a firm whose authority is unproved. Personal data passed on without consent is a data protection issue.',
    expect: {
      family: ['uncertain', 'fraud'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Questions the claims firm’s authority to act', any: ['authoriz', 'mandate', 'consent', 'did not instruct', "didn't instruct", 'never instructed', 'not instructed'], required: true },
        { label: 'Refuses the storage charges until authority is proved', any: ['do not pay storage', "don't pay storage", 'not pay storage', 'not pay the storage', 'refuse the storage', 'refuse storage', 'decline the storage', 'reject the storage', 'not accept the storage', 'dispute the storage', 'challenge the storage', 'storage charges should not', 'move the car', 'arrange collection', 'not release the car', 'do not release'], required: true },
        { label: 'Spots the unsolicited recovery truck', any: ['tow truck', 'recovery truck', 'recovery operator', 'unsolicited', 'not called', 'breakdown'] },
        { label: 'Considers how his personal data reached the firm', any: ['data protection', 'personal data', 'gdpr', 'his details', 'data was'] },
      ],
    },
  },
  {
    id: 'TC-003',
    scenario: 'UK-039',
    title: 'Driving-other-cars extension on an uninsured car',
    rule: 'Driving-other-cars extensions usually give third-party cover only, and only when the borrowed car is insured by its owner under its own policy.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Sees that the borrowed car was not insured', any: ['not insured', 'uninsured', 'no insurance'], required: true },
        { label: 'Concludes the extension does not apply', any: ['not covered', 'no cover', 'does not apply', "doesn't apply", 'not apply', 'decline', 'not met', 'cannot rely', 'outside the cover', 'not satisfied'], required: true },
        { label: 'Explains the van owner’s route (own insurer or MIB)', any: ['mib', "motor insurers' bureau", 'motor insurers bureau', 'own insurer', 'own policy'] },
      ],
    },
  },
  {
    id: 'TC-004',
    scenario: 'UK-040',
    title: 'Cancellation notice that bounced',
    rule: 'An insurer can only rely on a cancellation for non-payment if it gave notice as the policy terms require. A notice that never reached the customer, which the insurer knew had failed, is unlikely to be valid; fair treatment duties apply.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Spots that the cancellation notice was never delivered', any: ['bounce', 'not delivered', 'never delivered', 'typo', 'mistyped', 'wrong email', 'incorrect email', 'never received', 'did not receive', 'not received'], required: true },
        { label: 'Questions whether the cancellation was valid', any: ['not valid', 'invalid', 'validity', 'whether the cancellation', 'ineffective', 'still in force', 'remains in force', 'remained in force', 'reinstat', 'not properly', 'improperly', 'notice requirement', 'not given notice', 'notice was not'], required: true },
        { label: 'Considers fair treatment of the customer', any: ['consumer duty', 'fair', 'treating customers', 'four years', 'goodwill'] },
      ],
    },
  },
  {
    id: 'TC-005',
    scenario: 'UK-041',
    title: 'Learner supervised by someone licensed for under three years',
    rule: 'A learner’s supervisor must be at least 21 and have held a full licence for that type of vehicle for three years. Breach removes the learner’s own cover, but third parties are still protected.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Identifies the supervisor did not meet the three-year rule', any: ['3 years', 'three-year', '3-year', 'less than three', 'under three', 'not qualified', 'unqualified', 'did not meet', "didn't meet", 'not meet', 'does not meet', "doesn't meet"], required: true },
        { label: 'Still deals with the parked Kia owner’s claim', any: ['third party', 'third-party'], required: true },
        { label: 'Addresses the learner’s own damage or recovery', any: ['own damage', 'own-damage', 'her repairs', 'her own', 'recover'] },
      ],
    },
  },
  {
    id: 'TC-006',
    scenario: 'UK-042',
    title: 'Comprehensive cover abroad ran out after 90 days',
    rule: 'Cover abroad: UK policies give the legal minimum in the EU, and full cover only for the days stated. "Any one period of insurance" means the days are not reset by a trip home.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Finds the 90 days of full cover were used up', any: ['used up', 'had ended', 'has ended', 'expired', 'exceeded the 90', 'beyond the 90', 'outside the 90', 'after the 90', 'past the 90', 'more than 90', 'over 90', '90-day', 'ninety'], required: true },
        { label: 'Notes the days run per period of insurance, not per trip', any: ['per period', 'not per trip', 'reset', 'restart', 'trip home'], required: true },
        { label: 'Keeps the Spanish third party covered at the legal minimum', any: ['minimum', 'third-party', 'third party'] },
        { label: 'Raises the broker’s advice', any: ['broker'] },
      ],
    },
  },
  {
    id: 'TC-007',
    scenario: 'UK-043',
    title: 'Car-share fuel money is not hire and reward',
    rule: 'Road Traffic Act 1988 section 150: car-sharing contributions that do not exceed running costs, arranged before the journey, in a car carrying no more than eight passengers, are not hire or reward.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Concludes the payments are car-sharing contributions, not fares', any: ['section 150', 's.150', 's150', 'car shar', 'car-shar', 'running cost', 'cost-sharing', 'cost sharing', 'not hire or reward', 'not hire and reward', 'no profit', 'not for profit', 'does not exceed', 'below the cost', 'less than the cost'], required: true },
        { label: 'Handles the passengers’ injuries', any: ['injur', 'passenger'] },
        { label: 'Accepts fault for pulling out in fog', any: ['pulled out', 'at fault', 'liability', 'fog'] },
      ],
    },
  },
  {
    id: 'TC-008',
    scenario: 'UK-044',
    title: 'Supplement that includes old corrosion',
    rule: 'Supplementary estimates after strip-down are normal, but only crash damage is paid; pre-existing corrosion is betterment or wear. Inspect before approving a large supplement.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Uses the MOT advisory to show the corrosion pre-dates the crash', any: ['pre-exist', 'pre-dates', 'predates', 'corrosion'], required: true },
        { label: 'Asks for an engineer’s inspection before approving', any: ['engineer', 'inspect', 'independent assess', 'physical inspection'], required: true },
        { label: 'Accepts the chassis leg as crash damage', any: ['chassis leg'] },
        { label: 'Applies a contribution or split', any: ['betterment', 'contribution', 'apportion', 'split'] },
      ],
    },
  },
  {
    id: 'TC-009',
    scenario: 'UK-045',
    title: 'Betterment on worn exhaust and tyres',
    rule: 'Indemnity puts the car back as it was. Replacing worn, undamaged parts is betterment, but no contribution should be charged where a like-for-like partial repair was not possible.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Pays only for parts the accident damaged', any: ['replaced by choice', 'should not be paid', 'not be paid for', 'parts the accident damaged', 'only the damaged', 'damaged parts only', 'wear and tear', 'pre-existing', 'not caused by the accident', 'keep the tyre deduction', 'not accident damage'], required: true },
        { label: 'Checks whether the damaged exhaust section could be bought on its own', any: ['section alone', 'on its own', 'separately', 'partial repair', 'available'], required: true },
        { label: 'Does not pay for the undamaged offside tyres', any: ['offside', 'two tyres', '2 tyres', 'tread'] },
      ],
    },
  },
  {
    id: 'TC-010',
    scenario: 'UK-046',
    title: 'Agreed value policy offered market value',
    rule: 'On an agreed value policy the agreed sum is paid for a total loss, unless something material was misstated or has changed since it was agreed.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Settles at the agreed value, not market value', any: ['settle at the agreed', 'pay the agreed', 'agreed value binds', 'binding', 'bound by the agreed', '24,000 less', 'not market value', 'not the auction', 'rather than market', 'instead of market', 'auction values do not', 'auction prices do not', 'should not use auction', 'not auction'], required: true },
        { label: 'Recovers from the tractor’s insurer', any: ['recover', 'subrogat'], required: true },
        { label: 'Checks nothing material changed since the valuation', any: ['changed', 'misrepresent', 'valuation report', 'material'] },
      ],
    },
  },
  {
    id: 'TC-011',
    scenario: 'UK-047',
    title: 'Stolen car recovered after the payout',
    rule: 'After a total loss settlement the insurer owns the vehicle; a recovered car is the insurer’s salvage, and a buy-back can be offered. Theft registers must be updated.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Says the car now belongs to the insurer', any: ['belongs to the insurer', "insurer's property", 'insurer owns', 'ownership', 'title', 'salvage'], required: true },
        { label: 'Offers a buy-back or explains the options', any: ['buy back', 'buy-back', 'buyback', 'repurchase', 'purchase'], required: true },
        { label: 'Updates the theft register and police', any: ['theft register', 'register', 'police'] },
      ],
    },
  },
];
