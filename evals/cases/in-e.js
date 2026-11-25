// AI evaluation cases for IN-037 to IN-047. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-043',
    scenario: 'IN-037',
    title: 'Claim told to the agent but never registered',
    rule: 'An agent acts for the insurer: intimation to the insurer’s agent is intimation to the insurer. Delay alone, with no prejudice (the car is unrepaired), should not defeat a genuine claim.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Treats notice to the agent as notice to the insurer', any: ['condone', 'not his fault', 'not the policyholder', "agent's failure", 'agent’s failure', 'agent failed', "agent's lapse", 'agent’s lapse', 'notice to the agent', 'intimated in time', 'informed the agent', 'intimation to the agent', 'acts for the insurer', 'on behalf of the insurer', 'not be held against', 'timely intimation'], required: true },
        { label: 'Notes there is no prejudice because the car is unrepaired', any: ['not repaired', 'untouched', 'no prejudice', 'still be surveyed'], required: true },
        { label: 'Settles within the regulator’s timelines', any: ['settle', '7 days', 'seven days'] },
      ],
    },
  },
  {
    id: 'TC-044',
    scenario: 'IN-038',
    title: 'Road test by a service centre',
    rule: 'The standard private car policy excludes use for any purpose in connection with the motor trade; a road test during servicing falls under the service centre’s motor trade cover.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Concludes the technician was driving', any: ['technician was driving', 'technician drove', 'driven by the technician', 'technician was at the wheel', 'point to the technician', 'points to the technician', 'technician, not', 'by a technician'], required: true },
        { label: 'Places responsibility on the motor trade use and the service centre’s cover', any: ["service centre's insurer", 'service centre’s insurer', "dealer's insurer", 'dealer’s insurer', 'trade policy', 'trade certificate', 'custody of the', 'in their custody', 'service centre’s policy', "service centre's policy"], required: true },
        { label: 'Checks the son’s attendance or CCTV', any: ['attendance', 'college', 'cctv'] },
      ],
    },
  },
  {
    id: 'TC-045',
    scenario: 'IN-039',
    title: 'Owner-driver personal accident cover opted out',
    rule: 'Owner-driver compulsory personal accident cover (₹15 lakh) can be opted out if the owner holds a separate PA cover of that amount; if opted out, the motor policy has no PA benefit to pay.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Recognises the PA cover was opted out', any: ['opt out', 'no personal accident', 'no pa cover', 'not covered under'], required: true },
        { label: 'Points the family to the claim against the lorry’s insurer', any: ['mact', 'tribunal', 'third-party claim', 'third party claim'], required: true },
        { label: 'Checks employer group cover', any: ['employer', 'group'] },
      ],
    },
  },
  {
    id: 'TC-046',
    scenario: 'IN-040',
    title: 'Passengers carried free in a goods vehicle',
    rule: 'A goods carriage policy does not cover gratuitous passengers; tribunals may still direct the insurer to satisfy the award first and recover it from the owner.',
    expect: {
      family: ['genuine'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Says gratuitous passengers in a goods vehicle are not covered', any: ['gratuitous', 'passengers in a goods', 'not covered'], required: true },
        { label: 'Plans to recover from the owner if ordered to pay', any: ['recover from the owner', 'recovery from the owner', 'recover the amount', 'recover it from', 'right of recovery', 'recovery against the owner', 'recover from owner'], required: true },
        { label: 'Addresses the own damage claim', any: ['own damage', 'own-damage', 'limitation as to use', 'limitations as to use'] },
      ],
    },
  },
  {
    id: 'TC-047',
    scenario: 'IN-041',
    title: 'Fake licence despite the owner’s checks',
    rule: 'Swaran Singh principles: the insurer can avoid liability against the owner for a fake licence only if it proves the owner failed to take reasonable care; third parties are paid in any event.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Applies the owner’s reasonable care in checking the licence', any: ['reasonable care', 'due diligence', 'swaran singh', 'took care', 'checked the licence', 'wilful', 'willful', 'not negligent'], required: true },
        { label: 'Keeps the third-party claims payable', any: ['third part', 'injured occupants', 'mact'], required: true },
        { label: 'Reports the fake licence', any: ['police', 'report the fake', 'fir'] },
      ],
    },
  },
  {
    id: 'TC-048',
    scenario: 'IN-042',
    title: 'Repudiation recommended for an expired PUC',
    rule: 'IRDAI clarified in August 2020 that not holding a valid PUC certificate is not a valid reason to deny a motor claim.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Says an expired PUC is not a ground to repudiate', any: ['not a valid reason', 'not a ground', 'not a reason', 'irdai', 'cannot be denied', 'should not be repudiated', 'not repudiate', 'do not repudiate', 'should not repudiate', 'no bearing', 'irrelevant', 'unrelated', 'not relevant'], required: true },
        { label: 'Settles the assessed loss', any: ['54000', 'settle'], required: true },
        { label: 'Recovers from the tempo’s side', any: ['tempo', 'recover'] },
      ],
    },
  },
  {
    id: 'TC-049',
    scenario: 'IN-043',
    title: 'Depreciation at the wrong rates',
    rule: 'Standard depreciation: metal parts by vehicle age (4–5 years: 35%; 5–10 years: 40%); plastic and rubber 50%; fibreglass 30%; glass nil; paint 50% on materials only.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Applies 35% to metal parts for a car aged 4 to 5 years', any: ['35%', '35 %', 'thirty-five', '35 per'], required: true },
        { label: 'Applies nil depreciation to glass', any: ['nil depreciation', 'no depreciation on glass', 'glass at nil', 'glass should be nil', 'glass carries no', 'glass parts carry no', 'glass is not depreciated', 'glass takes none', 'glass takes no', 'not depreciate glass', '0% on glass', 'zero on glass'], required: true },
        { label: 'Works out the age from the registration date', any: ['4 years', 'four years', '4.5', 'seven months', '7 months', 'first registration', 'registration date'] },
      ],
    },
  },
  {
    id: 'TC-050',
    scenario: 'IN-044',
    title: 'Auto-rickshaw above the 75% line',
    rule: 'Constructive total loss when repair exceeds 75% of the IDV; a net-of-salvage settlement lets the owner keep the vehicle. Safety-critical parts on a CNG vehicle must not be compromised.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Treats it as a total loss because repair is above 75% of the IDV', any: ['repair exceeds 75', 'above 75', 'over 75', 'more than 75', 'treat it as a constructive', 'treat as a constructive', 'treat it as a total loss', 'treat as a total loss', 'total loss on the surveyor', "surveyor's figures", 'surveyor’s figures'], required: true },
        { label: 'Rejects refurbished safety-critical parts', any: ['safety'], required: true },
        { label: 'Offers a net-of-salvage settlement so he keeps the auto', any: ['net of salvage', 'net-of-salvage', 'retain', 'keep the vehicle', 'keep the auto', 'salvage'] },
      ],
    },
  },
  {
    id: 'TC-051',
    scenario: 'IN-045',
    title: 'Garage delisted during a cashless repair',
    rule: 'A cashless approval given while the garage was in the network should be honoured; the customer should not fund a repair because of the insurer’s own delisting.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Honours the existing cashless approval', any: ['honour', 'honor'], required: true },
        { label: 'Pays the garage directly so the customer does not fund it', any: ['pay the garage', 'directly', 'release the vehicle', 'should not have to pay', 'not have to fund', 'should not bear'], required: true },
        { label: 'Falls back to quick reimbursement', any: ['reimburse', 'seven days', '7 days'] },
      ],
    },
  },
  {
    id: 'TC-052',
    scenario: 'IN-046',
    title: 'Theft with an undisclosed duplicate key',
    rule: 'Theft settlement needs all keys, the non-traceable report and transfer documents. An undisclosed duplicate key made shortly before the theft must be investigated before settlement.',
    expect: {
      family: ['uncertain', 'fraud'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Makes him explain the undisclosed duplicate key', any: ['undisclosed', 'did not disclose', "didn't disclose", 'not disclosed', 'put the dealer record to him', 'explain the duplicate', 'explanation for the', 'written explanation', 'who ordered', 'who requested', 'conceal'], required: true },
        { label: 'Investigates before settling', any: ['cctv', 'signature', 'explanation', 'who ordered'], required: true },
        { label: 'Collects the theft settlement documents', any: ['non-traceable', 'untraced', 'final report', 'form 28', 'form 29', 'form 30', 'subrogation letter', 'registration certificate'] },
      ],
    },
  },
  {
    id: 'TC-053',
    scenario: 'IN-047',
    title: 'Hypothecation still on the RC after the loan closed',
    rule: 'Where the financier confirms the loan is closed (NOC, zero dues, Form 35), the total loss settlement can be paid to the owner once verified with the bank.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Verifies the NOC and zero-dues letter with the bank', any: ['verify', 'confirm with the bank', 'bank directly', 'no objection', 'zero dues'], required: true },
        { label: 'Pays the customer once verified', any: ['pay her', 'pay the customer', 'pay the policyholder', 'directly to her', 'to the insured', 'to the policyholder', 'to neha'], required: true },
        { label: 'Deals with the hypothecation termination', any: ['form 35', 'hypothecation'] },
      ],
    },
  },
];
