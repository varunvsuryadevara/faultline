// AI evaluation cases for ZA-008 to ZA-011, SG-007 to SG-010 and IE-002, NZ-002, JP-002,
// IT-002, ES-002, MY-002. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-087',
    scenario: 'ZA-008',
    title: 'Unrest damage and SASRIA cover',
    rule: 'South Africa: riot, strike and public disorder are excluded from ordinary motor cover and insured through SASRIA special risks cover sold with the policy.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Handles the claim under the SASRIA cover', any: ['under the sasria', 'under sasria', 'sasria cover responds', 'sasria responds', 'covered by sasria', 'sasria applies', 'claim to sasria', 'submit the claim under'], required: true },
        { label: 'Does not reject under the riot exclusion', any: ['do not reject', "don't reject", 'should not be rejected', 'should not reject', 'withdraw', 'reverse the', 'rejection is wrong', 'incorrect rejection', 'wrongly', 'mistaken'], required: true },
        { label: 'Uses the SAPS case number and evidence of unrest', any: ['saps', 'case number', 'evidence of the unrest', 'public violence'] },
      ],
    },
  },
  {
    id: 'TC-088',
    scenario: 'ZA-009',
    title: 'Pothole recovery and the six-month notice',
    rule: 'Institution of Legal Proceedings against Certain Organs of State Act 2002: written notice to the municipality within six months, or the recovery may be lost. A prior report helps prove the municipality knew of the defect.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Serves notice on the municipality within six months', any: ['six months', '6 months', 'six-month', '6-month', 'organ of state'], required: true },
        { label: 'Uses the earlier report of the pothole', any: ['knew', 'prior report'], required: true },
        { label: 'Includes her excess in the recovery', any: ['excess'] },
      ],
    },
  },
  {
    id: 'TC-089',
    scenario: 'ZA-010',
    title: 'Tracker contradicts the hijacking',
    rule: 'Tracking data showing the vehicle at a related address with a tamper alert before the reported hijacking must be explained before any settlement.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['high', 'critical'],
      flags: [
        { label: 'Uses the tracker data before the reported time', any: ['before the reported', 'before the hijacking'], required: true },
        { label: 'Investigates before deciding', any: ['interview', 'investigat', 'do not settle', 'not settle'], required: true },
      ],
    },
  },
  {
    id: 'TC-090',
    scenario: 'ZA-011',
    title: 'Tracker condition never mentioned at sale',
    rule: 'Policyholder Protection Rules and treating customers fairly: material conditions must be disclosed at sale; relying on an undisclosed condition, after the agent described full cover, is unlikely to be upheld by the ombud.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Sees the condition was not disclosed at sale', any: ['not disclosed', 'not mentioned', 'treating customers fairly', 'tcf', 'policyholder protection rules', 'disclos'], required: true },
        { label: 'Reconsiders the rejection', any: ['reconsider', 'pay the claim', 'overturn', 'review the rejection', 'reverse', 'fair settlement', 'uphold the complaint', 'should be paid', 'should pay'], required: true },
        { label: 'Explains the ombud route', any: ['ombud'] },
      ],
    },
  },
  {
    id: 'TC-091',
    scenario: 'SG-007',
    title: 'Cross-border collision in Johor',
    rule: 'Singapore policies usually extend to West Malaysia; Malaysian law requires a police report within 24 hours. Liability follows the evidence, here the lane markings and dashcam.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Concludes the footage puts fault on the merging Malaysian driver', any: ['dashcam supports', 'footage supports', 'supports the policyholder', 'favour the policyholder', 'favours the policyholder', 'favor the policyholder', 'merged from', 'should have given way', 'must give way', 'duty to give way', 'malaysian driver at fault', 'malaysian driver is at fault', 'other driver at fault', 'deny the third-party claim', 'defend the third-party'], required: true },
        { label: 'Confirms cover in West Malaysia and timely reports', any: ['west malaysia', 'geographical', 'territorial', 'covers malaysia', 'cover extends'], required: true },
        { label: 'Recovers the policyholder’s losses', any: ['recover'] },
      ],
    },
  },
  {
    id: 'TC-092',
    scenario: 'SG-008',
    title: 'Friends’ collision with old damage added',
    rule: 'Only damage caused by the incident is payable; earlier damage shown in dated photos is excluded, and links between parties and the workshop warrant scrutiny.',
    expect: {
      family: ['fraud', 'uncertain'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Uses the earlier photo to exclude the older damage', any: ['older damage', 'older items', 'decline the older', 'put the photo', 'damage predates', 'pre-dates', 'predates', 'existed before', 'before the accident'], required: true },
        { label: 'Pays only the fresh damage', any: ['1300', 'only the new', 'only the fresh'], required: true },
        { label: 'Notes the friend and workshop links', any: ['cousin', 'friend', 'related workshop', 'relative'] },
      ],
    },
  },
  {
    id: 'TC-093',
    scenario: 'SG-009',
    title: 'Wrong driver named to avoid excesses',
    rule: 'Apply the excesses for the actual driver; a deliberate misstatement in a claim is serious and can justify refusal, even if corrected before payment.',
    expect: {
      family: ['uncertain', 'fraud'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Applies the excesses for the actual driver', any: ['correct excesses', 'correct excess', 'actual driver', 'both additional', 's$5,600', '5,600', 'excesses exceed', 'exceed the loss', 'nothing is payable', 'nothing payable', 'no payment'], required: true },
        { label: 'Treats the false statement seriously', any: ['false statement', 'misrepresent', 'lied', 'untrue', 'dishonest', 'warn', 'misstatement'], required: true },
        { label: 'Works out that the excesses exceed the damage', any: ['nothing payable', 'exceed', 'no payment', 'more than the damage', 'greater than the'] },
      ],
    },
  },
  {
    id: 'TC-094',
    scenario: 'SG-010',
    title: 'Injury claim above the online assessment range',
    rule: 'Singapore’s Motor Accident Claims Online tool gives liability and quantum ranges from past cases; loss of earnings must be proved by records.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Limits lost earnings to the time actually off work', any: ['three weeks off', 'returned to work', 'back at work', 'back to work', 'earnings loss is overstated', 'overstated', 'not six months', 'reduced volume'], required: true },
        { label: 'Values within the online assessment range', any: ["tool's range", 'tool’s range', 'within the range', 'within the tool', 'assessment range', 'well below the demand', 'below the demand', 'maco', 'motor accident claims online'], required: true },
        { label: 'Accepts liability is mainly the policyholder’s', any: ['right-turn', 'turned right', 'mainly at fault', 'liability'] },
      ],
    },
  },
  {
    id: 'TC-095',
    scenario: 'IE-002',
    title: 'Accepting a fair Injuries Resolution Board assessment',
    rule: 'Ireland: an Injuries Resolution Board assessment under the Personal Injuries Guidelines, if rejected, leads to an authorisation to sue and litigation costs; accept assessments within the Guidelines unless there are specific grounds.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Accepts the assessment', any: ['accept the assessment', 'accept the €12,000', 'accept the 12,000', 'accepting the assessment', 'should be accepted', 'recommend acceptance', 'recommend accepting', 'accept within', 'not reject', 'do not reject', "don't reject", 'should not reject'], required: true },
        { label: 'Explains the litigation cost of rejecting it', any: ['authorization', 'litigation', 'legal costs', 'court'], required: true },
        { label: 'Checks it against the Guidelines', any: ['guidelines'] },
      ],
    },
  },
  {
    id: 'TC-096',
    scenario: 'NZ-002',
    title: 'ACC and the bar on suing',
    rule: 'New Zealand: ACC covers personal injury on a no-fault basis and the law bars suing for compensation for injury it covers; vehicle damage is still claimed from the at-fault driver.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Explains she cannot sue for the injury', any: ['cannot sue', "can't sue", 'bar', 'no right to sue', 'not able to sue', 'unable to sue', 'not sue'], required: true },
        { label: 'Recovers the vehicle damage from the other driver’s insurer', any: ['other driver’s insurer', "other driver's insurer", 'third-party insurer', 'recover', 'vehicle damage', 'car repairs'], required: true },
      ],
    },
  },
  {
    id: 'TC-097',
    scenario: 'JP-002',
    title: 'Injury above the compulsory insurance limit',
    rule: 'Japan: compulsory automobile liability insurance pays injury losses up to ¥1.2 million; voluntary insurance pays above that, usually with one-stop handling of both.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Applies the ¥1.2 million compulsory limit', any: ['1.2 million', '1,200,000', '¥1.2', 'cali', 'jibaiseki'], required: true },
        { label: 'Takes on one-stop handling and pays the hospital', any: ['one-stop', 'one stop', 'directly'], required: true },
        { label: 'Plans for future care and consolation money', any: ['care', 'consolation'] },
      ],
    },
  },
  {
    id: 'TC-098',
    scenario: 'IT-002',
    title: 'Article 148 offer period missed',
    rule: 'Italy, Codice delle assicurazioni private article 148: reasoned offer or refusal within 30 days if the CAI is signed by both drivers, 60 days otherwise, 90 days with injuries; complaints can go to IVASS.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Applies the 30-day period for a jointly signed CAI', any: ['30 days', 'thirty days', 'article 148', 'art. 148', '148'], required: true },
        { label: 'Explains the IVASS complaint route', any: ['ivass'], required: true },
        { label: 'Pays interest for the delay', any: ['interest'] },
      ],
    },
  },
  {
    id: 'TC-099',
    scenario: 'ES-002',
    title: 'Market value versus repair for an old car',
    rule: 'Spain: where repair is disproportionate to the market value (valor venal), practice is to pay market value plus an uplift for the owner’s loss (valor de afección); repair may be allowed if not excessive in context.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Adds an afección uplift to the market value', any: ['afección', 'afeccion', 'uplift', 'market value plus'], required: true },
        { label: 'Weighs whether repair is disproportionate', any: ['disproportion', 'excessive', 'more than twice', 'exceeds the value', 'uneconomic', 'not economical'], required: true },
      ],
    },
  },
  {
    id: 'TC-100',
    scenario: 'MY-002',
    title: 'Knock-for-knock claim and a disputed rear-end',
    rule: 'Malaysia: an own-damage knock-for-knock claim lets a not-at-fault policyholder claim from his own insurer without losing his no-claim discount; a following driver who fails to keep a safe distance is usually at fault.',
    expect: {
      family: ['genuine', 'uncertain'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Protects his no-claim discount while liability is resolved', any: ['discount protected', 'protect his discount', 'protect his no-claim', 'protect his ncd', 'keep his no-claim', 'keep his ncd', 'ncd protected', 'preserve his', 'not lose his', 'should not lose'], required: true },
        { label: 'Uses the dashcam: braking for a hazard, follower too close', any: ['safe distance', 'hazard'], required: true },
        { label: 'Escalates through the industry dispute process if refused', any: ['dispute', 'escalat', 'piam'] },
      ],
    },
  },
];
