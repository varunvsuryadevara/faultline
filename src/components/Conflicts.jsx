import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Lightbulb, MessageCircleQuestion, Undo2, X, FileText, Eye } from 'lucide-react';
import { CATEGORY_LABEL, plural } from '../lib/format.js';
import { parseEvidenceCitation } from '../../shared/evidence-combine.js';
import { CopyButton, ExhibitTag, MatchBadge, SeverityBadge, cx } from './ui.jsx';

function EvidenceQuote({ evidence, exhibitLabel, onShow, onPreviewAttachment, allAttachments }) {
  const { match } = evidence;
  const citation = useMemo(() => parseEvidenceCitation(evidence.quote), [evidence.quote]);

  const matchedAttachment = useMemo(() => {
    if (!citation || !allAttachments?.length) return null;
    return (
      allAttachments.find(
        (a) =>
          a.name.toLowerCase() === citation.filename.toLowerCase() ||
          a.name.toLowerCase().includes(citation.filename.toLowerCase()),
      ) || null
    );
  }, [citation, allAttachments]);

  return (
    <figure className={cx('rounded-[7px] border px-3.5 py-3', match.status === 'missing' ? 'border-critical/30 bg-critical-wash/40' : 'border-rule bg-paper/70')}>
      <figcaption className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
        <ExhibitTag id={evidence.exhibit} label={exhibitLabel} />
        <span className="min-w-0 max-w-[26ch] truncate font-medium text-ink-2 sm:max-w-[36ch]">{exhibitLabel}</span>
        <MatchBadge match={match} />
        {match.citedAs && <span className="text-[12px] text-ink-3">(model cited exhibit {match.citedAs})</span>}

        {/* Traceable Evidence Attachment Pill */}
        {citation && (
          <button
            type="button"
            onClick={() =>
              onPreviewAttachment?.(
                matchedAttachment || { id: 'temp', name: citation.filename, type: 'document', summary: 'Citing document' },
                evidence.exhibit,
                exhibitLabel,
                citation.page,
                citation.sheet,
                citation.cell,
              )
            }
            className="inline-flex items-center gap-1 rounded bg-pen-wash hover:bg-hover border border-pen/30 px-2 py-0.5 text-[11.5px] font-medium text-pen-dark dark:text-cyan-300 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 dark:border-cyan-800/50 dark:hover:text-white transition-colors"
            title="Preview cited evidence document"
          >
            <FileText className="size-3 text-cyan-400" />
            <span className="truncate max-w-[120px]">{citation.filename}</span>
            {citation.page && <span className="text-slate-400 font-mono">(p. {citation.page})</span>}
            {citation.sheet && <span className="text-slate-400 font-mono">({citation.sheet}{citation.cell ? `: ${citation.cell}` : ''})</span>}
            {citation.timestamp && <span className="text-slate-400 font-mono">({citation.timestamp})</span>}
            <Eye className="size-3 ml-0.5 text-cyan-400" />
          </button>
        )}

        {match.status !== 'missing' && (
          <button type="button" onClick={onShow} className="ml-auto rounded px-1.5 py-0.5 text-[13px] font-medium text-pen hover:bg-pen/10">
            Show in exhibit
          </button>
        )}
      </figcaption>
      <blockquote className="quote-text mt-1.5 text-ink">“{evidence.quote}”</blockquote>
    </figure>
  );
}

