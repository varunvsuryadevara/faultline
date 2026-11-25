import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Printer,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { runJurisdictionLegalAudit } from '../../../shared/regulations/query.js';
import { MASTER_LEGAL_CATEGORIES } from '../../../shared/regulations/vocab.js';

export default function JurisdictionAuditModal({ countryCode = 'UK', onClose, onSelectCategory }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const audit = useMemo(() => {
    return runJurisdictionLegalAudit(countryCode);
  }, [countryCode]);

  const filteredGaps = useMemo(() => {
    if (filterSeverity === 'ALL') return audit.identifiedGaps;
    return audit.identifiedGaps.filter((g) => g.severity === filterSeverity);
  }, [audit, filterSeverity]);

  const scoreColor =
    audit.coverageScore >= 80
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : audit.coverageScore >= 60
      ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
      : 'text-amber-400 border-amber-500/30 bg-amber-500/10';

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
                <ShieldCheck className="size-3.5" />
                Jurisdiction Legal Audit &amp; Gap Analysis
              </span>
              <span className="text-[12px] text-ink-3">{audit.auditPeriod}</span>
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-ink leading-snug flex items-center gap-2">
              <span>{audit.flag}</span>
              <span>{audit.countryName} ({audit.countryCode}) Legal Health Assessment</span>
            </h2>
            <div className="text-[12.5px] text-ink-3 mt-0.5">
              Regulator: <span className="font-semibold text-ink-2">{audit.regulator}</span> • Legal System: <span className="font-semibold text-ink-2">{audit.legalSystem}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
            >
              <Printer className="size-3.5" />
              <span>Print Audit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Score & Summary Banner */}
          <div className="grid gap-4 sm:grid-cols-4">
            {/* Overall Score */}
            <div className={`rounded-xl border p-4 flex flex-col justify-between ${scoreColor}`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">Legal Coverage Index</div>
              <div className="text-4xl font-extrabold my-2 tabular">{audit.coverageScore}%</div>
              <div className="text-[11.5px] font-medium">
                {audit.coverageScore >= 80 ? 'Comprehensive Statutory Framework' : audit.coverageScore >= 60 ? 'Substantial Regulatory Index' : 'Active Gap Ingestion Underway'}
              </div>
            </div>

            {/* Total Provisions */}
            <div className="rounded-xl border border-rule bg-card-elevated/40 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Indexed Provisions</div>
              <div className="text-3xl font-extrabold text-ink my-2 tabular">{audit.totalRegulations}</div>
              <div className="text-[11.5px] text-ink-3">{audit.totalDocuments} primary source documents</div>
            </div>

            {/* Identified Research Gaps */}
            <div className="rounded-xl border border-rule bg-card-elevated/40 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Identified Research Gaps</div>
              <div className="text-3xl font-extrabold text-amber-400 my-2 tabular">{audit.identifiedGaps.length}</div>
              <div className="text-[11.5px] text-ink-3">
                {audit.identifiedGaps.filter((g) => g.severity === 'HIGH').length} High priority inquiries
              </div>
            </div>

            {/* Change Detections */}
            <div className="rounded-xl border border-rule bg-card-elevated/40 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Recent Amendments</div>
              <div className="text-3xl font-extrabold text-pen-bright my-2 tabular">{audit.amendmentsDetected.length}</div>
              <div className="text-[11.5px] text-ink-3">Continuous monitoring active</div>
            </div>
          </div>

          {/* 16 Master Categories Health Breakdown */}
          <div className="rounded-xl border border-rule bg-sheet p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
                  <Layers className="size-4 text-pen-bright" />
                  <span>16 Master Legal Categories Coverage Matrix</span>
                </h3>
                <p className="text-[12.5px] text-ink-3 mt-0.5">
                  Evaluates statutory indexing across all operational motor law domains (A through P).
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {audit.categoryAudits.map((cat) => {
                const statusBadge =
                  cat.status === 'VERIFIED'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : cat.status === 'PARTIALLY_VERIFIED'
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    : cat.status === 'NEEDS_REVIEW'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

                return (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-rule/80 bg-paper p-3 flex flex-col justify-between hover:border-pen/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-ink-3 font-mono">Cat {cat.code}</span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9.5px] font-semibold border ${statusBadge}`}>
                          {cat.status}
                        </span>
                      </div>
                      <div className="text-[13px] font-bold text-ink leading-snug line-clamp-1" title={cat.label}>
                        {cat.label}
                      </div>
                      <div className="text-[11px] text-ink-3 mt-1">
                        {cat.totalRegulations} provisions indexed ({cat.verifiedRegulations} verified)
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-rule/40 text-[10.5px] text-ink-2 line-clamp-2">
                      {cat.recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Identified Research Gaps Section */}
          <div className="rounded-xl border border-rule bg-sheet p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <span>Statutory Research Gaps &amp; Investigation Inquiries</span>
                </h3>
                <p className="text-[12.5px] text-ink-3 mt-0.5">
                  Actionable research directions for legal counsel and claim investigators.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-ink-3 uppercase">Severity:</span>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-rule bg-paper text-[12px] text-ink"
                >
                  <option value="ALL">All Gaps ({audit.identifiedGaps.length})</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                </select>
              </div>
            </div>

            {filteredGaps.length === 0 ? (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center text-emerald-400 text-[13px] font-semibold">
                ✓ No unresolved statutory gaps for this selection. The legal database has indexed required primary statutes.
              </div>
            ) : (
              <div className="divide-y divide-rule/60 border border-rule/60 rounded-xl overflow-hidden bg-paper">
                {filteredGaps.map((gap, idx) => (
                  <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-hover transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            gap.severity === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {gap.severity} Priority
                        </span>
                        <span className="text-[13px] font-bold text-ink">{gap.category}</span>
                      </div>
                      <div className="text-[13px] font-medium text-ink-2">{gap.missingArea}</div>
                      <div className="text-[12px] text-ink-3 flex items-center gap-1">
                        <span className="font-semibold text-pen-bright">Recommended Inquiry:</span>
                        <span>{gap.suggestedInquiry}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectCategory?.(gap.categoryId);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-sheet px-2.5 py-1 text-[12px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors shrink-0"
                    >
                      <span>Explore Category</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Amendments Detected */}
          {audit.amendmentsDetected.length > 0 && (
            <div className="rounded-xl border border-rule bg-sheet p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
                <Scale className="size-4 text-pen-bright" />
                <span>Statutory Amendments Detected in {audit.countryName}</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {audit.amendmentsDetected.map((am) => (
                  <div key={am.id} className="rounded-lg border border-rule/80 bg-paper p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-semibold text-pen-bright">{am.statute}</span>
                      <span className="rounded bg-pen/10 px-1.5 py-0.2 text-[10px] font-semibold text-pen-bright">
                        {am.status}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-ink leading-snug">{am.title}</div>
                    <p className="text-[12px] text-ink-2 leading-relaxed">{am.claimsImpact}</p>
                    <div className="text-[11px] text-ink-3">Effective: {am.effectiveDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-t border-rule bg-card-elevated/40">
          <div className="text-[12px] text-ink-3">
            Audited using FaultLine Legal Intelligence Engine v2.4 • Continuous Verification
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-pen px-4 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-colors"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
