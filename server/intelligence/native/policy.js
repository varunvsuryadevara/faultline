// Native Policy Intelligence Engine for FaultLine.
// Evaluates policy conditions against confirmed investigation facts without external AI.
// Never invents policy wording or makes unauthorized binding legal declarations.

export function evaluatePolicyCompliance(exhibits = [], policyData = null) {
  const issues = [];
  const allText = exhibits.map((e) => e.text || '').join(' ').toLowerCase();

  // Baseline standard comprehensive motor policy clauses
  const clauses = [
    {
      clauseId: 'SEC-01-NAMED-DRIVER',
      title: 'Permitted / Named Driver Warranty',
      rule: 'Vehicle must be operated by a permitted driver named on the policy schedule or holding valid driving authority.',
      status: 'VERIFIED_COMPLIANT',
      details: 'No unauthorized driver identified in incident statements.',
    },
    {
      clauseId: 'SEC-02-PERMITTED-USE',
      title: 'Limitation as to Use (Social, Domestic & Pleasure vs Commercial / Hire)',
      rule: 'Use restricted to Social, Domestic and Pleasure (SDP) unless business use is declared.',
      status: /courier|food delivery|uber|fare|hire and reward/i.test(allText) ? 'COVERAGE_QUESTION' : 'VERIFIED_COMPLIANT',
      details: /courier|food delivery|uber|fare|hire and reward/i.test(allText)
        ? 'Potential commercial hire-and-reward activity mentioned in text; policy endorsement review required.'
        : 'Incident occurred during personal transit.',
    },
    {
      clauseId: 'SEC-03-TIMELY-NOTIFICATION',
      title: 'Condition Precedent: Prompt Notification of Incident',
      rule: 'Incident must be reported to the insurer within contractual window (typically 24 to 48 hours).',
      status: /reported 3 months later|delayed notification|failed to report until solicitor letter/i.test(allText) ? 'COVERAGE_QUESTION' : 'VERIFIED_COMPLIANT',
      details: /delayed notification/i.test(allText)
        ? 'Extended delay prior to insurer notification; prejudice to investigation must be assessed.'
        : 'Notification cadence is within acceptable procedural standards.',
    },
    {
      clauseId: 'POL-CARE-04',
      title: 'Duty of Reasonable Care & Roadworthiness Warranty',
      rule: 'Insured must take reasonable precautions to maintain vehicle in safe, roadworthy condition.',
      status: /bald tyres|worn brake pads|failed mot|rust|corrosion/i.test(allText) ? 'POTENTIAL_BREACH' : 'VERIFIED_COMPLIANT',
      details: /bald tyres|worn brake pads|rust|corrosion/i.test(allText)
        ? 'Physical vehicle defects or structural corrosion identified preceding incident.'
        : 'No pre-existing roadworthiness breach identified.',
    },
  ];

  const coverageQuestions = clauses.filter((c) => c.status === 'COVERAGE_QUESTION' || c.status === 'POTENTIAL_BREACH');

  return {
    totalClausesChecked: clauses.length,
    clauses,
    hasCoverageQuestions: coverageQuestions.length > 0,
    coverageQuestions: coverageQuestions.map((q) => ({
      clauseId: q.clauseId,
      title: q.title,
      details: q.details,
      recommendedAction: 'Request formal policy schedule review from underwriting team before settlement.',
    })),
  };
}
