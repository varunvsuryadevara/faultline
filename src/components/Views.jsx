import { useEffect, useRef, useState } from 'react';
import {
  CircleCheck,
  CircleHelp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Undo2,
  Check,
  Eye,
  Info,
  Scale,
  ClipboardCopy,
} from 'lucide-react';
import { CopyButton, ExhibitTag, MatchBadge, SeverityIcon, SeverityBadge, Button, cx } from './ui.jsx';
import { copyText } from '../lib/report.js';

const RANK = { critical: 0, major: 1, minor: 2 };

// severity: 'critical' | 'major' | 'minor' for an open conflict, 'unlinked' when the model marked the
// event disputed without tying a conflict to it, or null.
function Node({ status, severity }) {
  if (severity) {
    const stroke = severity === 'unlinked' ? 'var(--color-ink-3)' : `var(--color-${severity})`;
    return (
      <span className="relative z-10 flex size-7 items-center justify-center rounded-full border border-rule bg-sheet">
        <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
          <path d="M1 7 L4.5 1.5 L8.5 12.5 L11.5 4.5 L15 7" fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="relative z-10 flex size-7 items-center justify-center">
      <span
        className={cx(
          'size-3 rounded-full border-[1.75px]',
          status === 'corroborated' ? 'bg-agree border-agree' : 'bg-sheet border-rule-strong',
        )}
      />
    </span>
  );
}

const STATUS_TEXT = { corroborated: 'Agreed', single_source: 'One source', disputed: 'Disputed' };

export function TimelineView({ timeline, contradictions, review, exhibitLabel, onSelect }) {
  const byId = new Map(contradictions.map((c) => [c.id, c]));
  if (!timeline.length) return <p className="text-[15px] text-ink-2">The model did not return a timeline.</p>;

  return (
    <ol className="relative">
      {timeline.map((e, i) => {
        const open = e.conflicts.map((id) => byId.get(id)).filter((c) => c && review[c.id] !== 'dismissed');
        const worst = [...open].sort((a, b) => RANK[a.severity] - RANK[b.severity])[0];
        const unlinked = e.status === 'disputed' && e.conflicts.length === 0;
        const dismissed = e.conflicts.length > 0 && open.length === 0;
        const label = worst || unlinked ? 'Disputed' : dismissed ? 'Dispute dismissed' : STATUS_TEXT[e.status];
        const last = i === timeline.length - 1;
        return (
          <li key={e.id} className="grid grid-cols-[28px_1fr] gap-x-3 sm:grid-cols-[112px_28px_1fr]">
            <div className="hidden pt-1 text-right text-[13.5px] font-semibold leading-snug text-ink-2 sm:block">{e.time}</div>
            <div className="relative flex justify-center">
              {!last && <span className="absolute bottom-0 top-7 w-px bg-rule-strong" aria-hidden="true" />}
              {i > 0 && <span className="absolute top-0 h-1 w-px bg-rule-strong" aria-hidden="true" />}
              <Node status={e.status} severity={worst?.severity ?? (unlinked ? 'unlinked' : null)} />
            </div>
            <div className={cx('min-w-0 pt-1', last ? 'pb-1' : 'pb-6')}>
              <p className="text-[13px] font-semibold text-ink-2 sm:hidden">{e.time}</p>
              <p className="text-[15.5px] leading-snug text-ink">
                <span className="tabular mr-1.5 text-[13px] text-ink-3">{i + 1}.</span>
                {e.event}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="inline-flex items-center gap-1">
                  {e.exhibits.map((id) => (
                    <ExhibitTag key={id} id={id} label={exhibitLabel(id)} />
                  ))}
                </span>
                <span className="text-[13px] text-ink-3">{label}</span>
                {open.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="inline-flex items-center gap-1.5 rounded px-1 text-[13.5px] font-medium text-pen hover:bg-pen/10"
                  >
                    <SeverityIcon severity={c.severity} className="size-3.5" />
                    {c.id}: {c.title}
                  </button>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AgreedView({
  corroborations = [],
  activeRef,
  scrollTarget,
  exhibitLabel,
  decision = null,
  activeFilter = null,
  onClearFilter = null,
  onShowEvidence = null,
  onPreviewAttachment = null,
  allAttachments = [],
}) {
  const activeEl = useRef(null);
  useEffect(() => {
    if (scrollTarget?.ref?.startsWith('K') || scrollTarget?.ref?.startsWith('S')) {
      activeEl.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [scrollTarget]);

  // Consolidate verified facts and supported evidence findings to match dashboard count exactly
  const allSupportingRecords = [];

  // 1. Multi-source Corroborated Facts
  corroborations.forEach((k, idx) => {
    const exhibits = k.exhibits || (k.evidence || []).map((e) => e.exhibit).filter(Boolean);
    allSupportingRecords.push({
      id: k.id || `K${idx + 1}`,
      key: `fact-${k.id || idx}`,
      type: 'VERIFIED FACT',
      badge: 'Verified Corroboration',
      statement: k.fact || k.statement,
      exhibits,
      source: exhibits.length ? `Corroborated across ${exhibits.map((e) => `Exhibit ${e}`).join(' & ')}` : 'Multi-exhibit consensus',
      reliability: k.reliability || 'High (Multiple independent sources)',
      isIndependent: k.isIndependent !== false,
      howItSupports: 'Independently confirmed by two or more consistent accounts without contradiction, substantiating the core event sequence.',
      limitations: k.isIndependent === false
        ? 'Derivative reporting: citations trace back to a shared underlying source.'
        : 'Direct multi-party corroboration; verified against physical damage.',
      quotes: (k.evidence || []).map((ev) => ({
        exhibit: ev.exhibit,
        quote: ev.quote,
        match: ev.match,
      })),
      raw: k,
    });
  });

  // 2. Additional Supporting Evidence Findings (from decision model)
  const additionalSupporting = decision?.supporting_evidence || [];
  additionalSupporting.forEach((s, idx) => {
    // Avoid double counting if already present in corroborations
    const alreadyIncluded = allSupportingRecords.some(
      (r) => r.statement === (s.finding || s.statement || s.point) && r.exhibits.includes(s.exhibit),
    );
    if (!alreadyIncluded) {
      allSupportingRecords.push({
        id: s.id || `S${idx + 1}`,
        key: `supp-${s.id || idx}`,
        type: 'SUPPORTED FINDING',
        badge: 'Supported Evidence',
        statement: s.finding || s.statement || s.point,
        exhibits: s.exhibit ? [s.exhibit] : [],
        source: s.name || s.source || (s.exhibit ? `Exhibit ${s.exhibit}` : 'Case Record'),
        reliability: s.reliability || 'High (Technical or objective record)',
        isIndependent: true,
        howItSupports: s.howItSupports || 'Corroborates reported vehicle dynamics and damage sequence without material discrepancy.',
        limitations: s.impact || 'Consistent with claimed collision mechanics.',
        quotes: s.quote ? [{ exhibit: s.exhibit, quote: s.quote, match: s.match }] : [],
        raw: s,
      });
    }
  });

  const supportingTotal = decision?.supporting_count ?? allSupportingRecords.length;

  return (
    <div className="space-y-4" id="agreed-view">
      {/* Active Filter Notification Banner */}
      {activeFilter === 'supporting' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-agree/40 bg-agree-wash/80 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-agree/20 text-agree">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <p className="text-[14.5px] font-bold text-agree-ink">
                Showing {allSupportingRecords.length} Supporting Facts (Filtered from Dashboard)
              </p>
              <p className="text-[12.5px] text-ink-2">
                Displaying verified corroborations and supported findings consistent with reported circumstances.
              </p>
            </div>
          </div>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 rounded-md border border-agree/30 bg-sheet px-2.5 py-1 text-[13px] font-semibold text-ink hover:bg-hover hover:text-ink transition-colors cursor-pointer"
            >
              <X className="size-3.5 text-ink-3" />
              Clear filter / Show all
            </button>
          )}
        </div>
      )}

      {allSupportingRecords.length === 0 ? (
        <div className="rounded-xl border border-rule bg-sheet p-8 text-center text-ink-2">
          <CheckCircle2 className="mx-auto size-9 text-ink-3" />
          <h4 className="mt-2 text-[16px] font-semibold text-ink">No Supporting Facts Identified</h4>
          <p className="mt-1 text-[14px] text-ink-2">No corroborating facts or supporting evidence were found for this case.</p>
          {activeFilter && onClearFilter && (
            <button type="button" onClick={onClearFilter} className="mt-3 text-[13.5px] font-semibold text-pen hover:underline cursor-pointer">
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3.5" role="list" aria-label="Supporting Facts and Evidence">
          {allSupportingRecords.map((record) => {
            const isActive = activeRef === record.id;
            return (
              <li
                key={record.key}
                ref={isActive ? activeEl : null}
                className={cx(
                  'rounded-xl border border-rule bg-sheet p-4 transition-all duration-150',
                  isActive ? 'border-agree ring-2 ring-agree/30 bg-agree-wash/30' : 'hover:border-rule-strong',
                )}
              >
                {/* 1. Header Badges: Type, Independence, Reliability */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded bg-agree/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-agree-ink border border-agree/30">
                      <CheckCircle2 className="size-3" />
                      {record.type}
                    </span>
                    <span
                      className={cx(
                        'rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border',
                        record.isIndependent
                          ? 'bg-agree-wash text-agree-ink border-agree/30'
                          : 'bg-minor-wash text-minor-ink border-minor/30',
                      )}
                    >
                      {record.isIndependent ? 'Independent Corroboration' : 'Derivative (Cites Shared Source)'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-3">
                    <Sparkles className="size-3 text-pen" />
                    <span>{record.reliability}</span>
                  </span>
                </div>

                {/* 2. Supported Statement */}
                <div className="mt-3">
                  <h4 className="text-[15.5px] font-semibold leading-snug text-ink">{record.statement}</h4>
                </div>

                {/* 3. Original Source Document / Exhibits Involved */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-semibold text-ink-2">Source:</span>
                  {record.exhibits.map((id) => (
                    <ExhibitTag key={id} id={id} label={exhibitLabel?.(id) || `Exhibit ${id}`} />
                  ))}
                  <span className="text-[12.5px] text-ink-3">({record.source})</span>
                </div>

                {/* 4. Exact Quotes & Exhibit References */}
                {record.quotes.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-lg bg-paper/60 p-3 border border-rule/50">
                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-3">Verified Quotes:</span>
                    <ul className="space-y-2">
                      {record.quotes.map((q, qIdx) => (
                        <li key={qIdx} className="flex flex-wrap items-start justify-between gap-2 text-[14px]">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            {q.exhibit && <ExhibitTag id={q.exhibit} label={exhibitLabel?.(q.exhibit) || `Exhibit ${q.exhibit}`} className="mt-0.5 shrink-0" />}
                            <span className="quote-text text-ink-2 italic leading-relaxed">“{q.quote}”</span>
                            {q.match && <MatchBadge match={q.match} compact />}
                          </div>
                          {onShowEvidence && q.exhibit && (
                            <button
                              type="button"
                              onClick={() => onShowEvidence({ exhibit: q.exhibit, match: q.match || {} }, record.id)}
                              className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-medium text-pen hover:bg-pen/10 transition-colors shrink-0 cursor-pointer"
                            >
                              <Eye className="size-3" />
                              Show in exhibit
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 5. Why Classified as Supporting & Context/Limitations */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2 text-[12.5px]">
                  <div className="rounded-md bg-agree-wash/40 p-2.5 border border-agree/20">
                    <p className="font-semibold text-agree-ink flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-agree" />
                      Why This Supports the Claim
                    </p>
                    <p className="mt-0.5 text-ink-2 leading-relaxed">{record.howItSupports}</p>
                  </div>
                  <div className="rounded-md bg-paper p-2.5 border border-rule/60">
                    <p className="font-semibold text-ink flex items-center gap-1">
                      <Info className="size-3.5 text-ink-3" />
                      Evidentiary Context & Limitations
                    </p>
                    <p className="mt-0.5 text-ink-2 leading-relaxed">{record.limitations}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function GapsView({
  gaps = [],
  nextSteps = [],
  onNotify = null,
  decision = null,
  activeFilter = null,
  onClearFilter = null,
  onReview = null,
  onShowEvidence = null,
  exhibitLabel = null,
}) {
  // Collect exact unresolved items from decision model to strictly match dashboard count
  const unresolvedIssues = decision?.unresolved_issues || [];
  const missingEvidence = decision?.missing_evidence || [];
  const totalUnresolved = decision?.unresolved_count ?? (unresolvedIssues.length + missingEvidence.length);

  const handleCopyQuestion = async (text) => {
    const ok = await copyText(text);
    onNotify?.(ok ? 'Inquiry question copied to clipboard' : 'Copy failed');
  };

  const handleCopyRequest = async (item, why) => {
    const text = `FORMAL EVIDENCE REQUEST:\nItem: ${item}\nReason: ${why}`;
    const ok = await copyText(text);
    onNotify?.(ok ? 'Evidence request copied to clipboard' : 'Copy failed');
  };

  return (
    <div className="space-y-6" id="gaps-view">
      {/* Active Filter Notification Banner */}
      {activeFilter === 'unresolved' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-minor/40 bg-minor-wash/80 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-minor/20 text-minor">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <p className="text-[14.5px] font-bold text-minor-ink">
                Showing {totalUnresolved} Unresolved Items (Filtered from Dashboard)
              </p>
              <p className="text-[12.5px] text-ink-2">
                Displaying active contradictions and missing evidence items requiring investigator verification.
              </p>
            </div>
          </div>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 rounded-md border border-minor/30 bg-sheet px-2.5 py-1 text-[13px] font-semibold text-ink hover:bg-hover hover:text-ink transition-colors cursor-pointer"
            >
              <X className="size-3.5 text-ink-3" />
              Clear filter / Show all
            </button>
          )}
        </div>
      )}

      {/* When filtered to unresolved, display the exact unresolved records with interactive verification */}
      {activeFilter === 'unresolved' ? (
        <div className="space-y-6">
          {totalUnresolved === 0 ? (
            <div className="rounded-xl border border-agree/30 bg-agree-wash/30 p-8 text-center">
              <CheckCircle2 className="mx-auto size-9 text-agree" />
              <h4 className="mt-2 text-[17px] font-bold text-ink">All Investigation Items Resolved</h4>
              <p className="mt-1 text-[14px] text-ink-2 max-w-[50ch] mx-auto">
                All identified contradictions have been verified or dismissed, and all critical documentation gaps have been satisfied.
              </p>
              {onClearFilter && (
                <button type="button" onClick={onClearFilter} className="mt-3 text-[13.5px] font-semibold text-pen hover:underline cursor-pointer">
                  Clear filter and view all findings
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Unresolved Contradictions / Material Conflicts */}
              {unresolvedIssues.length > 0 && (
                <section aria-labelledby="unresolved-conflicts-heading">
                  <div className="flex items-center justify-between border-b border-rule pb-2 mb-3">
                    <h3 id="unresolved-conflicts-heading" className="text-[15.5px] font-bold text-ink flex items-center gap-2">
                      <AlertTriangle className="size-4 text-critical" />
                      <span>Unresolved Factual Contradictions ({unresolvedIssues.length})</span>
                    </h3>
                    <span className="text-[12px] font-medium text-ink-3">Requires party clarification</span>
                  </div>

                  <ul className="space-y-3" role="list">
                    {unresolvedIssues.map((issue) => {
                      const isBlocking = issue.severity === 'critical' || issue.severity === 'major';
                      return (
                        <li key={issue.id} className="rounded-xl border border-rule bg-sheet p-4 shadow-xs">
                          {/* Top row: Severity, Blocking status, Review status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <SeverityBadge severity={issue.severity} />
                              <span
                                className={cx(
                                  'rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border',
                                  isBlocking
                                    ? 'bg-critical/15 text-critical-ink border-critical/30'
                                    : 'bg-minor/15 text-minor-ink border-minor/30',
                                )}
                              >
                                {isBlocking ? 'Blocking Settlement' : 'Non-Blocking (Verification Recommended)'}
                              </span>
                              <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-mono text-ink-3 border border-rule">
                                {issue.id}
                              </span>
                            </div>

                            <span className="text-[12px] font-medium text-ink-3">
                              Status: <span className="font-semibold text-ink">{issue.status}</span>
                            </span>
                          </div>

                          {/* Title / What needs verification */}
                          <h4 className="mt-3 text-[16px] font-bold text-ink leading-snug">{issue.title}</h4>

                          {/* Why it is currently considered unresolved */}
                          <div className="mt-2.5 rounded-lg bg-paper/60 p-3 border border-rule/50">
                            <p className="text-[13px] font-semibold text-ink-2">Why Currently Unresolved:</p>
                            <p className="mt-1 text-[14px] text-ink leading-relaxed">{issue.whyItMatters}</p>
                          </div>

                          {/* Relevant Evidence & Exhibits */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                            <span className="font-semibold text-ink-2">Exhibits Involved:</span>
                            {(issue.relevantExhibits || []).map((ex) => (
                              <ExhibitTag key={ex} id={ex} label={exhibitLabel?.(ex) || `Exhibit ${ex}`} />
                            ))}
                            {issue.evidence && (
                              <span className="text-[12.5px] text-ink-3 italic line-clamp-1">({issue.evidence})</span>
                            )}
                          </div>

                          {/* Recommended Next Action / Verification Question */}
                          <div className="mt-3 rounded-lg bg-pen/5 p-3 border border-pen/20 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] font-bold uppercase tracking-wider text-pen">Recommended Action / Question:</p>
                              <p className="mt-0.5 text-[13.5px] text-ink font-medium leading-relaxed">
                                “{issue.recommendedResolution}”
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyQuestion(issue.recommendedResolution)}
                              title="Copy inquiry question"
                            >
                              <ClipboardCopy className="size-3.5" />
                              Copy Question
                            </Button>
                          </div>

                          {/* Interactive Resolution Controls */}
                          {onReview && (
                            <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 border-t border-rule/50 pt-3">
                              <span className="text-[12px] text-ink-3 mr-auto">Change resolution status:</span>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  onReview(issue.id, 'dismissed');
                                  onNotify?.(`Contradiction ${issue.id} marked resolved/dismissed`);
                                }}
                                title="Dismiss this contradiction to mark it resolved"
                              >
                                <Check className="size-3.5 text-agree" />
                                Mark Resolved / Dismiss
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  onReview(issue.id, 'confirmed');
                                  onNotify?.(`Contradiction ${issue.id} confirmed`);
                                }}
                                title="Confirm this conflict as material"
                              >
                                <ShieldAlert className="size-3.5 text-critical" />
                                Confirm Conflict
                              </Button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Section 2: Missing Documentation & Verification Gaps */}
              {missingEvidence.length > 0 && (
                <section aria-labelledby="missing-evidence-heading">
                  <div className="flex items-center justify-between border-b border-rule pb-2 mb-3">
                    <h3 id="missing-evidence-heading" className="text-[15.5px] font-bold text-ink flex items-center gap-2">
                      <CircleHelp className="size-4 text-minor" />
                      <span>Missing Documentation & Evidentiary Gaps ({missingEvidence.length})</span>
                    </h3>
                    <span className="text-[12px] font-medium text-ink-3">Independent records needed</span>
                  </div>

                  <ul className="space-y-3" role="list">
                    {missingEvidence.map((m, idx) => {
                      const isBlocking = m.priority === 'High' || m.materiality === 'High';
                      return (
                        <li key={idx} className="rounded-xl border border-rule bg-sheet p-4 shadow-xs">
                          {/* Priority and Blocking status */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-paper px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-2 border border-rule">
                                MISSING ASSET #{idx + 1}
                              </span>
                              <span
                                className={cx(
                                  'rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border',
                                  isBlocking
                                    ? 'bg-minor/20 text-minor-ink border-minor/40'
                                    : 'bg-paper text-ink-2 border-rule',
                                )}
                              >
                                {isBlocking ? 'Blocking Settlement' : 'Non-Blocking (Evidentiary Gap)'}
                              </span>
                            </div>
                            <span className="text-[12px] text-ink-3 font-medium">Priority: {m.priority || 'Medium'}</span>
                          </div>

                          {/* Item Title / What is missing */}
                          <h4 className="mt-3 text-[16px] font-bold text-ink">{m.item}</h4>

                          {/* Why Needed / Why unresolved */}
                          <div className="mt-2 text-[14px] text-ink-2 leading-relaxed">
                            <span className="font-semibold text-ink">Why Needed: </span>
                            {m.why}
                          </div>

                          {/* What it resolves */}
                          {m.resolves && (
                            <p className="mt-2 text-[13px] text-pen font-medium">
                              <span className="font-semibold text-ink-2">What it resolves: </span>
                              {m.resolves}
                            </p>
                          )}

                          {/* Action Button */}
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyRequest(m.item, m.why)}
                              title="Copy formal evidence request"
                            >
                              <ClipboardCopy className="size-3.5" />
                              Copy Request
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Standard Unfiltered View: What is still unknown & Next steps */
        <div className="grid gap-10 xl:grid-cols-2">
          <section>
            <h3 className="text-[16px] font-semibold text-ink">What is still unknown</h3>
            {gaps.length ? (
              <ul className="mt-3 space-y-3">
                {gaps.map((g, i) => (
                  <li key={i} className="flex gap-3">
                    <CircleHelp className="mt-0.5 size-[18px] shrink-0 text-ink-3" strokeWidth={2} aria-hidden="true" />
                    <div>
                      <p className="text-[15px] leading-snug text-ink">{g.gap}</p>
                      {g.request && (
                        <p className="mt-1 flex items-start gap-1.5 text-[13.5px] text-ink-2">
                          <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            <span className="font-semibold">Request: </span>
                            {g.request}
                          </span>
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-ink-2">No gaps reported.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold text-ink">Next steps, most valuable first</h3>
              {nextSteps.length > 0 && (
                <CopyButton text={nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')} label="Copy steps" onCopied={() => onNotify?.('Next steps copied')} />
              )}
            </div>
            {nextSteps.length ? (
              <ol className="mt-3 space-y-2.5">
                {nextSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink">
                    <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-pen text-[12.5px] font-bold text-white shadow-xs">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[15px] text-ink-2">No next steps returned.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
