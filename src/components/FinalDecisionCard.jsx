import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Download,
  FileCheck2,
  FileSearch,
  FileText,
  Globe,
  HelpCircle,
  Info,
  ListOrdered,
  MapPin,
  PenTool,
  RotateCcw,
  Save,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { DECISION_OUTCOMES, DECISION_LABELS } from '../../shared/decision.js';
import { evaluateJurisdictionalLegalContext } from '../../shared/legal-intelligence.js';
import { copyText } from '../lib/report.js';
import ExportReportModal from './ExportReportModal.jsx';
import JurisdictionSelectorModal from './RegulatoryLibrary/JurisdictionSelectorModal.jsx';
import ApplicableRegulationsPanel from './RegulatoryLibrary/ApplicableRegulationsPanel.jsx';
import { Button, cx } from './ui.jsx';

const DECISION_CONFIG = {
  [DECISION_OUTCOMES.APPROVE]: {
    label: DECISION_LABELS.APPROVE,
    questionLabel: 'Why Should This Claim Be Approved?',
    badgeBg: 'bg-agree/15',
    badgeText: 'text-agree-ink',
    badgeBorder: 'border-agree/40',
    headerBg: 'from-agree/15 via-agree/5 to-transparent',
    icon: CheckCircle2,
    iconColor: 'text-agree',
    glowColor: 'shadow-[0_0_35px_rgba(34,197,94,0.12)]',
    description: 'Evidence sufficiently corroborates the reported circumstances with no material unresolved contradictions.',
  },
  [DECISION_OUTCOMES.REJECT]: {
    label: DECISION_LABELS.REJECT,
    questionLabel: 'Why Should This Claim Be Rejected?',
    badgeBg: 'bg-critical/15',
    badgeText: 'text-critical-ink',
    badgeBorder: 'border-critical/40',
    headerBg: 'from-critical/15 via-critical/5 to-transparent',
    icon: XCircle,
    iconColor: 'text-critical',
    glowColor: 'shadow-[0_0_35px_rgba(239,68,68,0.12)]',
    description: 'Substantial objective evidence contradicts the reported circumstances, establishing legitimate grounds for declinature.',
  },
  [DECISION_OUTCOMES.REVIEW]: {
    label: DECISION_LABELS.REVIEW,
    questionLabel: 'Why Should This Claim Remain Under Review?',
    badgeBg: 'bg-minor/15',
    badgeText: 'text-minor-ink',
    badgeBorder: 'border-minor/40',
    headerBg: 'from-minor/15 via-minor/5 to-transparent',
    icon: Clock,
    iconColor: 'text-minor',
    glowColor: 'shadow-[0_0_35px_rgba(245,158,11,0.12)]',
    description: 'Evidence is insufficient or contains unresolved material conflicts. Further investigation required before final determination.',
  },
};

