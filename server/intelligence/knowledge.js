// InternalKnowledgeService: Deterministic knowledge base for FaultLine application guidance,
// navigation, operational policies, forensic decision safeguards, and system documentation.

export const APPLICATION_KNOWLEDGE = {
  about: {
    title: 'FaultLine Motor Insurance Adjudication & Fraud Cross-Examination Platform',
    summary:
      'FaultLine is an enterprise-grade AI-powered motor claims investigation platform. It cross-examines multiple contradictory accounts of a vehicle collision, mechanically verifies verbatim quotes against original evidence exhibits, renders interactive contradiction network graphs and timelines, applies statutory regulatory checks across 20 jurisdictions, and enforces strict forensic safeguards to recommend APPROVE, REJECT, or KEEP UNDER REVIEW.',
    architecture:
      'FaultLine operates an Internal-First Hybrid Intelligence architecture. Routine questions, database queries, statutory lookups, and workflow checks run entirely on internal deterministic engines without consuming external API tokens. Advanced reasoning and narrative synthesis escalate to Anthropic Claude 3.5 Sonnet only when necessary.',
  },

  features: [
    {
      name: 'Scenario Library',
      description: 'Holds 266 benchmark motor claims scenarios across 20 countries and 4 claim areas (Staged Collisions, Inflated Damage, Phantom Passengers, and Genuine Reporting Errors).',
      navigation: 'Accessible via the Sidebar under "Scenario Library" (#/scenarios).',
    },
    {
      name: 'Operational Dashboard',
      description: 'Triage command center displaying scenario breakdowns, claim stage distribution, risk metrics, and recent investigations.',
      navigation: 'Accessible via the Sidebar under "Dashboard" (#/).',
    },
    {
      name: 'New Investigation Workspace',
      description: 'Workspace where investigators create custom claim files, upload multi-file exhibits, and initiate live AI cross-examination.',
      navigation: 'Accessible via the Sidebar under "New Investigation" (#/case).',
    },
    {
      name: 'Evidence Upload & Ingestion Pipeline',
      description: 'Supports real text extraction from PDF (pdf-parse), multi-sheet Excel workbooks (xlsx), Word documents (mammoth), CSV, and plain text. Max file size: 20MB per file.',
      navigation: 'Inside the Case File panel by clicking "+ Add Files" on any exhibit.',
    },
    {
      name: 'Cross-Examination Network',
      description: 'Interactive Canvas/SVG entity-relationship graph connecting Claimants, Insureds, Witnesses, and Telematics with red conflict edges representing detected contradictions.',
      navigation: 'Found in the Analysis Panel under the "Contradiction Graph" view.',
    },
    {
      name: 'Investigation Timeline',
      description: 'Chronological visual ordering of all key event statements extracted from testimony and objective data, highlighting timestamp discrepancies.',
      navigation: 'Found in the Analysis Panel under the "Timeline" view.',
    },
    {
      name: 'Final Claim Decision Engine',
      description: 'Evaluates claim merits and generates an APPROVE, REJECT, or KEEP UNDER REVIEW recommendation backed by 4 forensic safeguards and detailed exhibit-citing paragraphs.',
      navigation: 'Found in the Analysis Panel under the "Claim Decision" tab.',
    },
    {
      name: 'Legal & Regulatory Library',
      description: 'Comprehensive statutory hub covering 20 jurisdictions and 16 Master Motor Law Categories A–P with 69 verified official statutes and cross-country comparisons.',
      navigation: 'Accessible via the Sidebar under "Legal & Regulatory Library" (#/legal-library).',
    },
    {
      name: 'Report Export System',
      description: 'Exports complete claim adjudication dossiers in 5 formats: Plain Text (.txt), Adobe PDF (.pdf), Microsoft Word (.docx), Markdown (.md), and Print-optimized CSS.',
      navigation: 'Available via the "Export Report" button in the Final Claim Decision panel.',
    },
    {
      name: 'Centralized Theme System',
      description: 'Enterprise appearance engine supporting Dark Mode, Light Mode, and System Mode, with 6 accent colors and WCAG AAA compliance.',
      navigation: 'Click the Settings gear icon in the Sidebar or TopBar.',
    },
  ],

  decisionStatuses: {
    APPROVE: {
      label: 'APPROVE CLAIM',
      meaning: 'Evidence sufficiently corroborates that the incident occurred as reported. Material facts are supported by independent physical or third-party evidence, and no unresolvable fraud indicators exist.',
      safeguard: 'Minor isolated discrepancies (e.g. slight speed estimation variations) do not prevent approval when core collision mechanics are verified.',
    },
    REJECT: {
      label: 'REJECT CLAIM',
      meaning: 'Reliable, material, and corroborated grounds exist demonstrating fraud, staged collision, phantom damage, or material policy breach.',
      safeguard: 'CRITICAL RULE: Rejection is NEVER recommended solely due to missing documents, algorithmic suspicion scores, or isolated minor contradictions without hard corroboration.',
    },
    KEEP_UNDER_REVIEW: {
      label: 'KEEP UNDER REVIEW',
      meaning: 'Significant material facts remain ambiguous, essential physical evidence (e.g. police CAD or telematics) is missing, or direct witness contradictions are unresolved.',
      safeguard: 'Default safe harbor whenever evidence is thin or contradictory, preventing premature wrongful repudiation.',
    },
  },

  supportedFormats: [
    'PDF (.pdf) — Full multi-page text and table extraction via pdf-parse',
    'Excel (.xlsx, .xls) — Multi-sheet workbook parsing with cell and column coordinates via SheetJS',
    'Word (.docx) — Clean paragraph and statement extraction via Mammoth',
    'CSV / Text (.csv, .txt) — Plaintext delimiter parsing',
    'Images (.jpg, .jpeg, .png) — Image metadata, resolution, and forensic tag extraction',
  ],

  troubleshooting: [
    'Connection Timeout (127.0.0.1): Ensure the server is started outside the sandbox on port 8787 and Vite on 5173.',
    'Missing API Key: The application falls back to local deterministic intelligence and pre-seeded evaluation models. Add ANTHROPIC_API_KEY in .env for live Sonnet escalation.',
    'File Upload Fails: Verify file is <= 20MB and matches allowed formats (PDF, XLSX, CSV, DOCX, TXT, PNG, JPG).',
  ],
};

