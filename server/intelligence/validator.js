// ResponseValidator: Post-generation forensic verification and grounding layer.
// Checks exhibit citation authenticity, performs deterministic substring quote verification,
// classifies facts vs. inferences, and guarantees secret protection.

/**
 * Normalizes text for lenient whitespace comparison.
 */
function normalizeForComparison(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deterministically verifies whether quoted strings in the response exist verbatim in the case exhibits.
 */
export function verifyExhibitQuotes(text = '', exhibits = []) {
  const verifiedQuotes = [];
  const unverifiedQuotes = [];

  if (!text || !Array.isArray(exhibits) || exhibits.length === 0) {
    return { verifiedQuotes, unverifiedQuotes, quoteAccuracyRate: 100 };
  }

  // Regex to match quotes associated with exhibits:
  // e.g., Exhibit A: "quote text", "quote text" (Exhibit A), Exhibit B stated "quote text"
  const quotePattern = /(?:Exhibit\s+([A-Z])(?:[^\n"“”]*?)[“"]([^"“”]{8,250})[”"]|[“"]([^"“”]{8,250})[”"]\s*\((?:from\s+)?Exhibit\s+([A-Z])\))/gi;

  let match;
  while ((match = quotePattern.exec(text)) !== null) {
    const exhibitLetter = (match[1] || match[4] || '').toUpperCase();
    const quotedString = match[2] || match[3] || '';

    if (!exhibitLetter || !quotedString) continue;

    const exhibitIdx = exhibitLetter.charCodeAt(0) - 65;
    const targetExhibit = exhibits[exhibitIdx];

    if (!targetExhibit) {
      unverifiedQuotes.push({
        exhibit: `Exhibit ${exhibitLetter}`,
        quote: quotedString,
        reason: `Target Exhibit ${exhibitLetter} does not exist in active case.`,
        isHallucinated: true,
      });
      continue;
    }

    const normSource = normalizeForComparison(targetExhibit.text);
    const normQuote = normalizeForComparison(quotedString);

    if (normSource.includes(normQuote)) {
      const charIndex = normSource.indexOf(normQuote);
      verifiedQuotes.push({
        exhibit: `Exhibit ${exhibitLetter}`,
        quote: quotedString,
        charIndex,
        matchType: 'EXACT_SUBSTRING_VERIFIED',
      });
    } else {
      unverifiedQuotes.push({
        exhibit: `Exhibit ${exhibitLetter}`,
        quote: quotedString,
        reason: `Quote does not appear verbatim in Exhibit ${exhibitLetter} source text.`,
        isHallucinated: false,
      });
    }
  }

  const totalQuotes = verifiedQuotes.length + unverifiedQuotes.length;
  const quoteAccuracyRate = totalQuotes > 0 ? Math.round((verifiedQuotes.length / totalQuotes) * 100) : 100;

  return {
    verifiedQuotes,
    unverifiedQuotes,
    totalQuotes,
    quoteAccuracyRate,
  };
}

/**
 * Classifies statements into Verified Facts, Reasoned Inferences, and Contradictions.
 */
export function classifyStatementTypes(text = '') {
  if (!text) return { facts: 0, inferences: 0, contradictions: 0, allegations: 0 };

  const sentences = text.split(/(?<=[.?!])\s+/);
  let facts = 0;
  let inferences = 0;
  let contradictions = 0;
  let allegations = 0;

  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (/contradiction|conflict|discrepancy|opposed|inconsistent|deadlock/i.test(lower)) {
      contradictions++;
    } else if (/suggests|likely|implies|indicates|inferred|appears that|deduces|probable/i.test(lower)) {
      inferences++;
    } else if (/allege[sd]?|claimed|stated by driver|driver asserts|unconfirmed/i.test(lower)) {
      allegations++;
    } else if (/telematics recorded|recorded at|speed of|dated|invoice confirms|cctv shows|engineer confirmed/i.test(lower)) {
      facts++;
    }
  }

  return {
    totalSentences: sentences.length,
    facts,
    inferences,
    contradictions,
    allegations,
  };
}

/**
 * Validates generated response against citation integrity, deterministic quote authenticity,
 * secret sanitization, and regulatory disclaimer standards.
 */
export function validateResponse({ text = '', activeCase = null, regulations = [] } = {}) {
  const result = {
    isValid: true,
    citationsValid: true,
    exhibitsVerified: [],
    invalidExhibits: [],
    statutesVerified: [],
    warnings: [],
    sanitizedText: text,
    quoteVerification: { verifiedQuotes: [], unverifiedQuotes: [], quoteAccuracyRate: 100 },
    statementClassification: { facts: 0, inferences: 0, contradictions: 0, allegations: 0 },
    groundingScore: 100,
  };

  if (!text) return result;

  // 1. Secrets Sanitization Check (Never leak sk-ant or Bearer tokens)
  if (/sk-ant-[a-zA-Z0-9_\-]{20,}|Bearer\s+[a-zA-Z0-9_\-\.]{20,}/i.test(text)) {
    result.sanitizedText = text.replace(/sk-ant-[a-zA-Z0-9_\-]{20,}|Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, '[REDACTED_API_KEY]');
    result.warnings.push('Redacted potential credential pattern from response text.');
  }

  // 2. Validate Cited Exhibits
  const citedExhibitMatches = text.match(/\bExhibit\s+([A-Z])\b/gi) || [];
  const uniqueCitedExhibits = Array.from(new Set(citedExhibitMatches.map((c) => c.replace(/Exhibit\s+/i, '').toUpperCase())));

  const actualExhibitCount = activeCase?.exhibits?.length || 0;
  const validExhibitLetters = Array.from({ length: actualExhibitCount }, (_, i) => String.fromCharCode(65 + i));

  for (const letter of uniqueCitedExhibits) {
    if (validExhibitLetters.includes(letter)) {
      result.exhibitsVerified.push(`Exhibit ${letter}`);
    } else if (actualExhibitCount > 0) {
      result.invalidExhibits.push(`Exhibit ${letter}`);
      result.citationsValid = false;
      result.warnings.push(`Response cited Exhibit ${letter}, but this case only contains Exhibits ${validExhibitLetters.join(', ')}.`);
    }
  }

  // 3. Verbatim Substring Quote Verification
  if (activeCase?.exhibits && activeCase.exhibits.length > 0) {
    const quoteCheck = verifyExhibitQuotes(result.sanitizedText, activeCase.exhibits);
    result.quoteVerification = quoteCheck;
    if (quoteCheck.unverifiedQuotes.length > 0) {
      result.warnings.push(`${quoteCheck.unverifiedQuotes.length} quoted statements could not be verified verbatim against exhibit text.`);
    }
  }

  // 4. Statement Classification
  result.statementClassification = classifyStatementTypes(result.sanitizedText);

  // 5. Check for Mandatory Human-Review Disclaimers on Final Decisions
  if (/(approve|reject) claim/i.test(result.sanitizedText) && !/human|investigator|handler|review|authorit/i.test(result.sanitizedText)) {
    result.warnings.push('Recommendation references claim disposition without emphasizing required human handler review.');
  }

  // Calculate grounding score (0 - 100)
  let score = 100;
  if (!result.citationsValid) score -= 30;
  if (result.invalidExhibits.length > 0) score -= 20 * result.invalidExhibits.length;
  if (result.quoteVerification.unverifiedQuotes.length > 0) score -= 10 * result.quoteVerification.unverifiedQuotes.length;
  result.groundingScore = Math.max(0, Math.min(100, score));

  return result;
}