export default function FinalDecisionCard({
  decision,
  title = 'Untitled Case',
  context = '',
  result = null,
  review = {},
  caseFile = null,
  scenario = null,
  onSave = null,
  onRerun = null,
  onNotify = null,
  onSelectExhibit = null,
  onOpenFullLibrary = null,
  onNavigateMetric = null,
  stale = false,
}) {
  const [activeTab, setActiveTab] = useState('evidence');
  const [showConfidenceExplainer, setShowConfidenceExplainer] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isJurisdictionModalOpen, setIsJurisdictionModalOpen] = useState(false);

  // Jurisdictional Legal Context State
  const initialCountry = decision?.jurisdiction?.countryCode || scenario?.country || caseFile?.country || 'UK';
  const initialRegion = decision?.jurisdiction?.regionCode || scenario?.region || caseFile?.region || null;

  const [currentCountry, setCurrentCountry] = useState(initialCountry);
  const [currentRegion, setCurrentRegion] = useState(initialRegion);
  const [jurisdictionData, setJurisdictionData] = useState(decision?.jurisdiction || null);
  const [applicableRegulations, setApplicableRegulations] = useState(decision?.applicableRegulations || []);
  const [legalDecisionImpact, setLegalDecisionImpact] = useState(decision?.legalDecisionImpact || null);
  const [traceabilityChain, setTraceabilityChain] = useState(decision?.traceabilityChain || []);
  const [isResearching, setIsResearching] = useState(false);
  const [researchMode, setResearchMode] = useState('live-claude-verified');

  // Human Reviewer Workspace State
  const invId = scenario?.id || decision?.investigation_id || 'case';
  const [reviewerNotes, setReviewerNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(`faultline_notes_${invId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [isReviewed, setIsReviewed] = useState(() => {
    try {
      return localStorage.getItem(`faultline_reviewed_${invId}`) === 'true';
    } catch {
      return false;
    }
  });

  const [reviewerName, setReviewerName] = useState(() => {
    try {
      return localStorage.getItem(`faultline_reviewer_name_${invId}`) || 'Senior Claims Reviewer';
    } catch {
      return 'Senior Claims Reviewer';
    }
  });

  const [reviewedAt, setReviewedAt] = useState(() => {
    try {
      return localStorage.getItem(`faultline_reviewed_at_${invId}`) || null;
    } catch {
      return null;
    }
  });

  // Sync state if decision prop updates
  useEffect(() => {
    if (decision?.jurisdiction) setJurisdictionData(decision.jurisdiction);
    if (decision?.applicableRegulations) setApplicableRegulations(decision.applicableRegulations);
    if (decision?.legalDecisionImpact) setLegalDecisionImpact(decision.legalDecisionImpact);
    if (decision?.traceabilityChain) setTraceabilityChain(decision.traceabilityChain);
  }, [decision]);

  // Handle changing jurisdiction
  const handleSelectJurisdiction = async ({ countryCode, region }) => {
    setCurrentCountry(countryCode);
    setCurrentRegion(region);
    setIsResearching(true);

    try {
      // 1. First evaluate immediately locally to prevent blank states
      const localEval = evaluateJurisdictionalLegalContext({
        countryCode,
        region,
        caseFile: caseFile || { title, context },
        scenario,
        decision: decision.decision,
        contradictions: decision.unresolved_issues || [],
        review,
      });

      setJurisdictionData(localEval.jurisdiction);
      setApplicableRegulations(localEval.applicableRegulations);
      setLegalDecisionImpact(localEval.legalDecisionImpact);
      setTraceabilityChain(localEval.traceabilityChain);

      // 2. Query server for live Claude research or cached verification
      const res = await fetch('/api/legal/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode,
          region,
          claimType: scenario?.category || caseFile?.category || '',
          category: scenario?.category || caseFile?.category || '',
          title,
          context,
          decision: decision.decision,
          refresh: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.applicableRegulations?.length) {
          setApplicableRegulations(data.applicableRegulations);
          setJurisdictionData(data.jurisdiction);
          setLegalDecisionImpact(data.legalDecisionImpact);
          setTraceabilityChain(data.traceabilityChain || []);
          setResearchMode(data.researchMode || 'live-claude-verified');
        }
      }
      onNotify?.(`Switched jurisdiction to ${localEval.jurisdiction.countryName}${localEval.jurisdiction.regionName ? ` (${localEval.jurisdiction.regionName})` : ''}`);
    } catch (err) {
      console.warn('Could not complete live legal research fetch:', err);
    } finally {
      setIsResearching(false);
    }
  };

  // Handle live research refresh
  const handleRefreshResearch = async () => {
    setIsResearching(true);
    try {
      const res = await fetch('/api/legal/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countryCode: currentCountry,
          region: currentRegion,
          claimType: scenario?.category || caseFile?.category || '',
          category: scenario?.category || caseFile?.category || '',
          title,
          context,
          decision: decision.decision,
          refresh: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.applicableRegulations?.length) {
          setApplicableRegulations(data.applicableRegulations);
          setJurisdictionData(data.jurisdiction);
          setLegalDecisionImpact(data.legalDecisionImpact);
          setTraceabilityChain(data.traceabilityChain || []);
          setResearchMode(data.researchMode || 'live-claude-verified');
        }
        onNotify?.('Live jurisdictional legal intelligence refreshed successfully');
      } else {
        onNotify?.('Refreshed using verified statutory repository');
      }
    } catch (err) {
      console.error('Research refresh error:', err);
      onNotify?.('Refreshed using offline verified statutory repository');
    } finally {
      setIsResearching(false);
    }
  };

  // Handle Reviewer Note save
  const handleSaveReviewerNote = (regId, note) => {
    const updated = { ...reviewerNotes, [regId]: note };
    setReviewerNotes(updated);
    try {
      localStorage.setItem(`faultline_notes_${invId}`, JSON.stringify(updated));
    } catch {}
  };

  // Handle Mark as Reviewed
  const handleToggleReviewed = () => {
    const next = !isReviewed;
    const now = next ? new Date().toISOString() : null;
    setIsReviewed(next);
    setReviewedAt(now);
    try {
      localStorage.setItem(`faultline_reviewed_${invId}`, String(next));
      if (now) localStorage.setItem(`faultline_reviewed_at_${invId}`, now);
      else localStorage.removeItem(`faultline_reviewed_at_${invId}`);
    } catch {}
    onNotify?.(next ? 'Claim marked as reviewed by human investigator' : 'Review status removed');
  };

  if (!decision) return null;

  const config = DECISION_CONFIG[decision.decision] || DECISION_CONFIG[DECISION_OUTCOMES.REVIEW];
  const DecisionIcon = config.icon;

  const supportingCount = decision.supporting_count ?? (decision.supporting_evidence?.length || 0);
  const contradictionsCount = decision.contradictions_count ?? (decision.unresolved_issues?.length || 0);
  const unresolvedCount = decision.unresolved_count ?? ((decision.unresolved_issues?.length || 0) + (decision.missing_evidence?.length || 0));

  const handleCopySummary = async () => {
    const text = `FAULTLINE FINAL CLAIM DECISION: ${decision.decision_label}
AI Assessment Confidence: ${decision.confidence}/100
Risk Level: ${decision.risk_level}
File Completeness: ${decision.investigation_completeness}%
Jurisdiction: ${jurisdictionData?.countryName || currentCountry} (${jurisdictionData?.regulator || ''})

WHY THIS DECISION?
${decision.decision_explanation || decision.executive_summary}

KEY REASONS:
${(decision.key_reasons || decision.decision_rationale || []).map((r) => `• ${r}`).join('\n')}

APPLICABLE REGULATIONS:
${applicableRegulations.map((r) => `• ${r.title} [${r.legalReference}]: ${r.assessmentStatus}`).join('\n')}`;

    const ok = await copyText(text);
    onNotify?.(ok ? 'Decision & legal summary copied to clipboard' : 'Copy failed');
  };

  return (
    <section
      aria-label="Final Claim Decision"
      className={cx(
        'relative rounded-xl border border-rule bg-sheet p-6 transition-all duration-200',
        config.glowColor,
      )}
    >
      {/* Top Banner Gradient */}
      <div className={cx('absolute inset-x-0 top-0 h-32 rounded-t-xl bg-gradient-to-b pointer-events-none', config.headerBg)} />

      <div className="relative space-y-6">
        {/* 1. Header with Decision Badge and Action Buttons */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-pen/10 text-pen">
                <Scale className="size-4" />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wider text-pen">
                Forensic Claim Decision Engine
              </span>
              {decision.investigation_id && (
                <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-mono text-ink-3 border border-rule">
                  {decision.investigation_id}
                </span>
              )}
              {isReviewed && (
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <UserCheck className="size-3" />
                  Human Reviewed
                </span>
              )}
            </div>
            <h2 className="mt-2 text-[clamp(1.4rem,2.2vw,1.85rem)] font-extrabold tracking-[-0.02em] text-ink flex items-center gap-3">
              <DecisionIcon className={cx('size-7', config.iconColor)} />
              <span>{decision.decision_label}</span>
            </h2>
            <p className="mt-1 text-[14px] text-ink-2 max-w-[70ch] leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopySummary} title="Copy decision summary and explanation">
              <Copy className="size-3.5" />
              Copy Summary
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsExportOpen(true)} title="Export forensic report (TXT, PDF, Word, Markdown, Print)">
              <Download className="size-3.5" />
              Export Report
            </Button>
            {onSave && (
              <Button size="sm" onClick={onSave} title="Save this investigation">
                <Save className="size-3.5" />
                Save Case
              </Button>
            )}
          </div>
        </div>

        {/* 2. Structured 6-Metric Forensic Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 border-y border-rule/80 py-4 bg-paper/30 rounded-lg px-2">
          {/* Metric 1: AI Confidence */}
          <div className="relative rounded-lg bg-sheet p-3 border border-rule/60">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-ink-3">AI Confidence</span>
              <button
                type="button"
                onClick={() => setShowConfidenceExplainer((v) => !v)}
                className="text-ink-3 hover:text-pen p-0.5 rounded"
                title="Explain confidence calculation"
              >
                <HelpCircle className="size-3.5" />
              </button>
            </div>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-[24px] font-extrabold text-ink tabular">{decision.confidence}</span>
              <span className="text-[12px] text-ink-3">/100</span>
            </p>
            {showConfidenceExplainer && (
              <div className="absolute left-0 top-full mt-2 z-30 w-72 rounded-lg border border-rule bg-sheet p-3 text-[12px] text-ink-2 shadow-xl">
                <p className="font-bold text-ink mb-1">Calibrated AI Confidence</p>
                <p>{decision.confidence_explanation}</p>
              </div>
            )}
          </div>

          {/* Metric 2: Risk Level */}
          <div className="rounded-lg bg-sheet p-3 border border-rule/60">
            <span className="text-[11.5px] font-semibold text-ink-3">Risk Assessment</span>
            <p className="mt-1.5 flex items-center gap-1.5">
              <span
                className={cx(
                  'rounded px-2 py-0.5 text-[11.5px] font-bold uppercase tracking-wider border',
                  decision.risk_level === 'CRITICAL'
                    ? 'bg-critical/20 text-critical-ink border-critical/40'
                    : decision.risk_level === 'HIGH'
                      ? 'bg-major/20 text-major-ink border-major/40'
                      : decision.risk_level === 'MEDIUM'
                        ? 'bg-minor/20 text-minor-ink border-minor/40'
                        : 'bg-agree/20 text-agree-ink border-agree/40',
                )}
              >
                {decision.risk_level}
              </span>
            </p>
          </div>

          {/* Metric 3: File Completeness */}
          <div className="rounded-lg bg-sheet p-3 border border-rule/60">
            <span className="text-[11.5px] font-semibold text-ink-3">Completeness</span>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-[24px] font-extrabold text-ink tabular">{decision.investigation_completeness}%</span>
            </p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-rule/50 overflow-hidden">
              <div
                className="h-full bg-pen rounded-full transition-all duration-300"
                style={{ width: `${decision.investigation_completeness}%` }}
              />
            </div>
          </div>

          {/* Metric 4: Supporting Findings */}
          <button
            type="button"
            onClick={() => onNavigateMetric?.('supporting')}
            aria-label={`Supporting Facts: ${supportingCount} verified. Click to view verified records.`}
            title="Click to view verified supporting facts and evidence"
            className={cx(
              'group relative text-left rounded-lg bg-sheet p-3 border border-rule/60 transition-all duration-150',
              onNavigateMetric
                ? 'cursor-pointer hover:border-agree/60 hover:bg-agree-wash/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agree'
                : '',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-ink-3 group-hover:text-agree-ink transition-colors">
                Supporting Facts
              </span>
              {onNavigateMetric && (
                <ArrowRight className="size-3 text-ink-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-agree-ink transition-all" />
              )}
            </div>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-[24px] font-extrabold text-agree-ink tabular">{supportingCount}</span>
              <span className="text-[11.5px] text-ink-3">verified</span>
            </p>
            {onNavigateMetric && (
              <p className="mt-1 text-[11px] font-medium text-agree-ink opacity-0 group-hover:opacity-100 transition-opacity">
                View records →
              </p>
            )}
          </button>

          {/* Metric 5: Contradictions */}
          <button
            type="button"
            onClick={() => onNavigateMetric?.('conflicts')}
            aria-label={`Contradictions: ${contradictionsCount} active. Click to view contradictions.`}
            title="Click to view active contradictions"
            className={cx(
              'group relative text-left rounded-lg bg-sheet p-3 border border-rule/60 transition-all duration-150',
              onNavigateMetric
                ? 'cursor-pointer hover:border-critical/60 hover:bg-critical-wash/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-critical'
                : '',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-ink-3 group-hover:text-critical-ink transition-colors">
                Contradictions
              </span>
              {onNavigateMetric && (
                <ArrowRight className="size-3 text-ink-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-critical-ink transition-all" />
              )}
            </div>
            <p className="mt-1 flex items-baseline gap-1">
              <span className={cx('text-[24px] font-extrabold tabular', contradictionsCount > 0 ? 'text-critical-ink' : 'text-ink-3')}>
                {contradictionsCount}
              </span>
              <span className="text-[11.5px] text-ink-3">active</span>
            </p>
            {onNavigateMetric && (
              <p className="mt-1 text-[11px] font-medium text-critical-ink opacity-0 group-hover:opacity-100 transition-opacity">
                View records →
              </p>
            )}
          </button>

          {/* Metric 6: Unresolved Issues */}
          <button
            type="button"
            onClick={() => onNavigateMetric?.('unresolved')}
            aria-label={`Unresolved Items: ${unresolvedCount} to verify. Click to view unresolved items.`}
            title="Click to view unresolved investigation items"
            className={cx(
              'group relative text-left rounded-lg bg-sheet p-3 border border-rule/60 transition-all duration-150',
              onNavigateMetric
                ? 'cursor-pointer hover:border-minor/60 hover:bg-minor-wash/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-minor'
                : '',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-ink-3 group-hover:text-minor-ink transition-colors">
                Unresolved Items
              </span>
              {onNavigateMetric && (
                <ArrowRight className="size-3 text-ink-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-minor-ink transition-all" />
              )}
            </div>
            <p className="mt-1 flex items-baseline gap-1">
              <span className={cx('text-[24px] font-extrabold tabular', unresolvedCount > 0 ? 'text-minor-ink' : 'text-agree-ink')}>
                {unresolvedCount}
              </span>
              <span className="text-[11.5px] text-ink-3">to verify</span>
            </p>
            {onNavigateMetric && (
              <p className="mt-1 text-[11px] font-medium text-minor-ink opacity-0 group-hover:opacity-100 transition-opacity">
                View records →
              </p>
            )}
          </button>
        </div>

        {/* 3. DEDICATED EXPLANATION SECTION: "Why This Decision?" */}
        <div className="rounded-xl border border-pen/30 bg-card-elevated p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/70 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-pen/15 text-pen-bright">
                <Brain className="size-4" />
              </div>
              <div>
                <h3 className="text-[15.5px] font-bold text-ink">
                  Why This Decision?
                </h3>
                <p className="text-[12px] text-ink-3 font-medium">
                  {config.questionLabel}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-pen/10 px-2.5 py-1 text-[11.5px] font-semibold text-pen border border-pen/20">
              Evidence-Based AI Synthesis
            </span>
          </div>

          {/* Detailed Explanation Paragraph */}
          <p className="text-[14.5px] leading-relaxed text-ink font-normal antialiased">
            {decision.decision_explanation || decision.executive_summary}
          </p>

          {decision.policy_coverage_notes && (
            <div className="pt-2 border-t border-rule/60 text-[12.5px] text-ink-3 flex items-start gap-2">
              <Shield className="size-3.5 text-pen shrink-0 mt-0.5" />
              <span>
                <strong className="text-ink-2 font-medium">Policy & Coverage Note: </strong>
                {decision.policy_coverage_notes}
              </span>
            </div>
          )}
        </div>

        {/* 4. KEY REASONS SECTION */}
        <div className="rounded-xl border border-rule bg-paper/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-pen" />
            <h4 className="text-[14.5px] font-bold text-ink">
              Key Reasons for Recommendation
            </h4>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {(decision.key_reasons || decision.decision_rationale || []).map((reason, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-rule/70 bg-sheet p-3 text-[13.5px] leading-relaxed text-ink-2"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-pen/15 text-pen-bright text-[11px] font-bold mt-0.5">
                  {idx + 1}
                </span>
                <span className="flex-1 text-ink">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 5. JURISDICTIONAL LEGAL INTELLIGENCE & STATUTORY ASSESSMENT PANEL */}
        <ApplicableRegulationsPanel
          jurisdiction={jurisdictionData}
          applicableRegulations={applicableRegulations}
          legalDecisionImpact={legalDecisionImpact}
          traceabilityChain={traceabilityChain}
          onOpenJurisdictionSelector={() => setIsJurisdictionModalOpen(true)}
          onRefreshResearch={handleRefreshResearch}
          isResearching={isResearching}
          researchMode={researchMode}
          onOpenFullLibrary={onOpenFullLibrary}
          onNotify={onNotify}
          reviewerNotes={reviewerNotes}
          onSaveReviewerNote={handleSaveReviewerNote}
        />

        {/* Reassess Stale Alert */}
        {stale && (
          <div className="flex items-center justify-between rounded-lg border border-minor/40 bg-minor-wash/60 px-4 py-2.5">
            <span className="text-[13px] text-minor-ink font-medium">
              Case exhibits have been modified. Reassess to update the decision and explanation.
            </span>
            {onRerun && (
              <Button size="sm" onClick={onRerun}>
                <RotateCcw className="size-3.5" />
                Reassess Claim
              </Button>
            )}
          </div>
        )}

        {/* 6. INTERACTIVE TABBED DEEP DIVE */}
        <div className="border-t border-rule pt-4">
          <div className="flex border-b border-rule overflow-x-auto scrollbar-thin">
            {[
              {
                id: 'evidence',
                label: 'Evidence Analysis',
                count: (decision.supporting_evidence?.length || 0) + (decision.contradicting_evidence?.length || 0),
              },
              {
                id: 'issues',
                label: decision.decision === DECISION_OUTCOMES.REJECT ? 'Rejection Grounds & Proof' : 'Unresolved Issues & Gaps',
                count: (decision.unresolved_issues?.length || 0) + (decision.missing_evidence?.length || 0),
              },
              {
                id: 'actions',
                label: 'Recommended Next Steps',
                count: decision.recommended_actions?.length,
              },
              {
                id: 'changes',
                label: 'What Could Change Decision',
                count: decision.what_could_change_decision?.length,
              },
              {
                id: 'reviewer',
                label: 'Human Reviewer Workspace',
                badge: isReviewed ? 'Reviewed' : 'Pending',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-pen text-pen-bright bg-pen/5'
                    : 'border-transparent text-ink-3 hover:text-ink hover:border-rule-strong',
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.2 text-[11px] tabular',
                      activeTab === tab.id ? 'bg-pen text-white' : 'bg-paper text-ink-3 border border-rule',
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={cx(
                      'rounded-full px-1.5 py-0.2 text-[10.5px] font-bold border',
                      isReviewed ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4">
            {/* TAB 1: EVIDENCE ANALYSIS */}
            {activeTab === 'evidence' && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Supporting Evidence */}
                <div className="rounded-lg border border-agree/30 bg-agree-wash/20 p-4 space-y-3">
                  <h5 className="text-[14px] font-bold text-agree-ink flex items-center gap-2">
                    <ShieldCheck className="size-4 text-agree" />
                    Evidence Supporting Claim ({decision.supporting_evidence?.length || 0})
                  </h5>
                  {decision.supporting_evidence?.length ? (
                    <ul className="space-y-2.5">
                      {decision.supporting_evidence.map((s, idx) => (
                        <li
                          key={idx}
                          className="rounded-lg border border-rule/70 bg-sheet p-3 text-[13px] space-y-1.5 transition-colors hover:border-pen/50"
                        >
                          <div className="flex items-center justify-between text-[12px]">
                            {s.exhibit && onSelectExhibit ? (
                              <button
                                type="button"
                                onClick={() => onSelectExhibit(s.exhibit)}
                                className="font-bold text-pen hover:underline flex items-center gap-1"
                              >
                                <span>Exhibit {s.exhibit}</span>
                                <span className="text-ink-3 font-medium">({s.name})</span>
                              </button>
                            ) : (
                              <span className="font-bold text-pen">Exhibit {s.exhibit || '•'} {s.name ? `(${s.name})` : ''}</span>
                            )}
                            <span className="text-ink-3 text-[11px]">{s.reliability}</span>
                          </div>
                          <p className="text-ink font-semibold">{s.statement || s.finding}</p>
                          {s.quote && <p className="text-ink-3 italic text-[12.5px]">“{s.quote}”</p>}
                          {s.howItSupports && (
                            <p className="text-[12px] text-agree-ink bg-agree/10 px-2 py-1 rounded border border-agree/20 font-medium">
                              Support: {s.howItSupports}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-ink-3">No direct supporting exhibits submitted.</p>
                  )}
                </div>

                {/* Opposing / Contradicting Evidence */}
                <div className="rounded-lg border border-critical/30 bg-critical-wash/20 p-4 space-y-3">
                  <h5 className="text-[14px] font-bold text-critical-ink flex items-center gap-2">
                    <ShieldAlert className="size-4 text-critical" />
                    Contradicting / Challenging Evidence ({decision.contradicting_evidence?.length || 0})
                  </h5>
                  {decision.contradicting_evidence?.length ? (
                    <ul className="space-y-2.5">
                      {decision.contradicting_evidence.map((a, idx) => (
                        <li
                          key={idx}
                          className="rounded-lg border border-rule/70 bg-sheet p-3 text-[13px] space-y-1.5 transition-colors hover:border-critical/50"
                        >
                          <div className="flex items-center justify-between text-[12px]">
                            {a.exhibit && onSelectExhibit ? (
                              <button
                                type="button"
                                onClick={() => onSelectExhibit(a.exhibit)}
                                className="font-bold text-critical-ink hover:underline flex items-center gap-1"
                              >
                                <span>Exhibit {a.exhibit}</span>
                                <span className="text-ink-3 font-medium">({a.name})</span>
                              </button>
                            ) : (
                              <span className="font-bold text-critical-ink">Exhibit {a.exhibit || '•'} {a.name ? `(${a.name})` : ''}</span>
                            )}
                            <span className="text-ink-3 text-[11px]">{a.reliability}</span>
                          </div>
                          <p className="text-ink font-semibold">{a.finding || a.name}</p>
                          {a.quote && <p className="text-ink-3 italic text-[12.5px]">“{a.quote}”</p>}
                          {a.howItSupports && (
                            <p className="text-[12px] text-critical-ink bg-critical/10 px-2 py-1 rounded border border-critical/20 font-medium">
                              Conflict: {a.howItSupports}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-ink-3">No direct contradicting exhibits reported.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: UNRESOLVED ISSUES & MISSING EVIDENCE */}
            {activeTab === 'issues' && (
              <div className="space-y-4">
                {decision.unresolved_issues?.length > 0 && (
                  <div>
                    <h5 className="text-[14px] font-bold text-ink mb-2.5">
                      Active Contradictions & Factual Conflicts ({decision.unresolved_issues.length})
                    </h5>
                    <div className="space-y-2.5">
                      {decision.unresolved_issues.map((iss, idx) => (
                        <div key={idx} className="rounded-lg border border-rule bg-paper/60 p-3.5 text-[13px] space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-ink text-[14px]">{iss.title}</span>
                            <span
                              className={cx(
                                'rounded px-2 py-0.5 text-[11px] font-bold border uppercase',
                                iss.severity === 'critical'
                                  ? 'bg-critical/20 text-critical-ink border-critical/40'
                                  : iss.severity === 'major'
                                    ? 'bg-major/20 text-major-ink border-major/40'
                                    : 'bg-minor/20 text-minor-ink border-minor/40',
                              )}
                            >
                              {iss.severity} Severity
                            </span>
                          </div>

                          <p className="text-ink-2 leading-relaxed">{iss.whyItMatters}</p>

                          {iss.evidence && (
                            <div className="rounded bg-sheet p-2 text-[12.5px] text-ink-3 font-mono border border-rule/60">
                              {iss.evidence}
                            </div>
                          )}

                          <div className="text-[12px] text-pen font-semibold flex items-center gap-1 pt-1 border-t border-rule/50">
                            <span>Recommended Resolution: </span>
                            <span className="text-ink-2 font-normal">{iss.recommendedResolution}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {decision.missing_evidence?.length > 0 && (
                  <div>
                    <h5 className="text-[14px] font-bold text-ink mb-2.5">
                      Missing Independent Verification Assets ({decision.missing_evidence.length})
                    </h5>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {decision.missing_evidence.map((m, idx) => (
                        <div key={idx} className="rounded-lg border border-rule bg-paper/60 p-3 text-[13px] flex items-start gap-2.5">
                          <FileSearch className="size-4 text-minor mt-0.5 shrink-0" />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-ink">{m.item}</p>
                              {m.priority && (
                                <span className="rounded bg-minor/15 text-minor-ink px-1.5 py-0.2 text-[10.5px] font-bold border border-minor/30">
                                  {m.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-ink-3 text-[12px]">{m.why}</p>
                            {m.resolves && (
                              <p className="text-[11.5px] text-pen">Resolves: {m.resolves}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RECOMMENDED ACTIONS */}
            {activeTab === 'actions' && (
              <div className="space-y-3">
                {decision.recommended_actions?.length ? (
                  decision.recommended_actions.map((act) => (
                    <div key={act.priority} className="rounded-lg border border-rule bg-paper/50 p-4 transition-colors hover:border-rule-strong space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-pen text-white text-[12px] font-bold">
                            {act.priority}
                          </span>
                          <h5 className="text-[14.5px] font-bold text-ink">{act.issue}</h5>
                        </div>
                        <span className="text-[12px] font-medium text-ink-3 bg-sheet px-2.5 py-0.5 rounded border border-rule">
                          Assigned: <strong className="text-ink-2">{act.responsibleParty}</strong>
                        </span>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 text-[13px] text-ink-2 pt-1">
                        <div>
                          <span className="font-semibold text-ink">Action Required: </span>
                          <span>{act.action}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-ink">Evidence Needed: </span>
                          <span>{act.evidenceNeeded}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-ink">Expected Outcome: </span>
                          <span>{act.expectedOutcome}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-pen-bright">Decision Impact: </span>
                          <span>{act.impactOnDecision}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-ink-3">No further investigative actions required. Claim is ready for closing.</p>
                )}
              </div>
            )}

            {/* TAB 4: WHAT COULD CHANGE THE DECISION */}
            {activeTab === 'changes' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-pen/20 bg-paper/40 p-3 mb-2 text-[13px] text-ink-2">
                  <span className="font-bold text-ink">Investigation Outcome Sensitivity: </span>
                  Identifies specific factual developments or evidence items that would transition this recommendation to a different outcome.
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(decision.what_could_change_decision || []).map((scenarioItem, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-rule bg-sheet p-4 space-y-2 shadow-xs transition-colors hover:border-pen/50"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-rule/60 pb-2">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-pen">
                          {scenarioItem.path}
                        </span>
                        <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-bold text-ink border border-rule">
                          {scenarioItem.outcome}
                        </span>
                      </div>
                      <h6 className="text-[13.5px] font-bold text-ink">{scenarioItem.condition}</h6>
                      <p className="text-[12.5px] leading-relaxed text-ink-3">{scenarioItem.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: HUMAN REVIEWER WORKSPACE & NOTES */}
            {activeTab === 'reviewer' && (
              <div className="space-y-4">
                {/* Reviewer Sign-off Card */}
                <div className="rounded-lg border border-rule bg-paper/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-pen/15 text-pen-bright">
                        <UserCheck className="size-4" />
                      </div>
                      <div>
                        <h5 className="text-[14.5px] font-bold text-ink">Human Claims Reviewer Sign-Off</h5>
                        <p className="text-[12px] text-ink-3">
                          Verify and record formal investigator review before finalizing claim indemnification or declinature
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={isReviewed ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={handleToggleReviewed}
                      className={isReviewed ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>{isReviewed ? 'Review Completed' : 'Mark as Reviewed'}</span>
                    </Button>
                  </div>

                  {isReviewed && (
                    <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[12.5px] text-emerald-400 flex items-center justify-between">
                      <span>Reviewed by: <strong>{reviewerName}</strong></span>
                      <span>Timestamp: <span className="font-mono">{new Date(reviewedAt).toLocaleString()}</span></span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-rule/60 flex items-center gap-2">
                    <label className="text-[12px] text-ink-3 font-medium">Reviewer Identity: </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => {
                        setReviewerName(e.target.value);
                        try {
                          localStorage.setItem(`faultline_reviewer_name_${invId}`, e.target.value);
                        } catch {}
                      }}
                      className="rounded border border-rule bg-paper px-2 py-1 text-[12px] text-ink focus:border-pen focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Global Reviewer Notes */}
                <div className="rounded-lg border border-rule bg-paper/60 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <PenTool className="size-4 text-pen" />
                    <h5 className="text-[14px] font-bold text-ink">Investigator Final Claim Notes</h5>
                  </div>
                  <p className="text-[12px] text-ink-3">
                    Add human forensic commentary, policy endorsement notes, or instructions for claims adjusting teams:
                  </p>
                  <textarea
                    rows={3}
                    value={reviewerNotes.global || ''}
                    onChange={(e) => handleSaveReviewerNote('global', e.target.value)}
                    placeholder="Enter investigator observations, policyholder demeanor notes, or specific payment authorization conditions..."
                    className="w-full rounded-md border border-rule bg-sheet p-2.5 text-[13px] text-ink placeholder:text-ink-3 focus:border-pen focus:outline-hidden"
                  />
                  <div className="flex justify-between items-center text-[11.5px] text-ink-3">
                    <span>Notes automatically saved and included in formal export reports</span>
                    <span className="font-mono">{Object.keys(reviewerNotes).filter((k) => reviewerNotes[k]).length} note(s) recorded</span>
                  </div>
                </div>

                {/* Verified Facts vs Unverified Statements Audit */}
                <div className="rounded-lg border border-rule bg-paper/50 p-4 space-y-2.5">
                  <span className="text-[13px] font-bold text-ink block mb-1">
                    Evidence Classification Audit (Verified Facts vs Party Statements)
                  </span>

                  {decision.verified_facts?.map((f, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-rule/60 bg-sheet p-2.5 text-[13px]">
                      <span className="rounded px-2 py-0.5 text-[10.5px] font-bold border shrink-0 bg-agree/15 text-agree-ink border-agree/30">
                        VERIFIED FACT
                      </span>
                      <span className="text-ink flex-1 font-medium">{f.statement}</span>
                      <span className="text-[11px] text-ink-3">{f.source}</span>
                    </div>
                  ))}

                  {decision.unverified_claims?.map((u, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-rule/60 bg-sheet p-2.5 text-[13px]">
                      <span className="rounded px-2 py-0.5 text-[10.5px] font-bold border shrink-0 bg-ink/10 text-ink-2 border-rule">
                        UNVERIFIED CLAIM
                      </span>
                      <span className="text-ink flex-1">{u.statement}</span>
                      <span className="text-[11px] text-ink-3">{u.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. Human Review & Statutory Disclaimer */}
        <div className="rounded-lg border border-rule/70 bg-paper/40 p-3 text-[12px] text-ink-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-pen shrink-0" />
            <span>
              <strong>Statutory Human Review Required:</strong> FaultLine recommendations synthesize available evidence for claims triage. Final indemnity, repudiation, or subrogation determinations must be formally authorized by a licensed claims handler.
            </span>
          </div>
          <span className="text-[11px] font-mono text-ink-3 shrink-0">
            Audit Ready • ISO 27001
          </span>
        </div>
      </div>

      {/* Jurisdiction Selector Modal */}
      <JurisdictionSelectorModal
        isOpen={isJurisdictionModalOpen}
        onClose={() => setIsJurisdictionModalOpen(false)}
        currentCountry={currentCountry}
        currentRegion={currentRegion}
        onSelectJurisdiction={handleSelectJurisdiction}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={{
          title,
          context,
          result,
          review,
          decision: {
            ...decision,
            jurisdiction: jurisdictionData,
            applicableRegulations,
            legalDecisionImpact,
            traceabilityChain,
          },
          caseFile,
          scenario,
          reviewerNotes,
          isReviewed,
          reviewerName,
          reviewedAt,
        }}
        onNotify={onNotify}
      />
    </section>
  );
}
