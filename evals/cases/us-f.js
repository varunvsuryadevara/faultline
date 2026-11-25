// AI evaluation cases for US-045 to US-054. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-033',
    scenario: 'US-045',
    title: 'Lost profits for a food truck',
    rule: 'Loss of use of a commercial vehicle is net lost profit, proved by records, for a reasonable period. The duty to mitigate does not cover delay caused by the insurer itself.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Requires net, documented lost profits', any: ['net profit', 'net lost', 'sales records', 'tax return', 'financial records', 'books', 'documentation', 'bank statements', 'proof of'], required: true },
        { label: 'Recognises the insurer’s own delay contributed', any: ['our delay', "insurer's delay", 'adjuster delay', '18 days', 'did not confirm', "didn't confirm", 'insurer caused', 'own delay', 'slow response', 'delay in confirming', 'insurer’s delay'], required: true },
        { label: 'Pays the repair cost', any: ['6,800', '6800', 'repair cost'] },
      ],
    },
  },
  {
    id: 'TC-034',
    scenario: 'US-046',
    title: 'Time-limited policy-limits demand',
    rule: 'Georgia time-limited demands: an insurer that unreasonably fails to accept a demand within limits, on clear liability and excess damages, risks liability for the full judgment. Every condition of the demand must be met.',
    expect: {
      family: ['genuine'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Treats the demand as urgent with a deadline', any: ['time limited', 'deadline', 'expire', 'eight days', '8 days'], required: true },
        { label: 'Recognises the bad faith and excess exposure', any: ['bad faith', 'excess', 'above the limit', 'personal exposure', 'beyond the limit', 'over the limit'], required: true },
        { label: 'Accepts within limits and meets the conditions', any: ['accept', 'sworn statement', 'conditions', 'within 10 days'] },
        { label: 'Tells the insured about the demand and his exposure', any: ['notify the insured', 'tell the policyholder', 'inform the insured', 'advise the insured', 'insured in writing', 'policyholder in writing', 'inform the policyholder', 'notify the policyholder'] },
      ],
    },
  },
  {
    id: 'TC-035',
    scenario: 'US-047',
    title: 'Florida 51% bar on a speeding, texting claimant',
    rule: 'Florida HB 837 (24 March 2023): a claimant more than 50% at fault recovers nothing; negligence claims must be filed within two years.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Applies the more-than-50% bar', any: ['51%', '50%', 'more than half', 'modified comparative', 'hb 837', 'greater than 50', 'more than 50', 'majority of the fault', 'majority of fault'], required: true },
        { label: 'Uses her speed and phone use against her', any: ['18 mph over', '18 over', 'over the limit', 'excessive speed', 'distracted', 'phone use', 'using her phone', 'event data and the phone', 'evidence against the claimant', 'strong evidence against'], required: true },
        { label: 'Commissions a reconstruction', any: ['reconstruct'] },
        { label: 'Checks the two-year limitation period', any: ['two-year', '2-year', 'two years', '2 years', 'statute of limitation', 'limitation period'] },
      ],
    },
  },
  {
    id: 'TC-036',
    scenario: 'US-048',
    title: 'Arbitration award and the deductible refund',
    rule: 'Subrogation recoveries must be shared with the insured for the deductible as the policy and state law require; inter-company arbitration awards set the split.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Refunds her deductible from the recovery', any: ['refund her deductible', 'refund the deductible', 'reimburse her deductible', 'reimburse the deductible', 'return her deductible', 'deductible refund', 'deductible share', 'in proportion', 'pro rata', 'pro-rata', 'made whole', 'made-whole', 'share of the recovery'], required: true },
        { label: 'Collects 70% under the award', any: ['collect 70', 'recover 70', '70% of the', '70 percent of', '5,880', 'collect the 70', 'recover the 70', 'under the award'], required: true },
        { label: 'Treats flashing reds as an all-way stop', any: ['all-way stop', 'all way stop', 'four-way stop', 'flashing red'] },
      ],
    },
  },
  {
    id: 'TC-037',
    scenario: 'US-049',
    title: 'Tread separation and evidence preservation',
    rule: 'Product subrogation depends on preserving the failed part with a chain of custody and allowing the manufacturer to inspect; destroying it risks a spoliation defence.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Preserves the tire and stops the salvage sale', any: ['preserv', 'stop the sale', 'hold the vehicle', 'do not sell', "don't sell", 'chain of custody', 'retain the tire', 'spoliation', 'halt the sale', 'pause the sale'], required: true },
        { label: 'Pursues the tire manufacturer or retailer', any: ['subrogat', 'product liability', 'defect'], required: true },
        { label: 'Uses an expert and checks recalls', any: ['expert', 'recall', 'tire identification'] },
      ],
    },
  },
  {
    id: 'TC-038',
    scenario: 'US-050',
    title: 'Customer payment diverted to a fictitious vendor',
    rule: 'Insider fraud: the customer whose payment was diverted must be paid; the scheme is contained through investigation, access restriction and segregation of duties.',
    expect: {
      family: ['genuine'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Identifies the adjuster-created vendor as insider fraud', any: ['internal fraud', 'employee fraud', 'staff fraud', 'created the vendor', 'created by the', 'adjuster created', 'adjuster set up', 'fictitious vendor', 'fake vendor', 'sham vendor', 'shell'], required: true },
        { label: 'Pays the customer', any: ['pay the customer', 'reimburse her', 'pay her', 'make her whole', 'reissue', 'pay ms', 'pay patricia', 'reimburse the customer', 'refund her', 'pay the policyholder', 'reimburse the policyholder'], required: true },
        { label: 'Fixes segregation of duties', any: ['segregation', 'control', 'vendor creation', 'independent approval'] },
        { label: 'Checks the other affected claims', any: ['19 claims', 'other customers', 'other claims', 'other affected'] },
      ],
    },
  },
  {
    id: 'TC-039',
    scenario: 'US-051',
    title: 'Theft reported after the car was exported',
    rule: 'Export records that pre-date a theft report, filed with the owner’s title copy, are strong evidence of a false theft; refer to SIU and NICB and use the examination under oath where facts are disputed.',
    expect: {
      family: ['fraud'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Concludes the car was exported before it was reported stolen', any: ['exported before', 'exported with', 'before he reported', 'before the theft was reported', 'already been exported', 'already exported', 'already left the country', 'already shipped', 'could not have been stolen', '18 days before'], required: true },
        { label: 'Refers to investigators or denies', any: ['siu', 'special investigation', 'nicb', 'deny', 'decline', 'fraud referral'], required: true },
        { label: 'Considers an examination under oath', any: ['examination under oath', 'euo'] },
        { label: 'Uses the mall camera review', any: ['entrance camera', 'mall camera', 'no match', 'camera'] },
      ],
    },
  },
  {
    id: 'TC-040',
    scenario: 'US-052',
    title: 'California claim-handling time limits missed',
    rule: 'California Fair Claims Settlement Practices Regulations: acknowledge within 15 calendar days, accept or deny within 40 days of proof of claim, and give written notice every 30 days if more time is needed.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Identifies the time-limit breaches', any: ['15 days', '15 calendar', '40 days', 'regulation', 'fair claims', '2695'], required: true },
        { label: 'Responds to the Department of Insurance', any: ['regulator', 'cdi'], required: true },
        { label: 'Pays the claim and the rental costs', any: ['rental', 'pay the claim', 'decide'] },
        { label: 'Fixes the leave cover process', any: ['reassign', 'handover', 'other files', 'leave cover'] },
      ],
    },
  },
  {
    id: 'TC-041',
    scenario: 'US-053',
    title: 'Claim file emailed to the wrong person',
    rule: 'Privacy incidents: escalate immediately, contain (deletion confirmed), assess state breach notification and insurance data security duties, notify the person affected and fix the cause.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Treats it as a privacy incident and escalates', any: ['privacy', 'data breach', 'breach', 'incident', 'compliance team', 'data protection'], required: true },
        { label: 'Asks the recipient to delete and confirm', any: ['delete', 'deletion', 'destroy'], required: true },
        { label: 'Assesses notification and supports the policyholder', any: ['notif', 'credit monitoring'] },
        { label: 'Fixes the cause', any: ['encrypt', 'secure portal', 'auto-complete', 'autocomplete'] },
      ],
    },
  },
  {
    id: 'TC-042',
    scenario: 'US-054',
    title: 'Statement taken without an interpreter',
    rule: 'Fair treatment: a statement taken in a language the customer does not understand well is unreliable; retake it with a qualified interpreter and decide fault on independent evidence.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Does not rely on the statement taken without an interpreter', any: ['do not rely on the english', 'not rely on the statement', 'cannot rely on the statement', 'unreliable', 'unsafe', 'retake the statement', 're-take the statement', 'new statement', 'qualified interpreter', 'language needs', 'language barrier'], required: true },
        { label: 'Uses the doorbell camera', any: ['slowed'], required: true },
        { label: 'Reopens the fault decision', any: ['reconsider', 'review the fault', 'reopen', 'revisit', 'correct the', 'reassess', 're-evaluate'] },
        { label: 'Looks at the other driver’s speed', any: ['speed', 'without slowing'] },
      ],
    },
  },
];
