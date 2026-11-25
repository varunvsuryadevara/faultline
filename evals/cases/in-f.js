// AI evaluation cases for IN-048 to IN-058. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-054',
    scenario: 'IN-048',
    title: 'Hospital bills the insurer for scheme-paid treatment',
    rule: 'Cashless Treatment of Road Accident Victims Scheme, 2025 (from 5 May 2025): up to ₹1.5 lakh per victim for 7 days at designated hospitals. Expenses met by the scheme must not be paid again by the insurer or included in tribunal compensation.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Spots that the scheme already paid for the same admission', any: ['already paid', 'scheme paid', 'paid under the scheme', 'double', 'duplicate', 'twice'], required: true },
        { label: 'Keeps scheme-paid expenses out of the compensation', any: ['exclude', 'deduct', 'not be paid twice', 'double recovery', 'double compensation', 'set off', 'adjust'], required: true },
        { label: 'Reports the duplicate bill', any: ['report', 'state health agency'] },
      ],
    },
  },
  {
    id: 'TC-055',
    scenario: 'IN-049',
    title: 'Choosing between section 164 and section 166',
    rule: 'Motor Vehicles Act section 164: fixed no-fault compensation (₹5 lakh death, ₹2.5 lakh grievous hurt). The family cannot also receive full fault-based compensation under section 166 for the same death.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Explains that both cannot be paid in full for the same death', any: ['cannot claim both', 'not both', 'either', 'choose', 'election', 'elect', 'one or the other', 'double compensation', 'cannot also', 'adjusted', 'set off'], required: true },
        { label: 'Holds that fog does not clear the truck driver', any: ['do not clear the driver', 'does not clear the driver', "doesn't clear the driver", 'not clear the driver', 'driver probably bears', 'bears fault', 'probably at fault', 'likely at fault', 'should have slowed', 'too fast for', 'reduced visibility', 'speed in fog', 'fog does not', "fog doesn't"], required: true },
        { label: 'Assesses dependency', any: ['dependen', 'multiplier', 'income'] },
      ],
    },
  },
  {
    id: 'TC-056',
    scenario: 'IN-050',
    title: 'Designated officer’s 30-day offer on the DAR',
    rule: 'Central Motor Vehicles Rules (2022): the police file the Detailed Accident Report within 90 days; the insurer’s designated officer must make a settlement offer within 30 days. Income must be assessed on evidence.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Identifies the 30-day offer deadline', any: ['thirty days', '6 days', 'six days', 'deadline'], required: true },
        { label: 'Questions the stated income against the bank statements', any: ['18200', 'itr', 'overstated', 'inflated income', 'not supported', 'unsupported', 'documentary'], required: true },
        { label: 'Uses the standard dependency method', any: ['future prospects', 'multiplier', 'personal expenses', 'pranay sethi', 'sarla verma', 'conventional'] },
      ],
    },
  },
  {
    id: 'TC-057',
    scenario: 'IN-051',
    title: 'Hit-and-run payment refunded after the vehicle is traced',
    rule: 'Hit-and-run scheme (2022): ₹2 lakh for death when the vehicle is unidentified, paid on an undertaking to refund if compensation is later awarded. Once traced and insured, the policy responds and the scheme payment is refunded from the award.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Refunds or adjusts the scheme payment from the award', any: ['adjust', 'deduct', 'set off'], required: true },
        { label: 'Accepts that the policy now responds', any: ['policy applies', 'policy was in force', 'is covered by the policy', 'insurer is liable', 'is liable to pay', 'policy responds'], required: true },
        { label: 'Assesses dependency on the evidence', any: ['income', 'dependen', 'tea stall'] },
      ],
    },
  },
  {
    id: 'TC-058',
    scenario: 'IN-052',
    title: 'Delivery damage disputed between transporter and dealer',
    rule: 'Pay the policyholder for a loss he did not cause, then preserve and pursue recovery: serve notice of claim on the carrier and the dealer promptly.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Pays the policyholder first', any: ['pay the policyholder', 'pay the insured', 'settle the claim', 'pay his', 'pay the customer', 'indemnify', 'settle his claim', 'pay the claim'], required: true },
        { label: 'Preserves recovery with notices', any: ['notice of claim', 'serve notice', 'written notice', 'subrogat', 'carriage'], required: true },
        { label: 'Uses the evidence to locate where it happened', any: ['deck', 'cctv', 'loading photo', 'roof not visible', 'dispatch photo'] },
      ],
    },
  },
  {
    id: 'TC-059',
    scenario: 'IN-053',
    title: 'Scrapped vehicle identities across five claims',
    rule: 'A chassis number belonging to a scrapped, deregistered vehicle cannot be on the road; linked claims through one garage and one contact indicate organised fraud.',
    expect: {
      family: ['fraud'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Concludes the cars carry scrapped vehicles’ identities', any: ['identities of scrapped', 'identity of a scrapped', 'scrapped identities', 'scrapped identity', 'forged rc', 'forged registration', 'fake rc', 're-plated', 'replated', 'should not be on the road', 'cannot be on the road', 'cloned identit'], required: true },
        { label: 'Links the five claims as organised', any: ['five claims', '5 claims', 'ring', 'organised', 'organized'], required: true },
        { label: 'Inspects the stamped numbers', any: ['stamped', 'engine number', 'chassis number', 'rivet'] },
        { label: 'Reports and voids the policies', any: ['police', 'void', 'cancel the polic'] },
      ],
    },
  },
  {
    id: 'TC-060',
    scenario: 'IN-054',
    title: 'Fabricated nursing-home bills in a tribunal claim',
    rule: 'Medical expenses must be proved by genuine records; unregistered facilities, wrong registrations and shared bill sequences show fabrication. The genuine injury is still compensated.',
    expect: {
      family: ['fraud'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Contests the bills as fabricated using the hospital record', any: ['contest the medical expenses', 'contest the bills', 'fabricated', 'fabrication', 'fake bills', 'false bills', 'bogus', 'not genuine', 'real treatment', 'actual treatment', 'contradict'], required: true },
        { label: 'Flags the unregistered home, the dentist’s number or the bill sequence', any: ['unregistered', 'not registered'], required: true },
        { label: 'Still pays the genuine injury', any: ['genuine injury', 'real injury', 'fracture', 'genuine part'] },
        { label: 'Links the other claims or reports', any: ['other claims', 'two other', 'police', 'medical council'] },
      ],
    },
  },
  {
    id: 'TC-061',
    scenario: 'IN-055',
    title: 'Car "stolen" but still crossing tolls',
    rule: 'A vehicle sold privately and still in use is not stolen; FASTag and e-challan records after the reported theft are strong evidence of a false claim.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Concludes the car is still being driven, so there was no theft', any: ['being driven', 'driven openly', 'still in use', 'still being used', 'has been used since', 'used after the', 'driven after the', 'trace the vehicle', 'not stolen', 'no theft'], required: true },
        { label: 'Raises the private sale on stamp paper', any: ['sale'], required: true },
        { label: 'Traces the car with the police', any: ['upi', 'trace', 'police'] },
      ],
    },
  },
  {
    id: 'TC-062',
    scenario: 'IN-056',
    title: 'IRDAI claim timelines missed',
    rule: 'IRDAI (2024): surveyor appointed within 24 hours, survey report within 15 days, claim decided within 7 days of the report; delays attract interest and grievances must be answered.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Identifies the timeline breaches', any: ['24 hours', '15 days', '7 days', 'seven days', 'irdai'], required: true },
        { label: 'Pays interest for the delay', any: ['interest'], required: true },
        { label: 'Answers the grievance and the Bima Bharosa complaint', any: ['grievance', 'bima bharosa', 'complaint'] },
      ],
    },
  },
  {
    id: 'TC-063',
    scenario: 'IN-057',
    title: 'Unexplained deductions on a zero-depreciation policy',
    rule: 'Deductions must be explained item by item; a zero-depreciation add-on removes depreciation. Insurance Ombudsman: within one year, claims up to ₹50 lakh, after the insurer rejects or does not reply within a month.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Refunds the depreciation the add-on covers', any: ['refund the depreciation', 'refund the ₹42,000', 'refund the 42,000', 'depreciation should not', 'depreciation cannot', 'should not have been deducted', 'wrongly deducted', 'add-on covers', 'covers the depreciation', 'covers depreciation'], required: true },
        { label: 'Gives an item-by-item explanation of the other deductions', any: ['explain', 'item', 'justif', 'reasons'], required: true },
        { label: 'Explains the ombudsman route', any: ['ombudsman', '50 lakh', 'one year', '1 year'] },
      ],
    },
  },
  {
    id: 'TC-064',
    scenario: 'IN-058',
    title: '"Full and final" voucher signed under pressure',
    rule: 'A discharge voucher obtained by pressure from a customer who could not read it does not bar the claim for the balance; vulnerable customers need communication they understand.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Treats the voucher as not binding', any: ['coerc', 'pressure', 'undue influence', 'could not read', 'not binding', 'duress', 'not valid', 'unfair'], required: true },
        { label: 'Pays the balance of the assessed loss', any: ['48,000', '48000', 'difference', 'shortfall'], required: true },
        { label: 'Investigates the surveyor', any: ['surveyor', 'conduct', 'investigat'] },
        { label: 'Communicates in a language she understands', any: ['hindi', 'vulnerab', 'elderly', 'language'] },
      ],
    },
  },
];
