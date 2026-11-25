import { useEffect, useMemo, useRef } from 'react';
import { Highlighter, Pencil, Plus, ScanSearch, Square, X } from 'lucide-react';
import { EXHIBIT_IDS, EXHIBIT_KINDS, LIMITS } from '../../shared/constants.js';
import { useAutoGrow } from '../lib/hooks.js';
import { segmentText } from '../lib/segments.js';
import { plural, wordCount } from '../lib/format.js';
import { Button, IconButton, Kbd, cx } from './ui.jsx';
import EvidenceUploader from './EvidenceUploader.jsx';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function AnnotatedText({ text, marks, activeRef, onSelect, focus }) {
  const segments = useMemo(() => segmentText(text, marks), [text, marks]);
  const rootRef = useRef(null);

  // "Show in exhibit": scroll the quoted passage into view and pulse it.
  useEffect(() => {
    if (!focus || !rootRef.current) return;
    const nodes = [...rootRef.current.querySelectorAll('mark[data-start]')];
    const target = nodes.find((n) => {
      const s = Number(n.dataset.start);
      return s >= focus.start && s < focus.end;
    });
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const hits = nodes.filter((n) => {
      const s = Number(n.dataset.start);
      return s >= focus.start && s < focus.end;
    });
    hits.forEach((n) => {
      n.classList.remove('mark-flash');
      void n.offsetWidth; // restart the animation if it is already running
      n.classList.add('mark-flash');
    });
    const t = setTimeout(() => hits.forEach((n) => n.classList.remove('mark-flash')), 1700);
    return () => clearTimeout(t);
  }, [focus]);

  return (
    <p ref={rootRef} className="exhibit-text">
      {segments.map((seg, i) => {
        if (!seg.marks.length) return <span key={i}>{seg.text}</span>;
        const top = seg.marks[0];
        const active = seg.marks.some((m) => m.ref === activeRef);
        const tip = seg.marks.map((m) => `${m.ref}: ${m.title}`).join('\n');
        return (
          <mark
            key={i}
            data-start={seg.start}
            role="button"
            tabIndex={0}
            title={tip}
            aria-label={`${seg.text}. ${tip}`}
            onClick={() => onSelect(top.ref)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(top.ref);
              }
            }}
            className={cx('mark bg-transparent text-inherit', `mark-${top.tone}`, active && 'mark-active')}
          >
            {seg.text}
          </mark>
        );
      })}
    </p>
  );
}

