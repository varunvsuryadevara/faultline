import { useState } from 'react';
import { ArrowRight, CheckCircle2, GitCommit, Network, ShieldAlert, Sparkles } from 'lucide-react';
import { EXHIBIT_IDS } from '../../shared/constants.js';

export default function EvidenceConnections({ exhibits = [], contradictions = [] }) {
  const [selectedExhibit, setSelectedExhibit] = useState(null);

  if (exhibits.length < 2) return null;

  return (
    <div className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-pen/10 text-pen">
          <Network className="size-4" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-ink">Evidence Relationship Matrix</h3>
          <p className="text-[12px] text-ink-3">Correlations, corroborations, and contradiction links across exhibits</p>
        </div>
      </div>

      {/* Cross-connection chips */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {exhibits.map((e, i) => {
          const id = EXHIBIT_IDS[i] || `X${i + 1}`;
          const isSelected = selectedExhibit === id;

          return (
            <div
              key={id}
              tabIndex={0}
              role="button"
              onClick={() => setSelectedExhibit(isSelected ? null : id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedExhibit(isSelected ? null : id);
                }
              }}
              className={`rounded-[8px] border p-3 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-2xs active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen ${
                isSelected
                  ? 'border-pen bg-pen-wash/50 shadow-xs ring-1 ring-pen'
                  : 'border-rule bg-card-elevated hover:border-pen/60 hover:bg-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-6 items-center justify-center rounded bg-manila border border-rule font-bold text-manila-ink text-[11px]">
                  {id}
                </span>
                <span className="text-[11px] font-medium text-ink-3 truncate max-w-[120px]">
                  {e.kind || 'Document'}
                </span>
              </div>
              <h5 className="mt-2 text-[13.5px] font-semibold text-ink truncate">
                {e.label || `Exhibit ${id}`}
              </h5>
              <p className="mt-1 text-[12px] text-ink-2 line-clamp-2 leading-snug">
                {e.person ? `Party: ${e.person}` : e.text?.slice(0, 80) + '…'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Selected exhibit connection details */}
      {selectedExhibit && (
        <div className="mt-4 rounded-[8px] border border-pen/30 bg-pen-wash/20 p-4 animate-fade-in flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-[13px] font-bold text-pen">
              Cross-Examination Focus: Exhibit {selectedExhibit}
            </h4>
            <p className="mt-1 text-[12.5px] text-ink-2 max-w-[65ch]">
              This exhibit's statements are compared by the AI against all other exhibits in the case to verify temporal consistency, vehicle positioning, and verbatim truthfulness.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(`exhibit-${selectedExhibit}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-pen');
                setTimeout(() => el.classList.remove('ring-2', 'ring-pen'), 1500);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-pen px-3 py-1.5 text-[12.5px] font-bold text-white shadow-xs hover:bg-pen-dark active:scale-95 transition-all"
          >
            Scroll to Exhibit {selectedExhibit} <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
