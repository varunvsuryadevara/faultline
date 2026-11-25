import { Brain, Check, LoaderCircle, Square } from 'lucide-react';
import { STAGES } from '../../shared/constants.js';
import { useNow } from '../lib/hooks.js';
import { formatClock, plural } from '../lib/format.js';
import { Button, SeverityBadge, cx } from './ui.jsx';

// A seismograph trace that keeps moving while the model works. Each conflict found so far
// adds a tremor to the trace, so the drawing reflects real progress.
function Seismograph({ conflicts }) {
  const tremor = Math.min(conflicts, 6);
  const tile = (offset) => {
    const pts = [];
    for (let x = 0; x <= 160; x += 8) {
      const spike = tremor > 0 && x % 40 === 16 && (x / 40) % 4 < tremor;
      const y = spike ? (x % 80 === 16 ? 8 : 40) : 24 + Math.sin((x + offset) / 9) * 2.2;
      pts.push(`${x + offset},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return (
    <div className="relative mt-5 h-12 overflow-hidden rounded-[7px] border border-rule bg-paper" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-[calc(100%+160px)] animate-trace">
        <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 2080 48">
          {Array.from({ length: 13 }, (_, i) => (
            <polyline key={i} points={tile(i * 160)} fill="none" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinejoin="round" />
          ))}
        </svg>
      </div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-paper to-transparent" />
    </div>
  );
}

function stageDetail(i, progress) {
  if (i === 1 && progress.events) return plural(progress.events, 'event');
  if (i === 2 && progress.conflicts.length) return `${plural(progress.conflicts.length, 'conflict')} so far`;
  if (i === 3 && progress.agreed) return plural(progress.agreed, 'agreed fact');
  return '';
}

export default function LiveLog({ exhibitCount, progress, startedAt, onCancel }) {
  const now = useNow(true, 500);
  const stage = progress?.stage ?? 0;

  return (
    <div className="relative">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="analysis-heading" className="text-[22px] font-semibold tracking-[-0.01em]">
          Cross-examining {exhibitCount} exhibits
        </h2>
        <span className="tabular text-[15px] text-ink-3" aria-label="Elapsed time">
          {formatClock(now - startedAt)}
        </span>
      </div>
      <p className="mt-1 text-[14.5px] text-ink-2">The model reads every exhibit together and writes its findings as it goes.</p>

      <Seismograph conflicts={progress?.conflicts.length ?? 0} />

      <ol className="mt-6 space-y-1" aria-live="polite">
        {STAGES.map((label, i) => {
          const state = i < stage ? 'done' : i === stage ? 'active' : 'todo';
          const detail = stageDetail(i, progress);
          return (
            <li key={label}>
              <div className="flex items-center gap-3 py-1.5">
                <span
                  className={cx(
                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                    state === 'done' && 'bg-pen text-white',
                    state === 'active' && 'bg-pen-wash text-pen-bright border border-pen/30',
                    state === 'todo' && 'border border-rule text-transparent',
                  )}
                >
                  {state === 'done' && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
                  {state === 'active' && <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.6} aria-hidden="true" />}
                </span>
                <span className={cx('text-[15.5px]', state === 'todo' ? 'text-ink-3' : 'font-medium text-ink')}>{label}</span>
                {detail && <span className="tabular text-[14px] text-ink-3">{detail}</span>}
              </div>

              {i === 2 && progress?.conflicts.length > 0 && (
                <ul className="mb-2 ml-9 mt-1 space-y-1.5 border-l border-rule pl-4">
                  {progress.conflicts.map((c) => (
                    <li key={c.id} className="flex animate-enter items-center gap-2.5">
                      <SeverityBadge severity={c.severity} />
                      <span className="text-[14.5px] text-ink">{c.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/* The model thinks before it writes; once its findings start streaming, the stages take over. */}
      {progress?.reasoning && stage === 0 && (
        <p className="mt-5 flex items-start gap-2.5 rounded-[7px] bg-paper px-3.5 py-2.5 text-[14px] text-ink-2">
          <Brain className="mt-0.5 size-4 shrink-0 text-pen" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Now: </span>
            <span key={progress.reasoning} className="inline-block animate-enter">
              {progress.reasoning}
            </span>
          </span>
        </p>
      )}

      <div className="mt-7">
        <Button variant="secondary" onClick={onCancel}>
          <Square className="size-3.5 fill-current" aria-hidden="true" />
          Stop analysis
        </Button>
      </div>
    </div>
  );
}
