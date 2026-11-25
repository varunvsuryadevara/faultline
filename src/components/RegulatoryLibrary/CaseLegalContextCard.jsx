import { useState, useMemo } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  Scale,
  Shield,
  Sparkles,
} from 'lucide-react';
import { getRelevantRegulationsForCase } from '../../../shared/regulations/query.js';
import { COUNTRY_METADATA } from '../../../shared/regulations/vocab.js';
import RegulationDetailModal from './RegulationDetailModal.jsx';

export default function CaseLegalContextCard({
  caseFile,
  scenario,
  onAttachLegalToReport,
  isAttached = true,
  onOpenFullLibrary,
}) {
  const [selectedReg, setSelectedReg] = useState(null);
  const [attached, setAttached] = useState(isAttached);

  // Extract case parameters
  const countryCode = scenario?.country || caseFile?.country || 'UK';
  const category = scenario?.category || caseFile?.category || '';
  const claimType = scenario?.claimType || caseFile?.claimType || '';
  const title = scenario?.title || caseFile?.title || '';
  const context = scenario?.case?.context || caseFile?.context || '';
  const tags = scenario?.tags || caseFile?.tags || [];

  const countryMeta = COUNTRY_METADATA[countryCode] || { flag: '🇬🇧', name: 'United Kingdom' };

  // Match relevant statutory provisions
  const relevantMatches = useMemo(() => {
    return getRelevantRegulationsForCase({
      country: countryCode,
      category,
      claimType,
      tags,
      context,
      title,
    });
  }, [countryCode, category, claimType, tags, context, title]);

  const handleToggleAttach = (val) => {
    setAttached(val);
    onAttachLegalToReport?.(val, relevantMatches.map((m) => m.regulation));
  };

  if (relevantMatches.length === 0) return null;

  return (
    <div className="rounded-xl border border-rule bg-sheet p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-rule">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-pen/10 border border-pen/20 flex items-center justify-center text-pen-bright">
            <Scale className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">{countryMeta.flag}</span>
              <h3 className="text-[14.5px] font-bold text-ink leading-tight">
                Applicable Statutory &amp; Regulatory Context
              </h3>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-400">
                {countryCode} Legal Framework
              </span>
            </div>
            <p className="text-[12px] text-ink-3">
              Matched automatically to this incident&apos;s collision dynamics, claim category, and evidence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-[12px] text-ink-2 select-none">
            <input
              type="checkbox"
              checked={attached}
              onChange={(e) => handleToggleAttach(e.target.checked)}
              className="rounded border-rule text-pen focus:ring-pen size-3.5"
            />
            <span>Include in Exported Reports</span>
          </label>

          <button
            type="button"
            onClick={() => onOpenFullLibrary?.(countryCode)}
            className="inline-flex items-center gap-1 text-[12px] text-pen-bright hover:underline font-medium"
          >
            <span>Full Library</span>
            <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Recommended Regulations Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {relevantMatches.map(({ regulation: reg, reason }) => (
          <div
            key={reg.id}
            className="flex flex-col justify-between rounded-lg border border-rule bg-paper p-3 hover:border-rule-strong hover:bg-card-elevated transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-[10.5px] font-mono text-pen-bright font-bold">
                  {reg.legalReference}
                </span>
                <span className="rounded bg-sheet border border-rule px-1.5 py-0.2 text-[9.5px] font-medium text-ink-3">
                  {reg.status === 'VERIFIED' ? 'Verified' : 'Statute'}
                </span>
              </div>

              <h4 className="text-[13px] font-bold text-ink leading-snug mb-1">
                {reg.title}
              </h4>

              <p className="text-[11.5px] text-ink-3 line-clamp-2 mb-2">
                {reg.summary}
              </p>

              <div className="rounded bg-sheet/80 p-2 border border-rule/60 text-[11px] text-ink-2">
                <span className="font-semibold text-pen-bright">Application: </span>
                <span>{reason}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rule/50 flex items-center justify-between">
              <span className="text-[10px] text-ink-3 truncate max-w-[150px]">{reg.authority}</span>
              <button
                type="button"
                onClick={() => setSelectedReg(reg)}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-pen-bright hover:underline"
              >
                <span>Read Section</span>
                <ExternalLink className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedReg && (
        <RegulationDetailModal
          regulation={selectedReg}
          onClose={() => setSelectedReg(null)}
        />
      )}
    </div>
  );
}
