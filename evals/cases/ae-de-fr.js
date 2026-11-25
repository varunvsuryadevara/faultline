// AI evaluation cases for AE-008 to AE-011, DE-008 to DE-011 and FR-008 to FR-011.
// Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-075',
    scenario: 'AE-008',
    title: 'Dune rollover without the off-road extension',
    rule: 'A clear exclusion for off-road and dune driving applies unless the optional extension was bought; how it was sold can still be reviewed as a complaint.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Applies the off-road exclusion', any: ['not covered', 'decline', 'extension was not', 'no off-road extension', 'did not buy', "didn't buy"], required: true },
        { label: 'Checks whether the extension was offered at sale', any: ['sales', 'offered', 'mis-sold', 'mis-selling', 'salesman', 'point of sale'] },
        { label: 'Offers the extension for the future', any: ['renewal', 'add the extension', 'future'] },
      ],
    },
  },
  {
    id: 'TC-076',
    scenario: 'AE-009',
    title: 'Car park damage reported to police four days later',
    rule: 'UAE garages need a police report to repair accident damage. A late report loses evidence such as CCTV but is not in itself suspicious; check the damage against the location.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Notes the delay and the lost CCTV', any: ['4 days', 'delay'], required: true },
        { label: 'Checks the paint transfer against the car park', any: ['pillar', 'column', 'height'], required: true },
        { label: 'Pays as unknown-party damage if consistent', any: ['unknown', 'excess'] },
      ],
    },
  },
  {
    id: 'TC-077',
    scenario: 'AE-010',
    title: 'Agency repair in the schedule, age limit in a guideline',
    rule: 'The policy schedule issued to the customer defines her entitlement for the policy period; an internal underwriting guideline cannot override it.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Relies on the schedule for the policy period', any: ['policy period', 'contract'], required: true },
        { label: 'Authorises the agency repair', any: ['authoris', 'authoriz', 'honour', 'honor'], required: true },
        { label: 'Recovers from the at-fault driver’s insurer', any: ['recover', 'at-fault', 'other driver'] },
      ],
    },
  },
  {
    id: 'TC-078',
    scenario: 'AE-011',
    title: 'Rental insurer refuses despite a signed police report',
    rule: 'In the UAE the police report determines fault; an informal email from the other driver is not a formal objection. Refusals can be escalated through the insurance dispute channels.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Relies on the signed police report over the email', any: ['formal objection'], required: true },
        { label: 'Escalates the recovery', any: ['escalat', 'complaint', 'central bank', 'sanadak', 'regulator'], required: true },
        { label: 'Recovers her excess', any: ['excess'] },
      ],
    },
  },
  {
    id: 'TC-079',
    scenario: 'DE-008',
    title: 'Notional settlement with VAT claimed',
    rule: 'German Civil Code section 249(2): on a notional (fiktive) settlement, VAT is only payable if actually incurred. For cars over three years not serviced at brand workshops, a concrete cheaper equivalent workshop can be used.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Pays net costs; VAT only if incurred', any: ['actually incurred', 'not incurred', 'only if incurred', 'only payable if', 'only when', 'net costs', 'net amount', '6300', '249'], required: true },
        { label: 'Considers equivalent independent workshop rates', any: ['independent workshop', 'free workshop', 'freie', 'equivalent workshop', 'cheaper workshop', 'non-brand', 'brand workshop'], required: true },
        { label: 'Pays the expert’s fee and expenses', any: ["expert's fee", 'expert’s fee', 'expert fee', 'flat sum', 'pauschale'] },
      ],
    },
  },
  {
    id: 'TC-080',
    scenario: 'DE-009',
    title: 'Workshop risk after the 2024 rulings',
    rule: 'Federal Court of Justice, 16 January 2024 (VI ZR 253/22 and others): the liable insurer bears the workshop risk for an injured party who had the repair done; it can demand assignment of claims against the workshop.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Places the workshop risk on the liable insurer', any: ['werkstattrisiko', 'workshop risk', 'bgh', 'federal court', '2024'], required: true },
        { label: 'Takes an assignment of claims against the workshop', any: ['assign', 'abtret'], required: true },
        { label: 'Pays the balance to the workshop if unpaid', any: ['to the workshop', 'pay the workshop', 'balance'] },
      ],
    },
  },
  {
    id: 'TC-081',
    scenario: 'DE-010',
    title: 'Loss of use with a second car available',
    rule: 'Loss of use compensation covers only the necessary repair period for a car that cannot be used, and may not be due where another household car was freely available.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Limits the claim to the necessary repair period', any: ['five working days', 'repair period', 'repair days', 'driveable', 'necessary'], required: true },
        { label: 'Considers the second household car', any: ['second car', 'another car', 'household'], required: true },
        { label: 'Excludes the holiday delay', any: ['holiday', 'nine days', '9 days'] },
      ],
    },
  },
  {
    id: 'TC-082',
    scenario: 'DE-011',
    title: 'Series of inflated expert reports',
    rule: 'An expert report is evidence, not a binding figure; where its scope exceeds the visible damage, an independent inspection is justified, and repeated patterns should be reviewed together.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Sees the report goes beyond the photographed damage', any: ['minderwert', '9-year', 'beilackierung', 'exceed', 'inflat'], required: true },
        { label: 'Instructs an independent inspection', any: ['inspect', 'counter-expert', 'gegengutachten', 'own expert'], required: true },
        { label: 'Reviews the 26 claims together', any: ['26', 'series', 'pattern', 'same expert'] },
      ],
    },
  },
  {
    id: 'TC-083',
    scenario: 'FR-008',
    title: 'Badinter law offer deadline',
    rule: 'Code des assurances L211-9: an offer to an injured victim within 8 months of the accident (provisional if not consolidated), final offer within 5 months of learning of consolidation; L211-13: late offers bear interest at double the legal rate.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Makes a provisional offer before the 8-month deadline', any: ['8 months', 'eight months', '10 september', 'l211-9', 'l.211-9'], required: true },
        { label: 'Notes the double-interest sanction', any: ['double', 'penalt', 'l211-13', 'sanction'], required: true },
        { label: 'Diaries the final offer after consolidation', any: ['5 months', 'five months', 'consolidation'] },
      ],
    },
  },
  {
    id: 'TC-084',
    scenario: 'FR-009',
    title: 'Uninsured driver and the guarantee fund',
    rule: 'France: the FGAO guarantee fund compensates victims of uninsured drivers under its own conditions; a third-party-only policy does not cover the policyholder’s own car.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Helps him claim from the guarantee fund', any: ['claim from the fgao', 'claim from the guarantee', 'claim with the fgao', 'claim with the guarantee', 'apply to the fgao', 'apply to the guarantee', 'help him claim', 'fonds de garantie', 'guide him to', 'refer him to the'], required: true },
        { label: 'Explains his third-party policy does not cover his car', any: ['third-party only', 'third party only', 'does not cover his', "doesn't cover his", 'not covered under his', 'own damage is not', 'no own damage', 'only third-party'], required: true },
        { label: 'Uses legal protection and protects his bonus', any: ['legal protection', 'protection juridique', 'bonus'] },
      ],
    },
  },
  {
    id: 'TC-085',
    scenario: 'FR-010',
    title: 'Late declaration without prejudice',
    rule: 'Code des assurances L113-2: a late declaration can only cause loss of cover (déchéance) if the insurer proves the delay caused it prejudice.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Requires prejudice before refusing for lateness', any: ['prejudice', 'préjudice', 'l113-2', 'harm'], required: true },
        { label: 'Handles the claim on the joint report', any: ['joint report', 'should be accepted', 'is accepted', 'process the claim', 'proceed with the claim', 'handle the claim', 'settle the claim'], required: true },
      ],
    },
  },
  {
    id: 'TC-086',
    scenario: 'FR-011',
    title: 'Full malus applied to a shared-liability claim',
    rule: 'French bonus-malus: +25% for a responsible claim, +12.5% for a partly responsible one. Complaints should be answered within two months; then La Médiation de l’Assurance.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Applies the 12.5% increase for shared liability', any: ['12.5', '12,5', 'half of the'], required: true },
        { label: 'Explains the mediation route', any: ['médiation', 'mediation', 'two months', '2 months'], required: true },
        { label: 'Refunds the overcharged premium', any: ['refund', 'reimburse', 'overcharg'] },
      ],
    },
  },
];