/**
 * Searches the internal application knowledge base.
 */
export function searchKnowledge(query) {
  const q = String(query || '').toLowerCase();
  
  if (/what is faultline/i.test(q)) {
    return {
      topic: 'About FaultLine',
      content: `${APPLICATION_KNOWLEDGE.about.summary}\n\n**Architecture Principle:**\n${APPLICATION_KNOWLEDGE.about.architecture}`,
    };
  }

  if (/decision|approve|reject|review|safeguard/i.test(q)) {
    return {
      topic: 'Final Claim Decision Engine & Forensic Safeguards',
      content: `### Final Claim Decision Outcomes & Safeguards:\n\n` +
        `1. **${APPLICATION_KNOWLEDGE.decisionStatuses.APPROVE.label}**\n` +
        `- *Meaning:* ${APPLICATION_KNOWLEDGE.decisionStatuses.APPROVE.meaning}\n` +
        `- *Safeguard:* ${APPLICATION_KNOWLEDGE.decisionStatuses.APPROVE.safeguard}\n\n` +
        `2. **${APPLICATION_KNOWLEDGE.decisionStatuses.REJECT.label}**\n` +
        `- *Meaning:* ${APPLICATION_KNOWLEDGE.decisionStatuses.REJECT.meaning}\n` +
        `- *Safeguard:* ${APPLICATION_KNOWLEDGE.decisionStatuses.REJECT.safeguard}\n\n` +
        `3. **${APPLICATION_KNOWLEDGE.decisionStatuses.KEEP_UNDER_REVIEW.label}**\n` +
        `- *Meaning:* ${APPLICATION_KNOWLEDGE.decisionStatuses.KEEP_UNDER_REVIEW.meaning}\n` +
        `- *Safeguard:* ${APPLICATION_KNOWLEDGE.decisionStatuses.KEEP_UNDER_REVIEW.safeguard}`,
    };
  }

  if (/supported (file )?format|upload (file|format)/i.test(q)) {
    return {
      topic: 'Supported Evidence Formats & Upload Limits',
      content: `### Supported Evidence Ingestion Formats:\n\n` +
        APPLICATION_KNOWLEDGE.supportedFormats.map((f) => `- ${f}`).join('\n') +
        `\n\n*Maximum File Size Limit:* 20 MB per file.\n*Attachment Rule:* Multiple files can be attached to a single exhibit.`,
    };
  }

  if (/where is|how (to|do i) navigate|sidebar/i.test(q)) {
    return {
      topic: 'Application Navigation & Features',
      content: `### FaultLine Feature Navigation:\n\n` +
        APPLICATION_KNOWLEDGE.features.map((f) => `• **${f.name}**: ${f.description}\n  *Navigation:* ${f.navigation}`).join('\n\n'),
    };
  }

  // Generic match across features
  const matchedFeatures = APPLICATION_KNOWLEDGE.features.filter(
    (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
  );

  if (matchedFeatures.length > 0) {
    return {
      topic: 'Application Features',
      content: matchedFeatures.map((f) => `### ${f.name}\n${f.description}\n\n**Where to find it:** ${f.navigation}`).join('\n\n'),
    };
  }

  return {
    topic: 'FaultLine Application Help',
    content: `${APPLICATION_KNOWLEDGE.about.summary}\n\n**Key Application Modules:**\n` +
      APPLICATION_KNOWLEDGE.features.map((f) => `- **${f.name}**: ${f.navigation}`).join('\n'),
  };
}
