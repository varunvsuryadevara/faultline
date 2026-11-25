import { useState, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  History,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { detectLegalChanges } from '../../../shared/regulations/query.js';
import { COUNTRY_METADATA } from '../../../shared/regulations/vocab.js';

export default function LegalChangeModal({ onClose, onOpenCountry }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [selectedChange, setSelectedChange] = useState(null);
  const [localApprovals, setLocalApprovals] = useState({});

  const allChanges = useMemo(() => {
    return detectLegalChanges();
  }, []);

  const filteredChanges = useMemo(() => {
    return allChanges.filter((chg) => {
      const currentStatus = localApprovals[chg.id] || chg.status;
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;
      if (countryFilter !== 'ALL' && chg.country !== countryFilter) return false;
      return true;
    });
  }, [allChanges, statusFilter, countryFilter, localApprovals]);

  const activeItem = selectedChange || filteredChanges[0] || allChanges[0];
  const activeStatus = localApprovals[activeItem?.id] || activeItem?.status || 'PUBLISHED';

  const handleUpdateStatus = (id, newStatus) => {
    setLocalApprovals((prev) => ({
      ...prev,
      [id]: newStatus,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-rule bg-sheet shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-rule bg-card-elevated/40">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pen/10 px-2.5 py-0.5 text-[11px] font-semibold text-pen-bright border border-pen/20">
                <History className="size-3.5" />
                Continuous Legal Intelligence &amp; Change Detection
              </span>
              <span className="text-[12px] text-ink-3">Workflow State: Monitored</span>
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-ink leading-snug">
              Motor Law Statutory Amendments &amp; Regulatory Change Log
            </h2>
            <div className="text-[12.5px] text-ink-3 mt-0.5">
              Automated detection of statutory amendments, whiplash tariff revisions, and court decisions affecting claims.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-3 hover:text-ink hover:bg-hover transition-colors self-start sm:self-auto"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-rule bg-sheet flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-3 uppercase font-bold text-[11px]">Workflow:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-rule bg-paper text-ink"
              >
                <option value="ALL">All States ({allChanges.length})</option>
                <option value="PUBLISHED">Published In-Force</option>
                <option value="APPROVED">Approved by Legal</option>
                <option value="PENDING_REVIEW">Pending Review</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-ink-3 uppercase font-bold text-[11px]">Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-rule bg-paper text-ink"
              >
                <option value="ALL">All Jurisdictions</option>
                {Array.from(new Set(allChanges.map((c) => c.country))).map((cc) => (
                  <option key={cc} value={cc}>
                    {COUNTRY_METADATA[cc]?.name || cc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[12px] text-ink-3">
            Showing <strong className="text-ink">{filteredChanges.length}</strong> statutory updates
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left List */}
          <div className="w-full md:w-80 border-r border-rule overflow-y-auto divide-y divide-rule/60 bg-paper">
            {filteredChanges.map((item) => {
              const meta = COUNTRY_METADATA[item.country] || { flag: '🌐', name: item.country };
              const isSelected = activeItem?.id === item.id;
              const status = localApprovals[item.id] || item.status;

              const statusBadge =
                status === 'PUBLISHED'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : status === 'APPROVED'
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedChange(item)}
                  className={`w-full text-left p-3.5 transition-colors block ${
                    isSelected ? 'bg-pen/10 border-l-3 border-l-pen' : 'hover:bg-hover'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[11px] font-semibold text-ink-2 flex items-center gap-1">
                      <span>{meta.flag}</span>
                      <span>{meta.name}</span>
                    </span>
                    <span className={`rounded px-1.5 py-0.2 text-[9.5px] font-bold border ${statusBadge}`}>
                      {status}
                    </span>
                  </div>

                  <div className="text-[13px] font-bold text-ink leading-snug line-clamp-2">
                    {item.title}
                  </div>

                  <div className="text-[11px] font-mono text-pen-bright mt-1 truncate">
                    {item.statute}
                  </div>

                  <div className="text-[10.5px] text-ink-3 mt-1 flex items-center justify-between">
                    <span>Effective: {item.effectiveDate}</span>
                    <span>{item.changeType}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Detail Panel */}
          {activeItem ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-sheet">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xl">{COUNTRY_METADATA[activeItem.country]?.flag}</span>
                  <span className="text-[13px] font-semibold text-ink-2">
                    {COUNTRY_METADATA[activeItem.country]?.name} {activeItem.region ? `(${activeItem.region})` : ''}
                  </span>
                  <span className="text-ink-3">•</span>
                  <span className="rounded bg-paper border border-rule px-2 py-0.5 text-[11px] font-mono text-pen-bright">
                    {activeItem.statute}
                  </span>
                  <span className="rounded bg-paper border border-rule px-2 py-0.5 text-[11px] font-semibold text-ink-3">
                    {activeItem.changeType}
                  </span>
                </div>

                <h3 className="text-[19px] sm:text-[21px] font-bold text-ink leading-snug">
                  {activeItem.title}
                </h3>
              </div>

              {/* Side-by-Side Before vs After Comparison */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-rule bg-card-elevated/40 p-4 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <History className="size-3.5" />
                    Previous Statutory Requirement
                  </div>
                  <p className="text-[13px] text-ink-2 leading-relaxed">{activeItem.previousRule}</p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    Amended / In-Force Statutory Rule
                  </div>
                  <p className="text-[13px] text-ink leading-relaxed font-medium">{activeItem.newRule}</p>
                </div>
              </div>

              {/* Concrete Claims Impact */}
              <div className="rounded-xl border border-pen/30 bg-pen/5 p-4 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-pen-bright flex items-center gap-1.5">
                  <Scale className="size-3.5" />
                  Claims Adjudication &amp; Investigation Impact
                </div>
                <p className="text-[13.5px] text-ink leading-relaxed">{activeItem.claimsImpact}</p>
              </div>

              {/* Approval & Source Metadata */}
              <div className="rounded-xl border border-rule bg-paper p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-[12px] text-ink-3 space-y-1">
                  <div>
                    <span className="font-semibold text-ink-2">Enactment Date:</span> {activeItem.effectiveDate}
                  </div>
                  {activeItem.sourceUrl && (
                    <div>
                      <a
                        href={activeItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pen-bright hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>Official Legislative Gazette Reference</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Workflow Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeItem.id, 'APPROVED')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      activeStatus === 'APPROVED'
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-rule bg-sheet text-ink hover:border-blue-500'
                    }`}
                  >
                    <Check className="size-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeItem.id, 'PUBLISHED')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      activeStatus === 'PUBLISHED'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-rule bg-sheet text-ink hover:border-emerald-500'
                    }`}
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Publish</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-ink-3">
              Select an amendment from the list to view statutory diff and claims impact.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-rule bg-card-elevated/40 flex items-center justify-between">
          <div className="text-[12px] text-ink-3">
            Continuous Legal Ingestion • FaultLine Statutory Monitoring Engine
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-pen px-4 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
