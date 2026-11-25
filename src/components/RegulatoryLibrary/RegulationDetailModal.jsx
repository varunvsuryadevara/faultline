import { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck,
  FileText,
  History,
  Layers,
  Printer,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  VERIFICATION_STATUSES,
  REGULATION_CATEGORIES,
  COUNTRY_METADATA,
  MASTER_LEGAL_CATEGORIES,
  LAW_INSTRUMENT_TYPES,
  resolveMasterCategory,
} from '../../../shared/regulations/vocab.js';

export default function RegulationDetailModal({ regulation, onClose, onOpenDocument }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW, IMPACT, HISTORY

  if (!regulation) return null;

  const countryMeta = COUNTRY_METADATA[regulation.country] || { flag: '🌐', name: regulation.country };
  const vInfo = VERIFICATION_STATUSES[regulation.status] || VERIFICATION_STATUSES.VERIFIED;
  const masterCat = resolveMasterCategory(regulation.masterCategoryId || regulation.categoryId);
  const legacyCat = REGULATION_CATEGORIES.find((c) => c.id === regulation.categoryId) || { label: masterCat.label };

  const handleCopyCitation = () => {
    const citationText = `${regulation.title} — ${regulation.legalReference} (${regulation.authority}, ${countryMeta.name})`;
    try {
      navigator.clipboard.writeText(citationText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-rule bg-sheet shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-rule bg-card-elevated/40">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xl" role="img" aria-label={countryMeta.name}>
                {countryMeta.flag}
              </span>
              <span className="text-[12.5px] font-semibold text-ink-2">
                {countryMeta.name} {regulation.region ? `(${regulation.region})` : ''}
              </span>
              <span className="text-ink-3">•</span>
              <span className="rounded-md bg-paper border border-rule px-2 py-0.5 text-[11px] font-medium text-ink-2">
                Cat {masterCat.code}: {masterCat.label}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${vInfo.badgeCls}`}>
                <span className={`size-1.5 rounded-full ${vInfo.dotCls}`} />
                {vInfo.label}
              </span>
            </div>

            <h2 className="text-[19px] sm:text-[22px] font-bold text-ink leading-snug">
              {regulation.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-3 hover:text-ink hover:bg-hover transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 border-b border-rule bg-sheet flex items-center gap-4 text-[13px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'OVERVIEW'
                ? 'border-pen text-pen-bright font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <BookOpen className="size-4" />
            <span>Statute &amp; Provisions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('IMPACT')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'IMPACT'
                ? 'border-pen text-pen-bright font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <Scale className="size-4" />
            <span>Practical Insurance Impact</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'HISTORY'
                ? 'border-pen text-pen-bright font-semibold'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
          >
            <History className="size-4" />
            <span>History &amp; Citations</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Statutory Citation Banner */}
          <div className="rounded-xl border border-pen/20 bg-pen/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-pen-bright mb-0.5 flex items-center gap-1.5">
                <Scale className="size-3.5" />
                Statutory Authority &amp; Exact Section
              </div>
              <div className="text-[15px] font-bold text-ink font-mono">
                {regulation.legalReference}
              </div>
              <div className="text-[12px] text-ink-2 mt-0.5">
                Enacted by: {regulation.authority} {regulation.effectiveDate ? `• In force: ${regulation.effectiveDate}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rule bg-paper px-2.5 text-[12px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Citation'}</span>
              </button>

              {regulation.sourceUrl && (
                <a
                  href={regulation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rule bg-paper px-2.5 text-[12px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Official Source</span>
                </a>
              )}
            </div>
          </div>

          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Section 1: Summary */}
              <div>
                <h3 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5">
                  <BookOpen className="size-4 text-pen-bright" />
                  Plain-Language Legal Summary
                </h3>
                <p className="text-[14px] leading-relaxed text-ink bg-card-elevated/50 p-4 rounded-xl border border-rule">
                  {regulation.summary}
                </p>
              </div>

              {/* Section 2: Detailed Statutory Explanation */}
              <div>
                <h3 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5">
                  <FileText className="size-4 text-pen-bright" />
                  Detailed Statutory Operation &amp; Legislative Scheme
                </h3>
                <div className="text-[13.5px] leading-relaxed text-ink-2 space-y-2.5 bg-paper p-4 rounded-xl border border-rule">
                  <p>{regulation.detailedExplanation}</p>
                </div>
              </div>

              {/* Section 3: Applicability */}
              <div>
                <h3 className="text-[12.5px] font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5">
                  <Shield className="size-4 text-pen-bright" />
                  Statutory Scope &amp; Applicability
                </h3>
                <div className="text-[13px] text-ink-2 bg-paper p-3.5 rounded-xl border border-rule">
                  {regulation.applicability}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'IMPACT' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Practical Insurance Impact Matrix across 4 Stakeholders */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* For Policyholders */}
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <ShieldCheck className="size-4" />
                    For Policyholders &amp; Insureds
                  </div>
                  <p className="text-[13px] text-ink leading-relaxed">
                    Mandatory third-party coverage rules, deductible obligations, and statutory requirements for pre-contractual disclosures or permitted driver limitations.
                  </p>
                </div>

                {/* For Drivers / Scene Actors */}
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-2">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <UserCheck className="size-4" />
                    For Motorists &amp; Drivers
                  </div>
                  <p className="text-[13px] text-ink leading-relaxed">
                    Scene reporting requirements, driver identification exchange, police reporting deadlines, and impairment/speeding standards impacting indemnity.
                  </p>
                </div>

                {/* For Insurers / Claims Handlers */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="size-4" />
                    Claims Adjudication Implications
                  </div>
                  <p className="text-[13px] text-ink leading-relaxed">
                    {regulation.claimsImplications}
                  </p>
                </div>

                {/* For Investigators */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileCheck className="size-4" />
                    Investigative Audit &amp; Forensic Checklist
                  </div>
                  <p className="text-[13px] text-ink leading-relaxed">
                    {regulation.investigationImplications}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="rounded-xl border border-rule bg-paper p-4 space-y-3">
                <h4 className="text-[13px] font-bold text-ink uppercase tracking-wider text-ink-3">
                  Statutory Metadata &amp; In-Force Validity
                </h4>

                <div className="grid gap-3 sm:grid-cols-2 text-[12.5px]">
                  <div>
                    <span className="text-ink-3">Statutory Identifier:</span>{' '}
                    <span className="font-mono font-semibold text-ink">{regulation.id}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Enactment Status:</span>{' '}
                    <span className="font-semibold text-emerald-400">{vInfo.label}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Effective Date:</span>{' '}
                    <span className="font-semibold text-ink">{regulation.effectiveDate || 'Statutory Code in Force'}</span>
                  </div>
                  <div>
                    <span className="text-ink-3">Repeal / Sunset Date:</span>{' '}
                    <span className="font-semibold text-ink">{regulation.repealDate || 'None (Active Legislation)'}</span>
                  </div>
                </div>

                {regulation.documentRef && (
                  <div className="pt-2 border-t border-rule/50 flex items-center justify-between">
                    <span className="text-[12px] text-ink-3">Primary Document Reference:</span>
                    <button
                      type="button"
                      onClick={() => onOpenDocument?.(regulation.documentRef)}
                      className="text-[12px] font-semibold text-pen-bright hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="size-3.5" />
                      <span>{regulation.documentRef}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Tags */}
              {Array.isArray(regulation.tags) && regulation.tags.length > 0 && (
                <div>
                  <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink-3 mb-2 flex items-center gap-1.5">
                    <Tag className="size-3.5" />
                    Classification Tags &amp; Search Keywords
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {regulation.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-paper border border-rule px-2.5 py-1 text-[11px] font-medium text-ink-3"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-t border-rule bg-card-elevated/40">
          <div className="flex items-center gap-2 text-[12px] text-ink-3">
            <Calendar className="size-3.5" />
            <span>Audited &amp; verified for FaultLine Motor Law Intelligence Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
            >
              <Printer className="size-3.5" />
              <span>Print</span>
            </button>
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
    </div>
  );
}
