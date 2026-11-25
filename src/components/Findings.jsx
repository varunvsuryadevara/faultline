import { useState } from 'react';
import { CircleCheck, Download, Info, MessageCircleQuestion, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { consistencyScore, SEVERITY_WEIGHT } from '../lib/score.js';
import { buildReport, copyText, downloadText, questionsText, slug } from '../lib/report.js';
import { isArtifact } from '../lib/transport.js';
import { formatDuration, plural, prettyModel } from '../lib/format.js';
import { computeClaimDecision } from '../../shared/decision.js';
import FinalDecisionCard from './FinalDecisionCard.jsx';
import ExportReportModal from './ExportReportModal.jsx';
import CaseLegalContextCard from './RegulatoryLibrary/CaseLegalContextCard.jsx';
import HypothesisWorkspace from './HypothesisWorkspace.jsx';
import ConflictList from './Conflicts.jsx';
import FaultStrip from './FaultStrip.jsx';
import { AgreedView, GapsView, TimelineView } from './Views.jsx';
import { Button, SeverityIcon, cx } from './ui.jsx';

const VERDICT_STYLE = {
  agree: { icon: CircleCheck, cls: 'text-agree' },
  minor: { level: 'minor' },
  major: { level: 'major' },
  critical: { level: 'critical' },
};

function Verdict({ level, verdict }) {
  const style = VERDICT_STYLE[level];
  return (
    <span className="inline-flex items-center gap-2 text-[17px] font-semibold text-ink">
      {style.icon ? <style.icon className={cx('size-5', style.cls)} strokeWidth={2.4} aria-hidden="true" /> : <SeverityIcon severity={style.level} className="size-5" />}
      {verdict}
    </span>
  );
}

function ScoreExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded px-1 text-[13px] font-medium text-ink-3 hover:bg-ink/5 hover:text-ink"
      >
        <Info className="size-3.5" aria-hidden="true" />
        How it’s scored
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[300px] rounded-[7px] border border-rule bg-sheet p-3.5 text-[13.5px] leading-relaxed text-ink-2 shadow-[0_8px_24px_rgb(20_33_61/0.14)]">
          Starts at 100. Each open conflict subtracts its severity weight (critical {SEVERITY_WEIGHT.critical}, major {SEVERITY_WEIGHT.major},
          minor {SEVERITY_WEIGHT.minor}) multiplied by the model’s confidence, counted as at least 30%. Dismissing a conflict removes it from
          the score.
        </div>
      )}
    </div>
  );
}

function Stat({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-sheet px-2.5 text-[13.5px] font-medium text-ink hover:border-rule-strong"
    >
      {children}
    </button>
  );
}

const TABS = [
  { id: 'conflicts', label: 'Conflicts' },
  { id: 'hypotheses', label: 'Hypotheses' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'agreed', label: 'Agreed facts' },
  { id: 'gaps', label: 'Gaps and next steps' },
];

