import { useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, Info, ShieldAlert, Video } from 'lucide-react';
import { EXHIBIT_IDS } from '../../shared/constants.js';

export default function InvestigationTimeline({
  exhibits = [],
  findings = [],
  onSelectExhibit,
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Generate plausible forensic timeline steps from the exhibits and findings
  const events = [];

  exhibits.forEach((e, idx) => {
    const id = EXHIBIT_IDS[idx] || `X${idx + 1}`;
    let type = 'statement';
    let icon = FileText;
    let badge = 'Document';

    if (e.kind?.includes('cctv') || e.kind?.includes('dashcam')) {
      type = 'footage';
      icon = Video;
      badge = 'A/V Record';
    } else if (e.kind?.includes('notification') || e.label?.toLowerCase().includes('notice') || e.label?.toLowerCase().includes('notification')) {
      type = 'notification';
      icon = Clock;
      badge = 'FNOL Notice';
    } else if (e.kind?.includes('inspection') || e.kind?.includes('garage') || e.label?.toLowerCase().includes('job card') || e.label?.toLowerCase().includes('repair')) {
      type = 'inspection';
      icon = CheckCircle2;
      badge = 'Physical Evidence';
    }

    events.push({
      id,
      index: idx,
      title: e.label || `Exhibit ${id}`,
      time: e.dateTime || (idx === 0 ? 'Day of Incident' : `Sequence Step ${idx + 1}`),
      person: e.person,
      kind: badge,
      snippet: e.text ? e.text.slice(0, 110) + (e.text.length > 110 ? '…' : '') : '',
      icon,
    });
  });

  return (
    <div className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-pen/15 text-pen-bright">
            <Calendar className="size-4" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-ink">Forensic Investigation Timeline</h3>
            <p className="text-[12px] text-ink-3">Chronological sequence reconstructed from exhibits and records</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-[13px] font-medium text-ink-3 hover:text-ink"
        >
          {collapsed ? 'Show' : 'Collapse'}
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-5 relative border-l-2 border-rule ml-3.5 pl-6 space-y-6">
          {events.map((ev, i) => {
            const Icon = ev.icon;
            return (
              <div key={ev.id || i} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-[31px] top-1 flex size-6 items-center justify-center rounded-full border-2 border-sheet bg-pen text-white text-[11px] font-bold shadow-xs">
                  {ev.id}
                </div>

                <div
                  onClick={() => onSelectExhibit?.(ev.index)}
                  className="rounded-[8px] border border-rule/80 bg-paper p-3.5 transition-all hover:border-pen hover:bg-sheet cursor-pointer group-hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11.5px] font-semibold text-pen">{ev.time}</span>
                    <span className="rounded bg-sheet border border-rule px-1.5 py-0.5 text-[11px] font-medium text-ink-3">
                      {ev.kind}
                    </span>
                  </div>
                  <h4 className="mt-1 text-[14px] font-bold text-ink group-hover:text-pen">
                    Exhibit {ev.id}: {ev.title}
                  </h4>
                  {ev.person && (
                    <p className="text-[12px] font-medium text-ink-2 mt-0.5">Party: {ev.person}</p>
                  )}
                  <p className="mt-1.5 text-[13px] text-ink-2 italic line-clamp-2 bg-sheet/60 p-2 rounded border border-rule/50">
                    "{ev.snippet}"
                  </p>
                  <span className="mt-2 inline-block text-[11.5px] font-semibold text-pen">
                    Jump to exhibit details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
