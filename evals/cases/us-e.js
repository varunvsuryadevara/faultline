// AI evaluation cases for US-035 to US-044. Format: see evals/ai-cases.js.
export default [
  {
    id: 'TC-023',
    scenario: 'US-035',
    title: 'Late no-fault application while in hospital',
    rule: 'New York no-fault: written notice within 30 days, but late notice must be accepted where the claimant gives clear and reasonable justification, such as hospitalization.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Accepts the late filing as justified', any: ['justification', 'justified', 'reasonable excuse', 'good cause', 'excuse the delay', 'excused', 'should not be denied', 'not be denied', 'should not deny', 'do not deny', "don't deny", 'not deny'], required: true },
        { label: 'Notes the daughter’s call gave notice within the 30 days', any: ['oral notice', 'phone call', 'called on'], required: true },
        { label: 'Moves on to paying benefits', any: ['pay', 'benefits'] },
      ],
    },
  },
  {
    id: 'TC-024',
    scenario: 'US-036',
    title: 'Miss-and-run needs independent corroboration',
    rule: 'Ohio uninsured motorist claims for an unidentified driver require independent corroborative evidence; the insured’s own account is not enough. Collision cover does not depend on another driver.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Says the injury claim needs independent corroboration', any: ['corroborat', 'independent witness'], required: true },
        { label: 'Uses the earlier 911 call about a weaving pickup', any: ['earlier call', 'second call', 'another caller', 'other caller'], required: true },
        { label: 'Pays the car under collision', any: ['collision'] },
      ],
    },
  },
  {
    id: 'TC-025',
    scenario: 'US-037',
    title: 'Michigan PIP limit chosen at $250,000',
    rule: 'Michigan PIP choice: medical benefits are paid to the limit the insured selected; allowable expenses above the limit can be claimed from the at-fault driver. Family attendant care is capped by hours; mini-tort up to $3,000.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high', 'critical'],
      flags: [
        { label: 'Applies the $250,000 limit he chose', any: ['250000', '250k', 'limit he chose', 'chosen limit', 'selected limit'], required: true },
        { label: 'Points to the at-fault driver for costs above the limit', any: ['at fault driver', 'above the limit', 'beyond the limit', 'excess medical', 'tort claim', 'sue', 'exceed'], required: true },
        { label: 'Addresses family attendant care', any: ['attendant care', '56 hours', 'hour limit', 'family-provided', 'family provided', 'wife'] },
        { label: 'Mentions the mini-tort', any: ['mini-tort', 'mini tort', '3,000', '3000'] },
      ],
    },
  },
  {
    id: 'TC-026',
    scenario: 'US-038',
    title: 'Limited tort claimant demanding pain and suffering',
    rule: 'Pennsylvania limited tort: no non-economic damages unless a serious injury or a statutory exception; economic losses are still recoverable.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Applies limited tort: no pain and suffering without a serious injury', any: ['bars non-economic', 'barred', 'bars pain', 'decline the pain', 'no pain and suffering', 'not recover pain', 'cannot recover pain', 'not entitled to pain', 'precludes', 'unless she shows a serious', 'unless a serious injury', 'serious injury threshold', 'threshold', 'decisive', 'non-economic damages are not', 'non-economic damages unless'], required: true },
        { label: 'Notes the minor, resolved injury', any: ['8 sessions', 'back to work', 'returned to work', 'soft tissue', 'soft-tissue'], required: true },
        { label: 'Checks for serious injury or an exception', any: ['exception', 'serious injury', 'serious impairment', 'dui', 'drunk'] },
      ],
    },
  },
  {
    id: 'TC-027',
    scenario: 'US-039',
    title: 'Roommate and implied permission',
    rule: 'Liability cover usually extends to permissive users; implied permission can arise from a pattern of earlier use. Whether this use fell within it is a question of fact.',
    expect: {
      family: ['uncertain', 'genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Frames the issue as permissive use', any: ['implied permission', 'implied consent', 'without permission', 'consent'], required: true },
        { label: 'Uses the texts showing earlier borrowing', any: ['prior'], required: true },
        { label: 'Checks the roommate’s own insurance', any: ['his own insurance', 'his own policy', 'own auto policy', "roommate's insurance", "tyler's insurance", 'own insurance'] },
        { label: 'Notes the drinking', any: ['alcohol', 'beer', 'drinking', 'drunk', 'intoxicat'] },
      ],
    },
  },
  {
    id: 'TC-028',
    scenario: 'US-040',
    title: 'Valuation dispute and the appraisal clause',
    rule: 'Actual cash value should use local, like-for-like comparables; condition deductions need support. The policy appraisal clause lets either side demand appraisal with an umpire.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Challenges the distant or lower-spec comparables', any: ['local comparable', 'local listing'], required: true },
        { label: 'Takes part in the appraisal he has demanded', any: ["appoint the insurer's appraiser", 'appoint the insurer’s appraiser', 'appoint our appraiser', 'appoint an appraiser', 'select an appraiser', 'name an appraiser', 'take part in the appraisal', 'cooperate with the', 'participate in the appraisal', 'proceed with appraisal', 'proceed to appraisal', 'appraisal clause is his right', 'his right', 'honor the appraisal', 'honour the appraisal'], required: true },
        { label: 'Questions the rough interior deduction', any: ['rough', 'condition adjustment', 'condition deduction', 'interior'] },
        { label: 'Pays the undisputed amount now', any: ['undisputed', 'partial payment', 'advance', 'pay now'] },
      ],
    },
  },
  {
    id: 'TC-029',
    scenario: 'US-041',
    title: 'Aftermarket parts in the ADAS path',
    rule: 'Parts that affect radar and camera systems should follow the manufacturer’s repair procedures, which may require genuine parts, and calibration must be included. Non-OEM parts must be disclosed.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Requires genuine parts where the sensors depend on them', any: ['oem', 'genuine part', 'original equipment', 'manufacturer part', 'genuine honda'], required: true },
        { label: 'Adds radar and camera calibration to the estimate', any: ['add calibration', 'add radar and camera calibration', 'add the calibration', 'include calibration', 'include the calibration', 'including calibration', 'calibration to the estimate', 'calibration must be', 'calibration should be', 'pay for calibration', 'cover calibration', 'plus calibration', 'with calibration'], required: true },
        { label: 'Discloses any aftermarket parts', any: ['disclos', 'written notice', 'consent'] },
      ],
    },
  },
  {
    id: 'TC-030',
    scenario: 'US-042',
    title: 'California total loss without tax and fees',
    rule: 'California fair claims regulations: a total loss settlement must include sales tax, license and transfer fees for a comparable vehicle. Unscheduled custom equipment is limited by the policy.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium', 'high'],
      flags: [
        { label: 'Adds the missing tax and fees to the total loss offer', any: ['add sales tax', 'add the sales tax', 'including sales tax', 'with tax and fees', 'reissue', 'fair claims', '2695', 'must include tax', 'must include sales tax', 'should include tax', 'should include sales tax', 'tax and fees must', 'omitted tax', 'left out tax', 'left out the tax'], required: true },
        { label: 'Declines the lift kit that was never fitted', any: ['decline the lift', 'never lifted', 'not fitted', 'no evidence it was fitted', 'unless there is evidence', 'not proven', 'unproven', 'unsupported', 'not supported'], required: true },
        { label: 'Applies the custom equipment limit', any: ['1,500', '1500', 'custom equipment', 'custom parts'] },
      ],
    },
  },
  {
    id: 'TC-031',
    scenario: 'US-043',
    title: 'Owner-retained total loss in Texas',
    rule: 'Owner-retained total loss: pay actual cash value less salvage value and deductible, and follow the state rules so the title is branded salvage.',
    expect: {
      family: ['genuine'],
      risk: ['low', 'medium'],
      flags: [
        { label: 'Deducts the salvage value', any: ['salvage value', '1700', 'owner-retained', 'owner retained'], required: true },
        { label: 'Handles the salvage title', any: ['salvage title', 'branded', 'rebuilt title', 'title'], required: true },
        { label: 'Recovers from the at-fault driver', any: ['subrogat', 'recover', 'at-fault driver', 'other driver'] },
      ],
    },
  },
  {
    id: 'TC-032',
    scenario: 'US-044',
    title: 'Medicare beneficiary with a pre-existing knee',
    rule: 'Value an aggravation of a pre-existing condition, not the whole condition. For Medicare beneficiaries, liability settlements must be reported under Section 111 and Medicare’s conditional payments reimbursed.',
    expect: {
      family: ['genuine'],
      risk: ['medium', 'high'],
      flags: [
        { label: 'Values the knee as an aggravation, not the whole condition', any: ['brought the surgery forward', 'brought forward', 'accelerat', 'did not cause the arthritis', 'not cause the arthritis', 'value as an aggravation', 'value the claim as an aggravation', 'pre-existing', 'preexisting', 'already recommended', 'prior condition', 'would have needed', 'needed anyway', 'apportion'], required: true },
        { label: 'Deals with Medicare reporting and reimbursement', any: ['section 111', 'reimburse medicare', 'medicare lien', 'msp', 'medicare secondary payer', "medicare's interest"], required: true },
        { label: 'Gets an independent medical opinion', any: ['independent medical', 'ime', 'independent orthopedic', 'second opinion', 'peer review'] },
      ],
    },
  },
];