function ConflictRow({
  conflict: c,
  open,
  onToggle,
  active,
  scrollNonce,
  review,
  onReview,
  exhibitLabel,
  onShowEvidence,
  onNotify,
  onPreviewAttachment,
  allAttachments,
}) {
  const ref = useRef(null);
  const state = review[c.id];
  const exhibits = [...new Set(c.evidence.map((ev) => ev.exhibit))];

  // Selected from elsewhere (a highlight, the fault line, the timeline): once it has expanded,
  // bring it to the top of the panel.
  const scrolledFor = useRef(null);
  useEffect(() => {
    if (scrollNonce && open && scrolledFor.current !== scrollNonce && ref.current) {
      scrolledFor.current = scrollNonce;
      ref.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [scrollNonce, open]);

  return (
    <li ref={ref} id={`conflict-${c.id}`} className={cx('scroll-mt-3 border-b border-rule', active && 'bg-pen-wash/40')}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-1 py-4 text-left">
        <SeverityBadge severity={c.severity} className="mt-0.5" />
        <span className={cx('min-w-0 flex-1', state === 'dismissed' && 'opacity-55')}>
          <span className="flex items-baseline gap-2">
            <span className="tabular text-[13px] font-semibold text-ink-3">{c.id}</span>
            <span className={cx('text-[16.5px] font-semibold leading-snug text-ink', state === 'dismissed' && 'line-through decoration-ink-3')}>
              {c.title}
            </span>
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
            <span>{CATEGORY_LABEL[c.category]}</span>
            <span className="inline-flex items-center gap-1">
              {exhibits.map((id) => (
                <ExhibitTag key={id} id={id} label={exhibitLabel(id)} />
              ))}
            </span>
            <span className="tabular">{Math.round(c.confidence * 100)}% confidence</span>
            {state === 'confirmed' && (
              <span className="inline-flex items-center gap-1 font-semibold text-agree-ink">
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                Confirmed
              </span>
            )}
            {state === 'dismissed' && <span className="font-semibold text-ink-2">Dismissed</span>}
          </span>
        </span>
        <ChevronDown className={cx('mt-1 size-5 shrink-0 text-ink-3 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div className="animate-enter pb-6 pl-1 pr-1 sm:pl-[92px]">
          <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{c.explanation}</p>

          <div className="mt-4 space-y-2.5">
            {c.evidence.map((ev, i) => (
              <EvidenceQuote
                key={i}
                evidence={ev}
                exhibitLabel={exhibitLabel(ev.exhibit)}
                onShow={() => onShowEvidence(ev, c.id)}
                onPreviewAttachment={onPreviewAttachment}
                allAttachments={allAttachments}
              />
            ))}
          </div>

          {c.innocentExplanation && (
            <div className="mt-4 flex gap-2.5 text-[14.5px] leading-relaxed">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-minor" strokeWidth={2.2} aria-hidden="true" />
              <p className="text-ink-2">
                <span className="font-semibold text-ink">Possible innocent explanation. </span>
                {c.innocentExplanation}
              </p>
            </div>
          )}

          {c.alternativeInnocentExplanations?.length > 0 && (
            <div className="mt-4 rounded-[7px] border border-minor/30 bg-minor-wash/50 p-3 text-[13.5px]">
              <div className="flex items-center gap-1.5 font-semibold text-minor-ink mb-1.5">
                <Lightbulb className="size-4 text-minor" />
                <span>Plausible Innocent Explanations (Bad-Faith Safeguard):</span>
              </div>
              <ul className="space-y-1 text-ink-2 list-disc list-inside">
                {c.alternativeInnocentExplanations.map((exp, idx) => (
                  <li key={idx} className="leading-snug">
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.followUp.question && (
            <div className="mt-4 rounded-[7px] border border-pen/20 bg-pen-wash px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-pen-dark">
                  <MessageCircleQuestion className="size-4" aria-hidden="true" />
                  Ask {c.followUp.ask || 'next'}
                </span>
                <CopyButton text={c.followUp.question} onCopied={() => onNotify('Question copied')} />
              </div>
              <p className="mt-1 text-[15px] leading-relaxed text-ink">{c.followUp.question}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {state ? (
              <button
                type="button"
                onClick={() => onReview(c.id, null)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule-strong bg-sheet px-2.5 text-[13.5px] font-semibold text-ink-2 hover:bg-paper"
              >
                <Undo2 className="size-3.5" aria-hidden="true" />
                {state === 'dismissed' ? 'Restore finding' : 'Undo confirmation'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onReview(c.id, 'confirmed')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rule bg-card-elevated px-2.5 text-[13.5px] font-semibold text-ink hover:border-agree hover:text-agree-ink hover:bg-hover"
                >
                  <Check className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
                  Confirm finding
                </button>
                <button
                  type="button"
                  onClick={() => onReview(c.id, 'dismissed')}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13.5px] font-semibold text-ink-2 hover:bg-hover hover:text-ink"
                >
                  <X className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
                  Dismiss as not a conflict
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export default function ConflictList({
  contradictions,
  activeRef,
  scrollTarget,
  review,
  onReview,
  exhibitLabel,
  onShowEvidence,
  onNotify,
  onPreviewAttachment,
  allAttachments,
}) {
  const [openIds, setOpenIds] = useState(() => new Set(contradictions[0] ? [contradictions[0].id] : []));

  // Opening a conflict from elsewhere (a highlight, the fault line) expands it here.
  useEffect(() => {
    const ref = scrollTarget?.ref ?? activeRef;
    if (ref?.startsWith('C')) setOpenIds((s) => (s.has(ref) ? s : new Set([...s, ref])));
  }, [activeRef, scrollTarget]);

  if (!contradictions.length) {
    return (
      <div className="rounded-[7px] border border-agree/30 bg-agree-wash px-5 py-6">
        <p className="text-[16px] font-semibold text-agree-ink">No contradictions found</p>
        <p className="mt-1 text-[14.5px] text-ink-2">The exhibits are consistent with each other. Check the timeline and gaps before you rely on them.</p>
      </div>
    );
  }

  const allOpen = openIds.size === contradictions.length;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-[13.5px] text-ink-3">{plural(contradictions.length, 'conflict')}, most severe first.</p>
        <button
          type="button"
          onClick={() => setOpenIds(allOpen ? new Set() : new Set(contradictions.map((c) => c.id)))}
          className="rounded px-1.5 py-0.5 text-[13.5px] font-medium text-pen hover:bg-pen/10"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <ul className="border-t border-rule">
        {contradictions.map((c) => (
          <ConflictRow
            key={c.id}
            conflict={c}
            open={openIds.has(c.id)}
            onToggle={() =>
              setOpenIds((s) => {
                const next = new Set(s);
                if (next.has(c.id)) next.delete(c.id);
                else next.add(c.id);
                return next;
              })
            }
            active={activeRef === c.id}
            scrollNonce={scrollTarget?.ref === c.id ? scrollTarget.nonce : null}
            review={review}
            onReview={onReview}
            exhibitLabel={exhibitLabel}
            onShowEvidence={onShowEvidence}
            onNotify={onNotify}
            onPreviewAttachment={onPreviewAttachment}
            allAttachments={allAttachments}
          />
        ))}
      </ul>
    </div>
  );
}
