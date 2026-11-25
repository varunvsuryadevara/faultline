// AI evaluation cases for CA-009 to CA-013 and AU-009 to AU-013. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-065',
    scenario: 'CA-009',
    title: 'Ontario collision not reported to a reporting centre',
    rule: 'Ontario: collisions with combined damage over $2,000 (or injury) must be reported to police or a collision reporting centre. Late reporting weakens evidence but does not void cover.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Says the collision should be reported now', any: ['report to the police', 'reported to police', 'police report', '2000', 'not reported'], required: true },
        { label: 'Uses the scene photos to assess fault', any: ['impact point'], required: true },
        { label: 'Applies the Fault Determination Rules', any: ['fault determination'] },
      ],
    },
  },
  {
    id: 'TC-066',
    scenario: 'CA-010',
    title: 'Removing depreciation endorsement ignored',
    rule: 'Ontario’s removing depreciation endorsement (leased version) replaces actual cash value with the purchase price for a vehicle bought or leased new, for a set period; pay the lessor as loss payee first.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Settles under the endorsement instead of actual cash value', any: ['settle under the endorsement', 'under the endorsement', 'endorsement applies', 'endorsement she paid for', 're-settle', 'resettle', 'instead of actual cash value', 'not actual cash value', 'rather than actual cash value', 'purchase price', 'replacement cost', 'opcf', 'without depreciation'], required: true },
        { label: 'Pays the lessor first, then her', any: ['pay the lessor', 'lessor first', 'payment to the lessor', 'paid to the lessor', 'pay the leasing', 'paid to the leasing', 'balance to her', 'balance to the lessee', 'remainder to her'], required: true },
        { label: 'Checks other files for the same error', any: ['other files', 'other total losses', 'systemic', 'review'] },
      ],
    },
  },
  {
    id: 'TC-067',
    scenario: 'CA-011',
    title: 'BC Enhanced Care and the right to sue',
    rule: 'British Columbia Enhanced Care (accidents since May 2021): care-based benefits regardless of fault; the right to sue an at-fault driver for injuries removed in most cases.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Explains the right to sue has been largely removed', any: ['no-fault', 'no fault', 'right to sue', 'cannot sue', "can't sue", 'cannot be sued', 'lawsuit'], required: true },
        { label: 'Pays treatment and income replacement benefits', any: ['treatment'], required: true },
        { label: 'Explains the review route', any: ['review', 'dispute', 'tribunal', 'appeal'] },
      ],
    },
  },
  {
    id: 'TC-068',
    scenario: 'CA-012',
    title: 'Fault rule complaint escalated',
    rule: 'Ontario Fault Determination Rules (Regulation 668) apply as written for rating and direct compensation; customers can escalate complaints to the insurer’s ombudsman, then the General Insurance OmbudService.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Applies the Fault Determination Rules as written', any: ['reg 668', 'o. reg', 'lane-changing driver', 'lane change rule'], required: true },
        { label: 'Explains the escalation route', any: ['ombudservice', 'ombudsman', 'gio', 'escalat', 'fsra', 'regulator'], required: true },
        { label: 'Explains clearly and keeps the dashcam', any: ['dashcam', 'explain'] },
      ],
    },
  },
  {
    id: 'TC-069',
    scenario: 'CA-013',
    title: 'Innocent buyer of a re-VINned stolen car',
    rule: 'A re-VINned stolen vehicle belongs to its original owner (or the insurer that paid the theft). The innocent buyer is a fraud victim; ownership decides the own-damage claim.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Spots the re-VIN', any: ['re-vin', 'revin', 'hidden vin'], required: true },
        { label: 'Treats the policyholder as an innocent victim', any: ['victim', 'innocent', 'good faith', 'unaware', 'did not know', "didn't know"], required: true },
        { label: 'Addresses ownership of the vehicle', any: ['original owner', 'ownership', 'insurable interest', 'title'] },
        { label: 'Keeps the third party’s claim in view', any: ['third party', 'third-party', 'driver he rear-ended', 'other car'] },
      ],
    },
  },
  {
    id: 'TC-070',
    scenario: 'AU-009',
    title: 'Uninsured motorist extension with an unidentified driver',
    rule: 'Uninsured motorist extensions on third party property policies pay up to a limit (here $5,000) when the at-fault, uninsured driver can be identified by name and address or registration details.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Works to identify the driver', any: ['identify the buyer', "buyer's identity", 'buyer’s identity', 'trace the buyer', 'find the buyer', 'who was driving', 'identity of the driver', "driver's identity", 'driver’s identity', 'identify the driver', 'identifying the buyer', 'identifying the driver'], required: true },
        { label: 'Applies the $5,000 limit', any: ['5000', 'limit'], required: true },
        { label: 'Traces the buyer or gets a police report', any: ['buyer', 'police', 'transfer'] },
      ],
    },
  },
  {
    id: 'TC-071',
    scenario: 'AU-010',
    title: 'Code of Practice timeframes missed',
    rule: 'General Insurance Code of Practice: updates at least every 20 business days; decision within 10 business days of having the information and within 4 months; complaints answered in the Code timeframe, then AFCA.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Identifies the Code timeframe breaches', any: ['4 months', '20 business days', '10 business days', 'code of practice', 'the code'], required: true },
        { label: 'Explains AFCA as the next step', any: ['afca', 'australian financial complaints'], required: true },
        { label: 'Responds to the complaint in time', any: ['30 days', '30 calendar', 'complaint'] },
      ],
    },
  },
  {
    id: 'TC-072',
    scenario: 'AU-011',
    title: 'Family violence by a co-insured',
    rule: 'Code of Practice family violence commitments: do not apply an intentional damage exclusion against a victim who did not cause or consent; protect her details and safety; remove the perpetrator on request.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Does not hold the deliberate damage against the victim', any: ['victim', 'did not consent', 'without her consent', 'not consent', 'innocent'], required: true },
        { label: 'Protects her safety and details', any: ['not contact', 'do not contact', 'safety', 'safe', 'disclos', 'confidential', 'protect her'], required: true },
        { label: 'Removes the former partner from the policy', any: ['remove him', 'remove the former', 'remove jason', 'removed from the policy', 'remove the ex'] },
      ],
    },
  },
  {
    id: 'TC-073',
    scenario: 'AU-012',
    title: 'Cash settlement versus a quote with old hail',
    rule: 'A cash settlement must be fair and explained, not limited to the insurer’s internal discounted rates; unrelated pre-existing damage is excluded.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Removes the unrelated hail repairs', any: ['remove the hail', 'exclude the hail', 'hail repairs from the quote', 'hail items', 'hail damage is unrelated', 'unrelated hail', 'hail should be excluded', 'separate hail claim', 'requote', 're-quote', 'collision damage only', 'collision-only'], required: true },
        { label: 'Makes the cash figure fair and itemised', any: ['fair', 'preferred repairer rate', 'reasonably cost', 'itemised', 'itemized', 'breakdown'], required: true },
        { label: 'Offers a repair through the insurer', any: ['repair through', 'arrange the repair', 'insurer-arranged', 'option of repair', 'insurer arranged'] },
      ],
    },
  },
  {
    id: 'TC-074',
    scenario: 'AU-013',
    title: 'Pop-up hail repairer inflating claims',
    rule: 'Pay genuine storm damage at a fair rate; exclude unrelated damage; investigate a repairer’s claims as a group when patterns appear. A repairer cannot waive the policy excess.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Pays the genuine hail damage and declines the old damage', any: ['decline the old', 'old damage', 'exclude the', 'genuine hail damage', 'only the hail', 'hail damage only', 'pay the genuine', 'fair hail', 'pre-existing', 'unrelated'], required: true },
        { label: 'Investigates the business across its claims', any: ['40 claims', 'pattern', 'other claims', 'all its claims', 'portfolio', 'fraud team', 'refer to the', 'investigat'], required: true },
        { label: 'Keeps the policy excess payable', any: ['excess'] },
      ],
    },
  },
];
