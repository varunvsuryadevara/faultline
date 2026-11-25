import { useMemo, useState } from 'react';
import { useElementWidth } from '../lib/hooks.js';
import { SeverityBadge } from './ui.jsx';

// The case as a seismograph: the trace stays calm where the exhibits agree and spikes at
// every disputed event, taller for more severe conflicts. Click a spike to open its conflict.
// 'unlinked' = the model marked the event disputed without tying a conflict to it.
const AMPLITUDE = { critical: 27, major: 19, minor: 12, unlinked: 10 };
const RANK = { critical: 0, major: 1, minor: 2 };
const colourOf = (severity) => (severity === 'unlinked' ? 'var(--color-ink-3)' : `var(--color-${severity})`);
const HEIGHT = 92;
const BASE = 50;
const PAD = 22;

export default function FaultStrip({ timeline, contradictions, review, activeRef, onSelect }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  const conflictById = useMemo(() => new Map(contradictions.map((c) => [c.id, c])), [contradictions]);

  const points = useMemo(() => {
    const n = timeline.length;
    return timeline.map((event, i) => {
      const open = event.conflicts.map((id) => conflictById.get(id)).filter((c) => c && review[c.id] !== 'dismissed');
      const worst = open.sort((a, b) => RANK[a.severity] - RANK[b.severity])[0];
      const unlinked = event.status === 'disputed' && event.conflicts.length === 0;
      const x = n === 1 ? width / 2 : PAD + (i * (width - PAD * 2)) / (n - 1);
      return { event, x, severity: worst?.severity ?? (unlinked ? 'unlinked' : null), conflicts: open };
    });
  }, [timeline, conflictById, review, width]);

  const path = useMemo(() => {
    if (!width) return '';
    let d = `M 0 ${BASE}`;
    for (const p of points) {
      if (p.severity) {
        const a = AMPLITUDE[p.severity];
        d += ` L ${p.x - 10} ${BASE} L ${p.x - 5} ${BASE - a} L ${p.x} ${BASE + a * 0.72} L ${p.x + 4.5} ${BASE - a * 0.42} L ${p.x + 9} ${BASE}`;
      } else if (p.event.status === 'single_source') {
        d += ` L ${p.x - 5} ${BASE} L ${p.x} ${BASE - 3} L ${p.x + 5} ${BASE}`;
      } else {
        d += ` L ${p.x} ${BASE}`;
      }
    }
    return `${d} L ${width} ${BASE}`;
  }, [points, width]);

  if (!timeline.length) return null;
  const disputed = points.filter((p) => p.severity).length;
  const hovered = hover !== null ? points[hover] : null;
  // With many events, number every second (or third…) one so the labels never collide.
  const spacing = timeline.length > 1 ? (width - PAD * 2) / (timeline.length - 1) : width;
  const labelEvery = spacing > 0 && spacing < 18 ? Math.ceil(18 / spacing) : 1;

  return (
    <figure className="mt-7">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[15px] font-semibold">Fault line</span>
        <span className="text-[13px] text-ink-3">
          {timeline.length} events, earliest to latest. {disputed ? `${disputed} disputed.` : 'None disputed.'}
        </span>
      </figcaption>
      <div ref={ref} className="relative mt-2">
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            className="block overflow-visible"
            role="img"
            aria-label={`Timeline of ${timeline.length} events; ${disputed} are disputed.`}
          >
            <line x1="0" x2={width} y1={BASE} y2={BASE} stroke="var(--color-rule)" strokeWidth="1" />
            <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => {
              const active = p.conflicts.some((c) => c.id === activeRef);
              const target = p.conflicts[0]?.id;
              return (
                <g
                  key={p.event.id}
                  role={target ? 'button' : undefined}
                  tabIndex={target ? 0 : undefined}
                  aria-label={target ? `${p.event.time}: ${p.event.event}. Open ${target}.` : undefined}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  onClick={() => target && onSelect(target)}
                  onKeyDown={(e) => {
                    if (target && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelect(target);
                    }
                  }}
                  className={target ? 'cursor-pointer outline-none' : undefined}
                >
                  <rect x={p.x - 16} y={6} width={32} height={HEIGHT - 6} fill="transparent" />
                  {p.severity ? (
                    <circle
                      cx={p.x - 5}
                      cy={BASE - AMPLITUDE[p.severity]}
                      r={active || hover === i ? 5.5 : 4.5}
                      fill={colourOf(p.severity)}
                      stroke={active ? 'var(--color-pen-bright)' : 'var(--color-card-elevated)'}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  ) : (
                    <circle
                      cx={p.x}
                      cy={BASE}
                      r={3.4}
                      fill={p.event.status === 'corroborated' ? 'var(--color-agree)' : 'var(--color-sheet)'}
                      stroke="var(--color-ink-3)"
                      strokeWidth="1.5"
                    />
                  )}
                  {(i % labelEvery === 0 || i === points.length - 1) && (
                    <text x={p.x} y={HEIGHT - 2} textAnchor="middle" className="tabular fill-ink-3 text-[11px]">
                      {i + 1}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute bottom-[calc(100%+6px)] z-20 w-64 rounded-[7px] border border-rule bg-card-elevated p-3 text-left shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            style={{ left: Math.min(Math.max(hovered.x - 128, 0), Math.max(width - 256, 0)) }}
          >
            <p className="tabular text-[12.5px] font-semibold text-ink-2">
              {hover + 1}. {hovered.event.time || 'Time unknown'}
            </p>
            <p className="mt-1 text-[13.5px] leading-snug text-ink">{hovered.event.event}</p>
            {hovered.severity === 'unlinked' && (
              <p className="mt-2 text-[12.5px] text-ink-3">Marked disputed, with no conflict linked to it.</p>
            )}
            {hovered.conflicts.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {hovered.conflicts.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[12.5px] leading-snug text-ink-2">
                    <SeverityBadge severity={c.severity} className="scale-90" />
                    <span className="pt-0.5">{c.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-3" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10"><circle cx="5" cy="5" r="3.4" fill="var(--color-agree)" /></svg>Agreed by two or more
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10"><circle cx="5" cy="5" r="3.2" fill="var(--color-sheet)" stroke="var(--color-ink-3)" strokeWidth="1.5" /></svg>One source
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="16" height="12"><path d="M1 8 L5 2 L9 11 L12 6 L15 8" fill="none" stroke="var(--color-critical)" strokeWidth="1.6" /></svg>
          Disputed (taller is more severe)
        </span>
      </div>
    </figure>
  );
}