export default function Findings({
  result,
  title,
  context,
  review,
  onReview,
  tab,
  onTab,
  activeRef,
  scrollTarget,
  onSelect,
  onShowEvidence,
  onRerun,
  stale,
  onNotify,
  onPreviewAttachment,
  allAttachments,
  onOpenCountryLibrary,
  activeFilter = null,
  onClearFilter = null,
  onNavigateMetric = null,
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { score, level, verdict } = consistencyScore(result.contradictions, review);
  const open = result.contradictions.filter((c) => review[c.id] !== 'dismissed');
  const count = (sev) => open.filter((c) => c.severity === sev).length;
  const exhibitLabel = (id) => result.meta.exhibits.find((e) => e.id === id)?.label ?? '';
  const qc = result.quoteCheck;
  const questions = questionsText(result, review);

  const decision = computeClaimDecision({
    analysis: result,
    review,
    caseFile: { title: title || 'Untitled Case', context, exhibits: result.meta?.exhibits || [] },
  });

  const counts = {
    conflicts: open.length,
    hypotheses: 3,
    timeline: result.timeline.length,
    agreed: decision.supporting_count ?? result.corroborations.length,
    gaps: decision.unresolved_count ?? (result.gaps.length + result.nextSteps.length),
  };

  const handleNavigateMetric = (metric) => {
    if (metric === 'supporting') {
      onTab('agreed');
      onNavigateMetric?.('supporting');
    } else if (metric === 'unresolved') {
      onTab('gaps');
      onNavigateMetric?.('unresolved');
    } else if (metric === 'conflicts') {
      onTab('conflicts');
      onNavigateMetric?.('conflicts');
    }
    setTimeout(() => {
      const el = document.getElementById('findings-tabs');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Final Claim Decision & Recommendation Engine */}
      <FinalDecisionCard
        decision={decision}
        title={title}
        context={context}
        result={result}
        review={review}
        caseFile={{ title, context, exhibits: result.meta?.exhibits || [] }}
        onRerun={onRerun}
        stale={stale}
        onNotify={onNotify}
        onSelectExhibit={onShowEvidence}
        onOpenFullLibrary={onOpenCountryLibrary}
        onNavigateMetric={handleNavigateMetric}
      />

      {/* Applicable Statutory & Regulatory Context */}
      <CaseLegalContextCard
        caseFile={{ title, context, exhibits: result.meta?.exhibits || [] }}
        onOpenFullLibrary={onOpenCountryLibrary}
      />

      {stale && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-minor/50 bg-minor-wash px-4 py-3">
          <p className="text-[14.5px] text-minor-ink">You’ve changed the exhibits since this analysis. Run it again to update the findings.</p>
          <Button size="sm" onClick={onRerun}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Run again
          </Button>
        </div>
      )}

      <div className="grid gap-x-8 gap-y-5 md:grid-cols-[auto_1fr]">
        <div className="md:border-r md:border-rule md:pr-8">
          <p className="text-[13.5px] font-medium text-ink-2">Consistency</p>
          <p className="mt-0.5 flex items-baseline gap-1">
            <span className="tabular text-[64px] font-bold leading-none tracking-[-0.03em] [font-stretch:90%]">{score}</span>
            <span className="tabular text-[17px] font-semibold text-ink-3">/100</span>
          </p>
          <div className="mt-2.5">
            <Verdict level={level} verdict={verdict} />
          </div>
          <div className="mt-1.5">
            <ScoreExplainer />
          </div>
        </div>

        <div className="min-w-0">
          <h2 id="analysis-heading" className="sr-only">
            Findings
          </h2>
          <p className="max-w-[70ch] text-[16px] leading-relaxed text-ink">{result.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['critical', 'major', 'minor'].map((sev) =>
              count(sev) ? (
                <Stat key={sev} onClick={() => handleNavigateMetric('conflicts')}>
                  <SeverityIcon severity={sev} className="size-4" />
                  <span className="tabular">{count(sev)}</span> {sev}
                </Stat>
              ) : null,
            )}
            <Stat onClick={() => handleNavigateMetric('supporting')}>
              <CircleCheck className="size-4 text-agree" strokeWidth={2.4} aria-hidden="true" />
              <span className="tabular">{counts.agreed}</span> agreed
            </Stat>
            <Stat onClick={() => handleNavigateMetric('unresolved')}>
              <MessageCircleQuestion className="size-4 text-ink-2" aria-hidden="true" />
              <span className="tabular">{counts.gaps}</span> to verify
            </Stat>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
            <span className={cx('inline-flex items-center gap-1.5 font-medium', qc.missing ? 'text-minor-ink' : 'text-agree-ink')}>
              {qc.missing ? <ShieldAlert className="size-4" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
              {qc.exact} of {plural(qc.total, 'quote')} found word for word
              {qc.close ? `, ${qc.close} close` : ''}
              {qc.missing ? `, ${qc.missing} not found` : ''}
            </span>
            <span className="text-ink-3">
              {prettyModel(result.meta.model)} in {formatDuration(result.meta.ms)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!questions}
          onClick={async () => onNotify((await copyText(questions)) ? 'Questions copied, grouped by who to ask' : 'Copy failed')}
        >
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
          Copy questions
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsExportOpen(true)}
          title="Export forensic investigation report"
        >
          <Download className="size-4" aria-hidden="true" />
          Export report
        </Button>
        <Button variant="ghost" size="sm" onClick={onRerun}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Run again
        </Button>
      </div>

      <FaultStrip timeline={result.timeline} contradictions={result.contradictions} review={review} activeRef={activeRef} onSelect={onSelect} />

      <div id="findings-tabs" role="tablist" aria-label="Findings" className="mt-8 flex gap-1 overflow-x-auto border-b border-rule scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => onTab(t.id)}
            className={cx(
              '-mb-px inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[15px] font-semibold transition-colors',
              tab === t.id ? 'border-pen text-pen-bright' : 'border-transparent text-ink-3 hover:text-ink',
            )}
          >
            {t.label}
            <span
              className={cx(
                'tabular rounded-full px-1.5 text-[12px] transition-colors',
                tab === t.id
                  ? 'bg-pen text-white'
                  : (t.id === 'agreed' && activeFilter === 'supporting')
                    ? 'bg-agree/20 text-agree-ink border border-agree/40 font-bold'
                    : (t.id === 'gaps' && activeFilter === 'unresolved')
                      ? 'bg-minor/20 text-minor-ink border border-minor/40 font-bold'
                      : 'bg-hover text-ink-2 border border-rule/50',
              )}
            >
              {counts[t.id]}
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-5">
        {tab === 'conflicts' && (
          <ConflictList
            key={result.meta.generatedAt}
            contradictions={result.contradictions}
            activeRef={activeRef}
            scrollTarget={scrollTarget}
            review={review}
            onReview={onReview}
            exhibitLabel={exhibitLabel}
            onShowEvidence={onShowEvidence}
            onNotify={onNotify}
            onPreviewAttachment={onPreviewAttachment}
            allAttachments={allAttachments}
          />
        )}
        {tab === 'hypotheses' && (
          <HypothesisWorkspace
            exhibits={result.meta?.exhibits || []}
            caseId={result.meta?.caseId || title}
            title={title}
            jurisdiction={context?.country || 'UK'}
            onNotify={onNotify}
          />
        )}
        {tab === 'timeline' && (
          <TimelineView timeline={result.timeline} contradictions={result.contradictions} review={review} exhibitLabel={exhibitLabel} onSelect={onSelect} />
        )}
        {tab === 'agreed' && (
          <AgreedView
            corroborations={result.corroborations}
            activeRef={activeRef}
            scrollTarget={scrollTarget}
            exhibitLabel={exhibitLabel}
            decision={decision}
            activeFilter={activeFilter}
            onClearFilter={onClearFilter}
            onShowEvidence={onShowEvidence}
            onPreviewAttachment={onPreviewAttachment}
            allAttachments={allAttachments}
          />
        )}
        {tab === 'gaps' && (
          <GapsView
            gaps={result.gaps}
            nextSteps={result.nextSteps}
            onNotify={onNotify}
            decision={decision}
            activeFilter={activeFilter}
            onClearFilter={onClearFilter}
            onReview={onReview}
            onShowEvidence={onShowEvidence}
            exhibitLabel={exhibitLabel}
          />
        )}
      </div>

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={{
          title,
          context,
          result,
          review,
          decision,
          caseFile: { title, context, exhibits: result.meta?.exhibits || [] },
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
