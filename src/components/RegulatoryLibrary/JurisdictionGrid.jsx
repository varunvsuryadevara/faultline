import { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Scale,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react';
import { getAllCountriesStats } from '../../../shared/regulations/query.js';
import { downloadCountryGuidePdf } from '../../lib/countryGuidePdf.js';

export default function JurisdictionGrid({
  countryCounts,
  onBrowseClaims,
  onOpenCountryLibrary,
  onOpenCompare,
}) {
  const [search, setSearch] = useState('');
  const [filterSystem, setFilterSystem] = useState('ALL');
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  // Calculate stats for all 20 countries
  const countriesStats = useMemo(() => {
    return getAllCountriesStats(countryCounts);
  }, [countryCounts]);

  // Filtered countries
  const filteredCountries = useMemo(() => {
    return countriesStats.filter((c) => {
      if (filterSystem !== 'ALL' && !c.legalSystem.toLowerCase().includes(filterSystem.toLowerCase())) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.legalSystem.toLowerCase().includes(q) ||
          c.regulator.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [countriesStats, filterSystem, search]);

  const toggleCompare = (code) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 4) return prev; // max 4
      return [...prev, code];
    });
  };

  return (
    <section id="jurisdictions-section" className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 scroll-mt-20">
      <div className="rounded-xl border border-rule bg-sheet p-6 shadow-xs">
        {/* Header with Title & Global Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 pb-5 border-b border-rule">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pen/10 px-2.5 py-0.5 text-[11px] font-semibold text-pen-bright border border-pen/20">
                <Scale className="size-3" />
                Statutory Regulatory Hub
              </span>
              <span className="text-[12px] text-ink-3">20 Jurisdictions Indexed</span>
            </div>
            <h3 className="text-[19px] font-bold text-ink">Motor Insurance Laws, Regulations &amp; Legal Library</h3>
            <p className="text-[13.5px] text-ink-2 max-w-2xl mt-0.5">
              Explore authentic statutory frameworks, mandatory minimums, police reporting deadlines, comparative liability doctrines, and official legal documents across 20 countries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedForCompare.length >= 2 && (
              <button
                type="button"
                onClick={() => onOpenCompare?.(selectedForCompare)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-pen px-3.5 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-all"
              >
                <Layers className="size-4" />
                Compare Selected ({selectedForCompare.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenCompare?.(['UK', 'US', 'IN'])}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:bg-hover transition-colors"
            >
              <Scale className="size-4 text-pen-bright" />
              Compare Jurisdictions
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jurisdictions by country, regulator, or legal system..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-rule bg-paper text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-pen transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-3 hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              className="h-10 px-3 rounded-lg border border-rule bg-paper text-[13px] text-ink focus:outline-none focus:border-pen"
            >
              <option value="ALL">All Legal Systems</option>
              <option value="Common Law">Common Law</option>
              <option value="Civil Law">Civil Law</option>
              <option value="No-Fault">No-Fault Systems</option>
            </select>
          </div>
        </div>

        {/* 20 Countries Grid */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCountries.map((c) => {
            const isCompared = selectedForCompare.includes(c.code);
            return (
              <div
                key={c.code}
                className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                  isCompared
                    ? 'border-pen bg-pen/5 shadow-xs'
                    : 'border-rule bg-paper hover:border-rule-strong hover:bg-card-elevated hover:shadow-xs'
                }`}
              >
                <div>
                  {/* Card Header: Flag, Name, Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl leading-none" role="img" aria-label={c.name}>
                        {c.flag}
                      </span>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink leading-tight flex items-center gap-1.5">
                          {c.name}
                          <span className="text-[11px] font-medium text-ink-3 font-mono">({c.code})</span>
                        </h4>
                        <span className="text-[11.5px] text-ink-3 block truncate max-w-[170px]" title={c.legalSystem}>
                          {c.legalSystem}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold border ${c.verificationInfo.badgeCls}`}
                      title={c.verificationInfo.description}
                    >
                      <span className={`size-1.5 rounded-full ${c.verificationInfo.dotCls}`} />
                      {c.verificationInfo.shortLabel}
                    </span>
                  </div>

                  {/* Regulator & Verification */}
                  <div className="mt-2.5 text-[12px] text-ink-2 bg-sheet/80 rounded-lg p-2 border border-rule/60">
                    <div className="text-[10.5px] uppercase font-bold tracking-wider text-ink-3 mb-0.5">Regulator</div>
                    <div className="truncate text-ink font-medium" title={c.regulator}>
                      {c.regulator}
                    </div>
                  </div>

                  {/* Counts Strip: Separate Claims vs Regulations vs Documents */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onBrowseClaims?.({ filters: { country: [c.code] } })}
                      className="rounded-lg bg-sheet py-1.5 px-1 border border-rule/50 hover:border-pen/50 hover:bg-hover transition-colors"
                      title="Click to browse scenario cases"
                    >
                      <span className="block text-[13px] font-bold text-ink tabular">{c.claimCount}</span>
                      <span className="block text-[10px] text-ink-3 font-medium">Claims</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCountryLibrary?.(c.code)}
                      className="rounded-lg bg-pen/10 py-1.5 px-1 border border-pen/20 hover:bg-pen/20 transition-colors"
                      title="Click to view statutory regulations"
                    >
                      <span className="block text-[13px] font-bold text-pen-bright tabular">{c.regulationCount}</span>
                      <span className="block text-[10px] text-pen-bright font-medium">Statutes</span>
                    </button>

                    <div className="rounded-lg bg-sheet py-1.5 px-1 border border-rule/50">
                      <span className="block text-[13px] font-bold text-ink tabular">{c.documentCount}</span>
                      <span className="block text-[10px] text-ink-3 font-medium">Official Docs</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenCountryLibrary?.(c.code)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-paper border border-rule hover:border-pen hover:bg-hover hover:text-pen-bright py-1.5 text-[12px] font-semibold text-ink transition-colors"
                  >
                    <BookOpen className="size-3.5 text-pen-bright" />
                    <span>View Regulations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadCountryGuidePdf(c.code)}
                    className="inline-flex size-8 items-center justify-center rounded-lg border border-rule bg-paper text-ink hover:text-pen-bright hover:border-pen transition-colors"
                    title={`Download ${c.name} Motor Insurance Guide PDF`}
                  >
                    <Download className="size-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCompare(c.code)}
                    className={`inline-flex size-8 items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors ${
                      isCompared
                        ? 'border-pen bg-pen text-white'
                        : 'border-rule bg-paper text-ink-3 hover:text-ink hover:border-rule-strong'
                    }`}
                    title={isCompared ? 'Remove from compare' : 'Add to compare'}
                  >
                    <Scale className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredCountries.length === 0 && (
          <div className="py-12 text-center text-ink-3">
            <p className="text-[14px]">No jurisdictions matched &ldquo;{search}&rdquo;</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterSystem('ALL');
              }}
              className="mt-2 text-[13px] text-pen-bright font-medium hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
