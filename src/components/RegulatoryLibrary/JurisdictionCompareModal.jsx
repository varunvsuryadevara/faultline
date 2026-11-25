import { useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Layers,
  Printer,
  Scale,
  Shield,
  X,
} from 'lucide-react';
import { compareJurisdictions } from '../../../shared/regulations/query.js';
import { COUNTRY_METADATA } from '../../../shared/regulations/vocab.js';
import { downloadCountryGuidePdf } from '../../lib/countryGuidePdf.js';

export default function JurisdictionCompareModal({ initialCountries = ['UK', 'US', 'IN'], onClose }) {
  const [selectedCodes, setSelectedCodes] = useState(
    Array.isArray(initialCountries) && initialCountries.length > 0 ? initialCountries.slice(0, 4) : ['UK', 'US', 'IN']
  );

  const allCountries = useMemo(() => Object.entries(COUNTRY_METADATA), []);

  const matrix = useMemo(() => {
    return compareJurisdictions(selectedCodes);
  }, [selectedCodes]);

  const toggleCountry = (code) => {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 2) return prev; // Keep at least 2
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, code];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-2xl border border-rule bg-sheet shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-rule bg-card-elevated/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pen/10 px-2.5 py-0.5 text-[11px] font-semibold text-pen-bright border border-pen/20">
                <Scale className="size-3" />
                Cross-Jurisdiction Legal Benchmark
              </span>
              <span className="text-[12px] text-ink-3">Select 2 to 4 countries</span>
            </div>
            <h2 className="text-[19px] sm:text-[21px] font-bold text-ink leading-snug">
              Motor Insurance Jurisdictional Comparison Matrix
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
            >
              <Printer className="size-3.5" />
              <span>Print Matrix</span>
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

        {/* Country Selector Chips */}
        <div className="px-5 py-3 border-b border-rule bg-sheet flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-wider text-ink-3 mr-2">Jurisdictions:</span>
          {allCountries.map(([code, meta]) => {
            const isSelected = selectedCodes.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleCountry(code)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold border transition-all ${
                  isSelected
                    ? 'border-pen bg-pen text-white shadow-xs'
                    : 'border-rule bg-paper text-ink hover:border-rule-strong hover:bg-hover'
                }`}
              >
                <span>{meta.flag}</span>
                <span>{code}</span>
                {isSelected && <Check className="size-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>

        {/* Matrix Comparison Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5 sm:p-6">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-rule">
                <th className="w-48 pb-3 font-bold uppercase tracking-wider text-[11px] text-ink-3">
                  Legal Dimension
                </th>
                {matrix.map((c) => (
                  <th key={c.code} className="pb-3 px-3 font-bold text-ink">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{c.flag}</span>
                        <div>
                          <div className="text-[15px] font-bold text-ink">{c.name}</div>
                          <div className="text-[11px] font-normal text-ink-3 font-mono">{c.code}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadCountryGuidePdf(c.code)}
                        className="p-1 rounded text-ink-3 hover:text-pen-bright transition-colors"
                        title={`Download ${c.name} Guide PDF`}
                      >
                        <Download className="size-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/60 text-ink-2">
              {/* Row 1: Legal System & Regulator */}
              <tr className="bg-card-elevated/20">
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Legal System &amp; Regulator
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-ink">{c.legalSystem}</div>
                    <div className="text-[11.5px] text-ink-3 mt-0.5">{c.regulator}</div>
                  </td>
                ))}
              </tr>

              {/* Row 2: Mandatory Insurance */}
              <tr>
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Mandatory Insurance &amp; Limits
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-pen-bright font-mono text-[12px] mb-1">
                      {c.mandatoryInsurance}
                    </div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.mandatorySummary}</p>
                  </td>
                ))}
              </tr>

              {/* Row 3: Accident Reporting Rules */}
              <tr className="bg-card-elevated/20">
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Accident Reporting Deadlines
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-ink font-mono text-[12px] mb-1">
                      {c.reportingRules}
                    </div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.reportingSummary}</p>
                  </td>
                ))}
              </tr>

              {/* Row 4: Liability & Negligence */}
              <tr>
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Liability &amp; Negligence Doctrine
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-ink mb-1">{c.liabilityPrinciple}</div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.liabilitySummary}</p>
                  </td>
                ))}
              </tr>

              {/* Row 5: Injury Compensation */}
              <tr className="bg-card-elevated/20">
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Injury Tariffs &amp; No-Fault Regimes
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-ink mb-1">{c.injuryRegime}</div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.injurySummary}</p>
                  </td>
                ))}
              </tr>

              {/* Row 6: Fraud Penalties */}
              <tr>
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Fraud Legislation &amp; Penal Sanctions
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-rose-400 font-mono text-[12px] mb-1">
                      {c.fraudPenalties}
                    </div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.fraudSummary}</p>
                  </td>
                ))}
              </tr>

              {/* Row 7: Ombudsman / Dispute Forum */}
              <tr className="bg-card-elevated/20">
                <td className="py-3.5 pr-4 font-bold text-ink text-[12px] uppercase tracking-wider">
                  Ombudsman &amp; Dispute Resolution
                </td>
                {matrix.map((c) => (
                  <td key={c.code} className="py-3.5 px-3">
                    <div className="font-semibold text-ink mb-1">{c.disputeForum}</div>
                    <p className="text-[12.5px] text-ink-2 leading-relaxed">{c.disputeSummary}</p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-rule bg-card-elevated/40 flex items-center justify-between">
          <span className="text-[12px] text-ink-3">
            Showing comparative legal analysis for {matrix.length} jurisdictions
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-pen px-4 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