function ExhibitSheet({
  id,
  exhibit,
  onChange,
  onRemove,
  canRemove,
  marks,
  annotated,
  onEdit,
  onShowHighlights,
  activeRef,
  onSelectRef,
  focus,
  onPreviewAttachment,
  running,
}) {
  const textRef = useAutoGrow(exhibit.text);
  const words = wordCount(exhibit.text);
  const over = (exhibit.text || '').length > LIMITS.maxChars;
  const conflictCount = new Set(marks.filter((m) => m.tone !== 'agree').map((m) => m.ref)).size;
  const attachments = exhibit.attachments || [];

  return (
    <article className="relative pt-[25px]" aria-label={`Exhibit ${id}`}>
      <span className="absolute left-0 top-0 h-[26px] rounded-t-[6px] bg-manila px-2.5 pt-[4px] text-[12.5px] font-bold text-manila-ink">
        Exhibit {id}
      </span>
      <div className="rounded-[7px] rounded-tl-none border border-rule bg-sheet">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-rule py-1.5 pl-3 pr-1.5">
          <input
            value={exhibit.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Who or what is this? For example, claimant statement"
            maxLength={LIMITS.maxLabelChars}
            aria-label={`Exhibit ${id} name`}
            className="min-w-[min(100%,15rem)] flex-1 rounded bg-transparent py-1 text-[14.5px] font-semibold outline-none placeholder:font-normal placeholder:text-ink-3"
          />
          <select
            value={exhibit.kind}
            onChange={(e) => onChange({ kind: e.target.value })}
            aria-label={`Exhibit ${id} type`}
            className="h-8 shrink-0 rounded-md border border-rule bg-paper px-2 text-[13px] text-ink-2 outline-none hover:border-rule-strong"
          >
            {EXHIBIT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          {canRemove && (
            <IconButton label={`Remove exhibit ${id}`} onClick={onRemove}>
              <X className="size-4" />
            </IconButton>
          )}
        </div>

        {annotated ? (
          <div className="px-4 pb-3 pt-3">
            <AnnotatedText text={annotated} marks={marks} activeRef={activeRef} onSelect={onSelectRef} focus={focus} />

            {/* Attached files summary when viewing annotated results */}
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule/60 pt-2.5">
                <span className="text-[12px] font-medium text-ink-3">Attachments:</span>
                {attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => onPreviewAttachment?.(att, id, exhibit.label)}
                    className="inline-flex items-center gap-1.5 rounded bg-paper border border-rule px-2 py-1 text-[12px] font-medium text-ink-2 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
                  >
                    <span className="truncate max-w-[140px]">{att.name}</span>
                    <span className="text-[10px] text-ink-3">({att.summary || 'Ready'})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
              <span className="inline-flex items-center gap-1.5">
                <Highlighter className="size-3.5" aria-hidden="true" />
                {conflictCount ? `Cited in ${plural(conflictCount, 'conflict')}` : 'No conflicts cite this exhibit'}
              </span>
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-pen hover:bg-pen/10">
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit text & files
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-3.5 pt-3">
            <textarea
              ref={textRef}
              value={exhibit.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={4}
              spellCheck={false}
              aria-label={`Exhibit ${id} text`}
              placeholder="Paste the statement, report or log here…"
              className="exhibit-text block w-full resize-none bg-transparent outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-3"
            />
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[12.5px] text-ink-3">
              <span className={cx('tabular', over && 'font-semibold text-critical-ink')}>
                {over
                  ? `${exhibit.text.length.toLocaleString()} / ${LIMITS.maxChars.toLocaleString()} characters`
                  : plural(words, 'word')}
              </span>
              {onShowHighlights && (
                <button type="button" onClick={onShowHighlights} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-pen hover:bg-pen/10">
                  <Highlighter className="size-3.5" aria-hidden="true" />
                  Show highlights
                </button>
              )}
            </div>

            {/* Evidence Uploader Section */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rule/80" />
              </div>
              <span className="relative bg-sheet px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                or attach evidence files
              </span>
            </div>

            <EvidenceUploader
              exhibitId={id}
              attachments={attachments}
              onAddAttachments={(newAtts) => {
                onChange({ attachments: [...attachments, ...newAtts] });
              }}
              onRemoveAttachment={(attId) => {
                onChange({ attachments: attachments.filter((a) => a.id !== attId) });
              }}
              onReplaceAttachment={(attId, replacement) => {
                onChange({
                  attachments: attachments.map((a) => (a.id === attId ? replacement : a)),
                });
              }}
              onPreviewAttachment={(att) => onPreviewAttachment?.(att, id, exhibit.label)}
              disabled={running}
            />
          </div>
        )}
      </div>
    </article>
  );
}

export default function CaseFile({
  caseFile,
  onChange,
  views,
  activeRef,
  onSelectRef,
  focus,
  onEditExhibit,
  onShowHighlights,
  running,
  problem,
  stale,
  onRun,
  onCancel,
  onPreviewAttachment,
}) {
  const { exhibits } = caseFile;
  const contextRef = useAutoGrow(caseFile.context, 200);
  const setExhibit = (index, patch) =>
    onChange({ ...caseFile, exhibits: exhibits.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
  const removeExhibit = (index) => onChange({ ...caseFile, exhibits: exhibits.filter((_, i) => i !== index) });
  const addExhibit = () =>
    onChange({
      ...caseFile,
      exhibits: [
        ...exhibits,
        {
          key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          label: '',
          kind: 'statement',
          text: '',
          attachments: [],
        },
      ],
    });

  return (
    <section aria-labelledby="case-file-heading" className="flex min-h-full flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="case-file-heading" className="text-[18px] font-semibold">
          Case file
        </h2>
        <span className="text-[13.5px] text-ink-3">
          {exhibits.length} of {LIMITS.maxExhibits} exhibits
        </span>
      </div>

      <label className="mt-4 block">
        <span className="text-[13.5px] font-medium text-ink-2">
          Case context <span className="font-normal text-ink-3">(optional)</span>
        </span>
        <textarea
          ref={contextRef}
          value={caseFile.context}
          onChange={(e) => onChange({ ...caseFile, context: e.target.value })}
          rows={2}
          maxLength={LIMITS.maxContextChars}
          placeholder="What happened, and what decision depends on it?"
          className="mt-1.5 block w-full resize-y rounded-[7px] border border-rule bg-sheet px-3 py-2 text-[14.5px] leading-snug text-ink outline-none placeholder:text-ink-3 focus-visible:border-pen"
        />
      </label>

      <ol className="mt-7 space-y-6">
        {exhibits.map((exhibit, i) => {
          const id = EXHIBIT_IDS[i];
          const view = views[exhibit.key] ?? {};
          return (
            <li key={exhibit.key}>
              <ExhibitSheet
                id={id}
                exhibit={exhibit}
                onChange={(patch) => setExhibit(i, patch)}
                onRemove={() => removeExhibit(i)}
                canRemove={exhibits.length > LIMITS.minExhibits && !running}
                marks={view.marks ?? []}
                annotated={view.annotated ?? null}
                onEdit={() => onEditExhibit(exhibit.key)}
                onShowHighlights={view.canShowHighlights ? () => onShowHighlights(exhibit.key) : null}
                activeRef={activeRef}
                onSelectRef={onSelectRef}
                focus={focus?.exhibitId === id ? focus : null}
                onPreviewAttachment={onPreviewAttachment}
                running={running}
              />
            </li>
          );
        })}
      </ol>

      {exhibits.length < LIMITS.maxExhibits && (
        <button
          type="button"
          onClick={addExhibit}
          disabled={running}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[7px] border border-dashed border-rule-strong text-[14.5px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:bg-sheet hover:text-ink disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add exhibit {EXHIBIT_IDS[exhibits.length]}
        </button>
      )}

      <div className="min-h-8 flex-1" aria-hidden="true" />
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-rule bg-paper/95 px-4 py-3.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {running ? (
            <Button variant="secondary" onClick={onCancel}>
              <Square className="size-3.5 fill-current" aria-hidden="true" />
              Stop analysis
            </Button>
          ) : (
            <Button onClick={onRun} disabled={Boolean(problem)}>
              <ScanSearch className="size-[18px]" aria-hidden="true" />
              Cross-examine {exhibits.length} exhibits
            </Button>
          )}
          <span className={cx('text-[13.5px]', problem ? 'text-ink-2' : 'text-ink-3')}>
            {running ? (
              'Reading the exhibits together.'
            ) : problem ? (
              problem
            ) : stale ? (
              'Exhibits changed since the last analysis.'
            ) : (
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                or press <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>Enter</Kbd>
              </span>
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
