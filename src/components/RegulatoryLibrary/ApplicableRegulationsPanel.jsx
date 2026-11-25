import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  FileCheck,
  FileSearch,
  Globe,
  Info,
  Layers,
  MapPin,
  RefreshCw,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { LEGAL_ASSESSMENT_STATUSES, REQUIREMENT_TYPES } from '../../../shared/legal-intelligence.js';
import { copyText } from '../../lib/report.js';
import { Button, cx } from '../ui.jsx';

const STATUS_CONFIG = {
  'SATISFIED BY AVAILABLE EVIDENCE': {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
  },
  'POTENTIALLY SATISFIED': {
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    dot: 'bg-cyan-400',
    icon: ShieldCheck,
  },
  'NOT ESTABLISHED': {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
    icon: AlertCircle,
  },
  'POTENTIAL NON-COMPLIANCE IDENTIFIED': {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    dot: 'bg-rose-400',
    icon: ShieldAlert,
  },
  'NOT APPLICABLE': {
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    icon: Compass,
  },
  'REQUIRES FURTHER VERIFICATION': {
    badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    dot: 'bg-indigo-400',
    icon: FileSearch,
  },
};

export default function ApplicableRegulationsPanel({
  jurisdiction,
  applicableRegulations = [],
  legalDecisionImpact = null,
  traceabilityChain = [],
  onOpenJurisdictionSelector,
  onRefreshResearch,
  isResearching = false,
  researchMode = 'live-claude-verified',
  onOpenFullLibrary,
  onNotify,
  reviewerNotes = {},
  onSaveReviewerNote = null,
}) {
  const [expandedRegs, setExpandedRegs] = useState({});
  const [showTraceability, setShowTraceability] = useState(false);
  const [activeEditingNote, setActiveEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  const toggleExpand = (id) => {
    setExpandedRegs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyCitation = async (reg) => {
    const text = `${reg.title} — ${reg.legalReference} (${reg.jurisdiction}). ${reg.summary} Source: ${reg.sourceUrl || 'Official Legislative Registry'}`;
    const ok = await copyText(text);
    onNotify?.(ok ? 'Statutory citation copied to clipboard' : 'Copy failed');
  };

  const handleStartNote = (regId) => {
    setActiveEditingNote(regId);
    setNoteText(reviewerNotes[regId] || '');
  };

  const handleSaveNote = (regId) => {
    onSaveReviewerNote?.(regId, noteText.trim());
    setActiveEditingNote(null);
    onNotify?.('Reviewer note saved to claim file');
  };

  if (!applicableRegulations.length && !jurisdiction) return null;

  const currentCountry = jurisdiction?.countryName || jurisdiction?.countryCode || 'Jurisdiction Not Specified';
  const currentRegion = jurisdiction?.regionName;

  return (
    <div className="rounded-xl border border-rule bg-sheet p-5 shadow-xs space-y-5">
      {/* 1. Header with Jurisdiction and Research Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-rule">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-pen/10 border border-pen/20 flex items-center justify-center text-pen-bright shrink-0 mt-0.5">
            <Scale className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl">{jurisdiction?.flag || '🌐'}</span>
              <h3 className="text-[16px] font-bold text-ink leading-tight">
                Applicable Laws, Regulations &amp; Legal Intelligence
              </h3>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                {jurisdiction?.countryCode || 'UK'} {currentRegion ? `• ${currentRegion}` : ''}
              </span>
              <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-3 border border-rule">
                {jurisdiction?.legalSystem || 'Common Law'}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-3">
              Lead Authority: <strong className="text-ink-2 font-medium">{jurisdiction?.regulator || 'Insurance Regulator'}</strong> • Audit Benchmark: <span className="text-ink-2 font-mono">Q1 2026</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenJurisdictionSelector && (
            <Button variant="secondary" size="sm" onClick={onOpenJurisdictionSelector} title="Change country or regional jurisdiction">
              <MapPin className="size-3.5" />
              Change Jurisdiction
            </Button>
          )}

          {onRefreshResearch && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshResearch}
              disabled={isResearching}
              title="Perform live legal research via Claude Sonnet API"
            >
              {isResearching ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin text-pen" />
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5 text-pen" />
                  <span>Research Laws</span>
                </>
              )}
            </Button>
          )}

          {onOpenFullLibrary && (
            <button
              type="button"
              onClick={() => onOpenFullLibrary(jurisdiction?.countryCode)}
              className="inline-flex items-center gap-1 text-[12.5px] text-pen-bright hover:underline font-medium ml-1"
            >
              <span>Full Library</span>
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Research / Offline Status Notice */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-paper/60 border border-rule/70 text-[12px]">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-ink">
            {researchMode === 'live-claude-verified' ? 'Claude Sonnet Live Legal Intelligence Active' : 'Pre-Indexed Q1 2026 Statutory Database (Verified)'}
          </span>
          <span className="text-ink-3">• Official source cross-referencing enabled</span>
        </div>
        <button
          type="button"
          onClick={() => setShowTraceability((v) => !v)}
          className="text-pen hover:underline font-medium flex items-center gap-1"
        >
          <Layers className="size-3.5" />
          <span>{showTraceability ? 'Hide Traceability Chain' : 'View Traceability Chain'}</span>
        </button>
      </div>

      {/* Traceability Chain View (Regulation -> Requirement -> Evidence -> Assessment -> Decision Relevance) */}
      {showTraceability && traceabilityChain.length > 0 && (
        <div className="rounded-lg border border-pen/20 bg-pen/5 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-pen" />
            <h4 className="text-[13.5px] font-bold text-ink">
              Forensic Traceability: Regulation → Requirement → Evidence → Assessment → Decision Impact
            </h4>
          </div>
          <div className="space-y-2.5">
            {traceabilityChain.map((tc, idx) => (
              <div key={idx} className="rounded-md border border-rule bg-sheet p-3 text-[12.5px] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between font-bold text-ink">
                  <span>{tc.title} ({tc.legalReference})</span>
                  <span className="text-[11px] font-mono text-pen">{tc.assessment}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-ink-3 pt-1 border-t border-rule/60">
                  <div>
                    <strong className="text-ink-2">Rule: </strong>
                    <span className="truncate block">{tc.requirement}</span>
                  </div>
                  <div>
                    <strong className="text-ink-2">Evidence: </strong>
                    <span className="truncate block">{tc.evidence}</span>
                  </div>
                  <div>
                    <strong className="text-pen-bright">Decision Relevance: </strong>
                    <span className="truncate block">{tc.decisionRelevance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Decision-Specific Legal Analysis: "How Applicable Rules Affect This Decision" */}
      {legalDecisionImpact && (
        <div className="rounded-xl border border-rule/80 bg-paper/50 p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-pen" />
            <h4 className="text-[14.5px] font-bold text-ink">
              How Applicable Rules Affect This Decision
            </h4>
          </div>

          <p className="text-[13.5px] leading-relaxed text-ink-2">
            {legalDecisionImpact.affectingParagraph}
          </p>

          {/* Legal Considerations Bullets */}
          {legalDecisionImpact.considerations?.length > 0 && (
            <div className="pt-2 border-t border-rule/70">
              <span className="text-[12px] font-bold uppercase tracking-wider text-ink-3 block mb-2">
                {legalDecisionImpact.decisionCategory === 'APPROVE'
                  ? 'Legal & Regulatory Considerations Supporting Approval'
                  : legalDecisionImpact.decisionCategory === 'REJECT'
                    ? 'Relevant Legal & Regulatory Grounds for Declinature'
                    : 'Legal & Regulatory Issues Requiring Clarification'}
              </span>
              <ul className="grid gap-2 sm:grid-cols-2">
                {legalDecisionImpact.considerations.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded-lg border border-rule bg-sheet p-2.5 text-[12.5px] text-ink leading-relaxed">
                    <span className="size-1.5 rounded-full bg-pen mt-1.5 shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {legalDecisionImpact.actionItems?.length > 0 && (
            <div className="pt-2 border-t border-rule/70">
              <span className="text-[12px] font-bold uppercase tracking-wider text-pen block mb-2">
                Prioritized Statutory Follow-Up Actions
              </span>
              <div className="space-y-1.5">
                {legalDecisionImpact.actionItems.map((act) => (
                  <div key={act.priority} className="flex items-center justify-between rounded-md bg-sheet border border-rule px-3 py-1.5 text-[12.5px]">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-pen/15 text-pen font-bold text-[11px]">
                        {act.priority}
                      </span>
                      <span className="text-ink font-medium">{act.action}</span>
                    </div>
                    <span className="text-[11px] text-ink-3 font-mono">{act.authority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Compact, Expandable Regulation Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-wider text-ink-3">
            Applicable Statutory Provisions ({applicableRegulations.length})
          </span>
          <span className="text-[12px] text-ink-3">Click any card to expand full statutory analysis</span>
        </div>

        <div className="space-y-3">
          {applicableRegulations.map((reg) => {
            const isExpanded = Boolean(expandedRegs[reg.id]);
            const statusConfig = STATUS_CONFIG[reg.assessmentStatus] || STATUS_CONFIG['REQUIRES FURTHER VERIFICATION'];
            const StatusIcon = statusConfig.icon;
            const hasReviewerNote = Boolean(reviewerNotes[reg.id]);
            const isEditingNote = activeEditingNote === reg.id;

            return (
              <div
                key={reg.id}
                className={cx(
                  'rounded-xl border transition-all duration-150 overflow-hidden',
                  isExpanded ? 'border-pen/40 bg-card-elevated shadow-sm' : 'border-rule bg-sheet hover:border-rule-strong',
                )}
              >
                {/* Collapsed Header */}
                <div
                  onClick={() => toggleExpand(reg.id)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 cursor-pointer gap-3 select-none"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-[14.5px] font-bold text-ink">{reg.title}</h5>
                      <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-mono text-pen border border-rule font-medium">
                        {reg.legalReference}
                      </span>
                      <span className="rounded bg-pen/10 px-1.5 py-0.2 text-[10.5px] font-semibold text-pen-bright">
                        {reg.category}
                      </span>
                      {reg.scope && (
                        <span className="rounded bg-slate-500/10 px-1.5 py-0.2 text-[10px] text-ink-3">
                          {reg.scope}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-ink-2 line-clamp-2 leading-relaxed">
                      {reg.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Legal Assessment Status Badge */}
                    <span
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
                        statusConfig.badge,
                      )}
                    >
                      <StatusIcon className="size-3.5" />
                      <span>{reg.assessmentStatus}</span>
                    </span>

                    <button
                      type="button"
                      className="p-1 rounded-md text-ink-3 hover:text-ink transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <ChevronDown
                        className={cx('size-4 transition-transform duration-200', isExpanded && 'rotate-180')}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Analysis */}
                {isExpanded && (
                  <div className="border-t border-rule px-4.5 py-4 bg-paper/30 space-y-4 text-[13px]">
                    {/* Requirement Type Badge */}
                    {reg.requirementType && (
                      <div className="flex items-center gap-2">
                        <span className={cx('rounded px-2 py-0.5 text-[11px] font-semibold border', reg.requirementType.badgeCls)}>
                          {reg.requirementType.label}
                        </span>
                        <span className="text-[11.5px] text-ink-3">{reg.requirementType.description}</span>
                      </div>
                    )}

                    {/* What the Rule Requires */}
                    <div className="space-y-1">
                      <span className="font-bold text-ink block text-[13px]">What the Rule Requires:</span>
                      <p className="text-ink-2 leading-relaxed">{reg.whatRuleRequires}</p>
                    </div>

                    {/* Applicability & Why it Matters */}
                    <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-rule/60">
                      <div>
                        <span className="font-bold text-ink block">Applicability:</span>
                        <p className="text-ink-3 leading-relaxed mt-0.5">{reg.applicability}</p>
                      </div>
                      <div>
                        <span className="font-bold text-pen block">Why It Matters to This Claim:</span>
                        <p className="text-ink-2 leading-relaxed mt-0.5">{reg.whyItMatters}</p>
                      </div>
                    </div>

                    {/* Evidence Available vs Evidence Gap */}
                    <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-rule/60">
                      <div className="rounded-lg bg-sheet p-3 border border-rule space-y-1">
                        <span className="text-[12px] font-bold text-agree-ink flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-agree" />
                          Evidence Available
                        </span>
                        {reg.evidenceAvailable?.length ? (
                          <ul className="list-disc list-inside text-ink text-[12.5px] space-y-0.5">
                            {reg.evidenceAvailable.map((ea, i) => (
                              <li key={i}>{ea}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-ink-3 text-[12px]">No verifying exhibits currently submitted.</p>
                        )}
                      </div>

                      <div className="rounded-lg bg-sheet p-3 border border-rule space-y-1">
                        <span className="text-[12px] font-bold text-minor-ink flex items-center gap-1.5">
                          <AlertCircle className="size-3.5 text-minor" />
                          Evidence Gap / Missing Proof
                        </span>
                        <p className="text-ink-2 text-[12.5px]">{reg.evidenceGap || 'None identified'}</p>
                        <p className="text-[11px] text-ink-3 italic">
                          Safeguard: Missing documents alone do not establish statutory non-compliance.
                        </p>
                      </div>
                    </div>

                    {/* Legal Assessment & Rationale */}
                    <div className="rounded-lg border border-pen/20 bg-pen/5 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">Statutory Compliance Assessment</span>
                        <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold border', statusConfig.badge)}>
                          {reg.assessmentStatus}
                        </span>
                      </div>
                      <p className="text-ink-2 leading-relaxed">{reg.assessmentRationale}</p>
                      {reg.reviewerConsideration && (
                        <div className="pt-2 border-t border-pen/15 text-[12px] text-pen-bright">
                          <strong>Reviewer Consideration: </strong>
                          <span className="text-ink-2 font-normal">{reg.reviewerConsideration}</span>
                        </div>
                      )}
                    </div>

                    {/* Official Source & Verification Metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rule/60 text-[12px]">
                      <div className="flex items-center gap-2 text-ink-3">
                        <span>Authority: <strong className="text-ink-2 font-medium">{reg.authority}</strong></span>
                        <span>•</span>
                        <span>Verified: <span className="font-mono text-ink-2">{reg.lastVerifiedDate}</span></span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {reg.sourceUrl && (
                          <a
                            href={reg.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-pen-bright hover:underline"
                          >
                            <span>Open Official Source</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}

                        <Button variant="secondary" size="xs" onClick={() => handleCopyCitation(reg)}>
                          <Copy className="size-3" />
                          Copy Citation
                        </Button>

                        <Button variant="secondary" size="xs" onClick={() => handleStartNote(reg.id)}>
                          <span>{hasReviewerNote ? 'Edit Reviewer Note' : 'Add Note'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Reviewer Note Display / Editor */}
                    {hasReviewerNote && !isEditingNote && (
                      <div className="rounded-lg border border-rule bg-sheet p-3 text-[12px] space-y-1">
                        <span className="font-bold text-ink">Investigator Legal Note:</span>
                        <p className="text-ink-2">{reviewerNotes[reg.id]}</p>
                      </div>
                    )}

                    {isEditingNote && (
                      <div className="rounded-lg border border-pen/30 bg-sheet p-3 space-y-2">
                        <span className="font-bold text-ink text-[12px]">Add Investigator Legal Note for {reg.legalReference}:</span>
                        <textarea
                          rows={2}
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Record legal interpretation, statutory deadline notes, or instructions for claims handler..."
                          className="w-full rounded-md border border-rule bg-paper p-2 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-pen focus:outline-hidden"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="xs" onClick={() => setActiveEditingNote(null)}>
                            Cancel
                          </Button>
                          <Button size="xs" onClick={() => handleSaveNote(reg.id)}>
                            Save Note
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
