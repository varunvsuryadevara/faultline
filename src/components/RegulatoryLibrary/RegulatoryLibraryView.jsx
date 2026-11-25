import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  History,
  Layers,
  LayoutGrid,
  MapPin,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import {
  COUNTRY_METADATA,
  REGIONAL_JURISDICTIONS,
  REGULATION_CATEGORIES,
  MASTER_LEGAL_CATEGORIES,
  VERIFICATION_STATUSES,
  LAW_INSTRUMENT_TYPES,
  resolveMasterCategory,
} from '../../../shared/regulations/vocab.js';
import {
  getCountryDocuments,
  getCountryRegulations,
  getCountryStats,
  getApplicableLawForIncidentDate,
} from '../../../shared/regulations/query.js';
import { downloadCountryGuidePdf } from '../../lib/countryGuidePdf.js';
import RegulationDetailModal from './RegulationDetailModal.jsx';
import DocumentViewerModal from './DocumentViewerModal.jsx';
import JurisdictionCompareModal from './JurisdictionCompareModal.jsx';
import LegalAssistantModal from './LegalAssistantModal.jsx';
import JurisdictionAuditModal from './JurisdictionAuditModal.jsx';

export default function RegulatoryLibraryView({
  countryCode = 'UK',
  onBack,
  onBrowseClaims,
  onSelectCountry,
}) {
  const [categoryMode, setCategoryMode] = useState('MASTER'); // 'MASTER' (16) or 'STANDARD' (10)
  const [categoryLayout, setCategoryLayout] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLayout = params.get('catView');
      if (urlLayout === 'wrap' || urlLayout === 'bar') return urlLayout;
      return localStorage.getItem('faultline_category_layout') || 'bar';
    } catch {
      return 'bar';
    }
  });

  const handleSetCategoryLayout = (mode) => {
    setCategoryLayout(mode);
    try {
      localStorage.setItem('faultline_category_layout', mode);
    } catch {}
  };
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [instrumentFilter, setInstrumentFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [incidentDate, setIncidentDate] = useState('');

  // Category horizontal scroll controls
  const categoryScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  const handleScroll = (direction) => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -320 : 320;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScroll, categoryMode, categoryLayout]);

  // Modals state
  const [selectedRegulation, setSelectedRegulation] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const cc = String(countryCode || 'UK').toUpperCase();
  const countryMeta = COUNTRY_METADATA[cc] || {
    flag: '🌐',
    code: cc,
    name: cc,
    legalSystem: 'Statutory Jurisprudence',
    regulator: 'Insurance Regulatory Authority',
  };

  const countryStats = useMemo(() => getCountryStats(cc), [cc]);
  const regions = REGIONAL_JURISDICTIONS[cc] || [];

  // Point-in-Time Legal Versioning calculation
  const applicableLaw = useMemo(() => {
    if (!incidentDate) return null;
    return getApplicableLawForIncidentDate({
      countryCode: cc,
      incidentDate,
      categoryId: activeCategory !== 'ALL' ? activeCategory : undefined,
    });
  }, [cc, incidentDate, activeCategory]);

  // Query regulations
  const regulations = useMemo(() => {
    let regs = getCountryRegulations(cc, {
      region: selectedRegion !== 'ALL' ? selectedRegion : undefined,
      categoryId: activeCategory !== 'ALL' ? activeCategory : undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      query: search,
    });

    if (instrumentFilter !== 'ALL') {
      regs = regs.filter((r) => r.lawType === instrumentFilter || r.legalReference.toLowerCase().includes(instrumentFilter.toLowerCase()));
    }

    return regs;
  }, [cc, selectedRegion, activeCategory, statusFilter, instrumentFilter, search]);

  // Query official documents
  const documents = useMemo(() => {
    return getCountryDocuments(cc, { query: search });
  }, [cc, search]);

  const handleCopyCitation = (reg) => {
    const text = `${reg.title} — ${reg.legalReference} (${reg.authority}, ${countryMeta.name})`;
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(reg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const coverage = countryStats.coverageScore || 50;
  const coverageColor =
    coverage >= 80
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : coverage >= 60
      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-8 space-y-6 animate-in fade-in duration-150">
      {/* 1. Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-rule">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2 hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Jurisdictions</span>
        </button>

        {/* Country Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="country-selector" className="text-[12px] font-medium text-ink-3">
            Switch Jurisdiction:
          </label>
          <select
            id="country-selector"
            value={cc}
            onChange={(e) => onSelectCountry?.(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-rule bg-paper text-[12.5px] font-medium text-ink focus:outline-none focus:border-pen"
          >
            {Object.entries(COUNTRY_METADATA).map(([cCode, meta]) => (
              <option key={cCode} value={cCode}>
                {meta.flag} {meta.name} ({cCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Country Header & Hero Card */}
      <div className="rounded-2xl border border-rule bg-sheet p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="text-5xl leading-none" role="img" aria-label={countryMeta.name}>
              {countryMeta.flag}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight">
                  {countryMeta.name}
                </h1>
                <span className="text-[14px] font-bold text-ink-3 font-mono">({countryMeta.code})</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${countryStats.verificationInfo.badgeCls}`}
                >
                  <span className={`size-1.5 rounded-full ${countryStats.verificationInfo.dotCls}`} />
                  {countryStats.verificationInfo.label}
                </span>

                {/* Legal Coverage Score Badge */}
                <button
                  type="button"
                  onClick={() => setAuditModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold border hover:opacity-85 transition-opacity ${coverageColor}`}
                  title="Click to view full 16-category audit and gap analysis"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Coverage: {coverage}%</span>
                </button>
              </div>

              <p className="text-[14px] text-ink-2 max-w-2xl leading-relaxed">
                Motor Insurance Laws, Statutory Accident Reporting, Comparative Liability Doctrines, Towing Caps &amp; Claims Reference Library.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-4 text-[12px] text-ink-3">
                <div>
                  <span className="font-semibold text-ink-2">Legal System:</span> {countryMeta.legalSystem}
                </div>
                <div>•</div>
                <div>
                  <span className="font-semibold text-ink-2">Regulator:</span> {countryMeta.regulator}
                </div>
                <div>•</div>
                <div>
                  <span className="font-semibold text-ink-2">Audit Status:</span> {countryStats.lastVerifiedDate}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-pen/30 bg-pen/10 px-3 text-[13px] font-semibold text-pen-bright hover:bg-pen/20 transition-colors shadow-xs"
              >
                <ShieldCheck className="size-4" />
                <span>Audit &amp; Gaps ({coverage}%)</span>
              </button>

              <button
                type="button"
                onClick={() => downloadCountryGuidePdf(cc)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-pen px-4 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-all"
              >
                <Download className="size-4" />
                <span>Guide PDF</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAssistantModalOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:bg-hover transition-colors"
              >
                <Bot className="size-4 text-pen-bright" />
                <span>Ask AI</span>
              </button>

              <button
                type="button"
                onClick={() => setCompareModalOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:bg-hover transition-colors"
              >
                <Scale className="size-4" />
                <span>Compare</span>
              </button>

              <button
                type="button"
                onClick={() => onBrowseClaims?.({ filters: { country: [cc] } })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rule bg-paper px-3 text-[13px] font-medium text-ink hover:border-pen hover:bg-hover transition-colors"
                title="Browse scenario cases in this jurisdiction"
              >
                <FileText className="size-4" />
                <span>Claims ({countryStats.claimCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Regional Jurisdiction Tabs (for federated countries) */}
        {regions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-rule/60 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-3 mr-2">
              <MapPin className="size-3.5" />
              <span>Regional Scope:</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRegion('ALL')}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                selectedRegion === 'ALL'
                  ? 'bg-pen text-white font-semibold shadow-xs'
                  : 'bg-paper text-ink border border-rule hover:border-rule-strong hover:bg-hover'
              }`}
            >
              All Regions / Federal
            </button>
            {regions.map((reg) => (
              <button
                key={reg.code}
                type="button"
                onClick={() => setSelectedRegion(reg.code)}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  selectedRegion === reg.code
                    ? 'bg-pen text-white font-semibold shadow-xs'
                    : 'bg-paper text-ink border border-rule hover:border-rule-strong hover:bg-hover'
                }`}
              >
                {reg.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Point-in-Time Incident Date Applicability Inspector */}
      <div className="rounded-xl border border-rule bg-sheet p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-pen-bright" />
            <div>
              <span className="text-[13px] font-bold text-ink">Point-in-Time Legal Versioning Inspector</span>
              <span className="text-[12px] text-ink-3 block sm:inline sm:ml-2">
                Check whether current or historical statutory version governed on the accident date.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="incident-date-input" className="text-[12px] font-medium text-ink-3">
              Incident Date:
            </label>
            <input
              id="incident-date-input"
              type="date"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-rule bg-paper text-[12.5px] text-ink focus:outline-none focus:border-pen"
            />
            {incidentDate && (
              <button
                type="button"
                onClick={() => setIncidentDate('')}
                className="text-[11.5px] text-ink-3 hover:text-ink underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {applicableLaw && (
          <div
            className={`rounded-lg p-3 border text-[12.5px] flex items-start gap-2.5 ${
              applicableLaw.isHistorical
                ? 'bg-pen-wash border-pen/30 text-pen-dark dark:text-pen-bright'
                : 'bg-agree-wash border-agree/30 text-agree-ink'
            }`}
          >
            {applicableLaw.isHistorical ? (
              <History className="size-4 shrink-0 text-pen mt-0.5" />
            ) : (
              <CheckCircle2 className="size-4 shrink-0 text-agree mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {applicableLaw.isHistorical ? 'Historical Statutory Version Governed Incident' : 'Current Statutory Code Governed Incident'}
              </div>
              <p className="mt-0.5 text-ink-2 leading-relaxed">{applicableLaw.applicabilityNotice}</p>
            </div>
          </div>
        )}
      </div>

      {/* 4. Search and Status Filtering Strip */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-ink-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${countryMeta.name} regulations, section numbers, keywords...`}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-rule bg-sheet text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-pen transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-3 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-rule bg-sheet text-[13px] text-ink focus:outline-none focus:border-pen"
        >
          <option value="ALL">All Verification Statuses</option>
          <option value="VERIFIED">Verified Official Source</option>
          <option value="PARTIALLY_VERIFIED">Partially Verified</option>
          <option value="NEEDS_VERIFICATION">Needs Verification</option>
        </select>
      </div>

      {/* 5. Category Tabs Bar (Master 16 vs Standard 10 & Bar vs Wrap Controls) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-ink-3">Browse by Category:</span>
            {categoryLayout === 'bar' && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-ink-3 bg-sheet px-2 py-0.5 rounded-md border border-rule">
                <span>{categoryMode === 'MASTER' ? '16 Categories' : '10 Categories'}</span>
                <span className="opacity-50">• Scroll or drag horizontal bar</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Scroll Navigation Chevrons (when in bar mode) */}
            {categoryLayout === 'bar' && (
              <div className="flex items-center gap-1 bg-paper rounded-lg p-0.5 border border-rule">
                <button
                  type="button"
                  onClick={() => handleScroll('left')}
                  disabled={!canScrollLeft}
                  className="p-1 rounded-md text-ink-2 hover:bg-sheet hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Scroll categories left"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('right')}
                  disabled={!canScrollRight}
                  className="p-1 rounded-md text-ink-2 hover:bg-sheet hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Scroll categories right"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}

            {/* View Mode: Single-Row Scroll Bar vs Wrap All */}
            <div className="flex items-center gap-1 bg-paper rounded-lg p-0.5 border border-rule">
              <button
                type="button"
                onClick={() => handleSetCategoryLayout('bar')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold text-[11.5px] transition-colors ${
                  categoryLayout === 'bar' ? 'bg-pen text-white shadow-2xs' : 'text-ink-3 hover:text-ink'
                }`}
                title="Display as horizontal scrollable bar with visible track"
              >
                <SlidersHorizontal className="size-3" />
                <span>Bar View</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetCategoryLayout('wrap')}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-semibold text-[11.5px] transition-colors ${
                  categoryLayout === 'wrap' ? 'bg-pen text-white shadow-2xs' : 'text-ink-3 hover:text-ink'
                }`}
                title="Wrap all categories across rows so every category is visible at once"
              >
                <LayoutGrid className="size-3" />
                <span>Wrap All</span>
              </button>
            </div>

            {/* Category Mode: 16 Master vs 10 Standard */}
            <div className="flex items-center gap-1 bg-paper rounded-lg p-0.5 border border-rule">
              <button
                type="button"
                onClick={() => {
                  setCategoryMode('MASTER');
                  setTimeout(checkScroll, 100);
                }}
                className={`rounded px-2.5 py-1 font-semibold text-[11.5px] transition-colors ${
                  categoryMode === 'MASTER' ? 'bg-pen text-white shadow-2xs' : 'text-ink-3 hover:text-ink'
                }`}
              >
                16 Master (A–P)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryMode('STANDARD');
                  setTimeout(checkScroll, 100);
                }}
                className={`rounded px-2.5 py-1 font-semibold text-[11.5px] transition-colors ${
                  categoryMode === 'STANDARD' ? 'bg-pen text-white shadow-2xs' : 'text-ink-3 hover:text-ink'
                }`}
              >
                Standard 10
              </button>
            </div>
          </div>
        </div>

        {/* Categories Display */}
        {categoryLayout === 'bar' ? (
          <div className="relative group rounded-xl border border-rule/70 bg-sheet/40 p-1.5 shadow-2xs">
            {/* Left Edge Overflow Fade */}
            {canScrollLeft && (
              <div className="pointer-events-none absolute left-1.5 top-1.5 bottom-3.5 w-10 bg-gradient-to-r from-sheet to-transparent z-[5] rounded-l-lg" />
            )}
            {/* Right Edge Overflow Fade */}
            {canScrollRight && (
              <div className="pointer-events-none absolute right-1.5 top-1.5 bottom-3.5 w-10 bg-gradient-to-l from-sheet to-transparent z-[5] rounded-r-lg" />
            )}

            {/* Left Quick-Scroll Floating Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScroll('left')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-paper/95 backdrop-blur-md border border-rule shadow-md flex items-center justify-center text-ink hover:text-pen hover:border-pen transition-all"
                aria-label="Scroll left"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}

            {/* Right Quick-Scroll Floating Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScroll('right')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-paper/95 backdrop-blur-md border border-rule shadow-md flex items-center justify-center text-ink hover:text-pen hover:border-pen transition-all"
                aria-label="Scroll right"
              >
                <ChevronRight className="size-4" />
              </button>
            )}

            {/* Horizontal Scrollable Strip with Prominent Visible Scrollbar */}
            <div
              ref={categoryScrollRef}
              onScroll={checkScroll}
              className="overflow-x-auto pb-2.5 pt-0.5 px-0.5 scrollbar-visible"
            >
              <div className="flex items-center gap-1.5 min-w-max">
                <button
                  type="button"
                  onClick={() => setActiveCategory('ALL')}
                  className={`rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-all shrink-0 ${
                    activeCategory === 'ALL'
                      ? 'bg-pen text-white shadow-xs'
                      : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                  }`}
                >
                  All Categories ({regulations.length})
                </button>

                {categoryMode === 'MASTER'
                  ? MASTER_LEGAL_CATEGORIES.map((cat) => {
                      const matchingRegs = getCountryRegulations(cc, { categoryId: cat.id });
                      const count = matchingRegs.length;
                      const isActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          data-active={isActive ? 'true' : 'false'}
                          onClick={() => setActiveCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all shrink-0 ${
                            isActive
                              ? 'bg-pen text-white font-semibold shadow-xs'
                              : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                          }`}
                        >
                          <span className="font-mono font-bold text-[11px] opacity-75">{cat.code}.</span>
                          <span>{cat.label}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[10.5px] font-bold tabular ${
                              isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-3 border border-rule/50'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })
                  : REGULATION_CATEGORIES.map((cat) => {
                      const count = countryStats.categoryCounts[cat.id] || 0;
                      const isActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          data-active={isActive ? 'true' : 'false'}
                          onClick={() => setActiveCategory(cat.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all shrink-0 ${
                            isActive
                              ? 'bg-pen text-white font-semibold shadow-xs'
                              : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[10.5px] font-bold tabular ${
                              isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-3 border border-rule/50'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-rule/70 bg-sheet/40 p-3 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`rounded-xl px-3 py-2 text-[12.5px] font-semibold transition-all shrink-0 ${
                  activeCategory === 'ALL'
                    ? 'bg-pen text-white shadow-xs'
                    : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                }`}
              >
                All Categories ({regulations.length})
              </button>

              {categoryMode === 'MASTER'
                ? MASTER_LEGAL_CATEGORIES.map((cat) => {
                    const matchingRegs = getCountryRegulations(cc, { categoryId: cat.id });
                    const count = matchingRegs.length;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all shrink-0 ${
                          isActive
                            ? 'bg-pen text-white font-semibold shadow-xs'
                            : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                        }`}
                      >
                        <span className="font-mono font-bold text-[11px] opacity-75">{cat.code}.</span>
                        <span>{cat.label}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[10.5px] font-bold tabular ${
                            isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-3 border border-rule/50'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })
                : REGULATION_CATEGORIES.map((cat) => {
                    const count = countryStats.categoryCounts[cat.id] || 0;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-medium transition-all shrink-0 ${
                          isActive
                            ? 'bg-pen text-white font-semibold shadow-xs'
                            : 'bg-sheet text-ink border border-rule hover:border-rule-strong hover:bg-card-elevated'
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.2 text-[10.5px] font-bold tabular ${
                            isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-3 border border-rule/50'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Main Content: Regulation Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[13px] text-ink-3">
          <span>Showing {regulations.length} statutory regulations in {countryMeta.name}</span>
          {activeCategory !== 'ALL' && (
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className="text-pen-bright hover:underline text-[12px] font-medium"
            >
              Show all categories
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {regulations.map((reg) => {
            const vInfo = VERIFICATION_STATUSES[reg.status] || VERIFICATION_STATUSES.VERIFIED;
            const master = resolveMasterCategory(reg.masterCategoryId || reg.categoryId);
            const isCopied = copiedId === reg.id;

            return (
              <div
                key={reg.id}
                className="flex flex-col justify-between rounded-xl border border-rule bg-sheet p-5 hover:border-rule-strong hover:bg-card-elevated/80 transition-all shadow-xs"
              >
                <div>
                  {/* Card Header: Category & Verification Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="rounded-md bg-paper border border-rule px-2 py-0.5 text-[11px] font-medium text-ink-2">
                      Cat {master.code}: {master.label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold border ${vInfo.badgeCls}`}
                    >
                      <span className={`size-1.5 rounded-full ${vInfo.dotCls}`} />
                      {vInfo.shortLabel}
                    </span>
                  </div>

                  {/* Title & Legal Reference */}
                  <h3 className="text-[16px] font-bold text-ink leading-snug mb-1">
                    {reg.title}
                  </h3>

                  <div className="text-[12.5px] font-mono font-semibold text-pen-bright mb-2">
                    {reg.legalReference}
                  </div>

                  <p className="text-[13px] text-ink-2 leading-relaxed line-clamp-3 mb-3">
                    {reg.summary}
                  </p>

                  {/* Mini Implications Preview */}
                  <div className="rounded-lg bg-card-elevated/60 p-2.5 border border-rule/50 text-[11.5px] text-ink-3 space-y-1">
                    <div>
                      <span className="font-semibold text-ink-2">Authority:</span> {reg.authority}
                    </div>
                    {reg.effectiveDate && (
                      <div>
                        <span className="font-semibold text-ink-2">Effective:</span> {reg.effectiveDate}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-rule/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegulation(reg)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-pen-bright hover:underline"
                  >
                    <span>Read Details &amp; Implications</span>
                    <ChevronRight className="size-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(reg)}
                      className="p-1.5 rounded-lg border border-rule bg-paper text-ink-3 hover:text-ink hover:border-pen transition-colors"
                      title="Copy legal citation"
                    >
                      {isCopied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    </button>

                    {reg.sourceUrl && (
                      <a
                        href={reg.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-rule bg-paper text-ink-3 hover:text-pen-bright hover:border-pen transition-colors"
                        title="Open official statutory portal"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {regulations.length === 0 && (
          <div className="rounded-xl border border-dashed border-rule p-12 text-center text-ink-3">
            <Scale className="size-8 mx-auto text-ink-3 mb-2 opacity-50" />
            <p className="text-[15px] font-semibold text-ink">No regulations matched the current criteria</p>
            <p className="text-[13px] text-ink-3 mt-1">Try resetting the category filter or search keywords.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('ALL');
                setSelectedRegion('ALL');
                setStatusFilter('ALL');
                setSearch('');
              }}
              className="mt-3 inline-flex items-center rounded-lg bg-pen px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-xs hover:bg-pen-bright"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* 7. Official Legal Documents Section */}
      {documents.length > 0 && (
        <div className="rounded-2xl border border-rule bg-sheet p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-rule">
            <div>
              <h2 className="text-[17px] font-bold text-ink">Official Legislative Acts &amp; Repositories</h2>
              <p className="text-[12.5px] text-ink-3">
                Primary source statutes, regulatory sourcebooks, and official accident reporting forms
              </p>
            </div>
            <span className="text-[12px] font-semibold text-ink-3">{documents.length} official documents</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between rounded-xl border border-rule bg-paper p-4 hover:border-rule-strong hover:bg-card-elevated transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="rounded bg-sheet border border-rule px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2">
                      {doc.category}
                    </span>
                    <span className="text-[11px] font-mono text-ink-3">{doc.year}</span>
                  </div>

                  <h3 className="text-[14px] font-bold text-ink leading-snug mb-1">{doc.title}</h3>
                  <div className="text-[12px] text-ink-3 mb-2">{doc.authority}</div>
                  <p className="text-[12px] text-ink-2 line-clamp-2 leading-relaxed">{doc.description}</p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-rule/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDocument(doc)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pen-bright hover:underline"
                  >
                    <BookOpen className="size-3.5" />
                    <span>View Document</span>
                  </button>

                  {doc.officialUrl && (
                    <a
                      href={doc.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink font-medium"
                    >
                      <span>Open Portal</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedRegulation && (
        <RegulationDetailModal
          regulation={selectedRegulation}
          onClose={() => setSelectedRegulation(null)}
          onOpenDocument={(docId) => {
            const found = documents.find((d) => d.id === docId);
            if (found) setSelectedDocument(found);
          }}
        />
      )}

      {selectedDocument && (
        <DocumentViewerModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {compareModalOpen && (
        <JurisdictionCompareModal
          initialCountries={[cc, 'UK', 'US'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)}
          onClose={() => setCompareModalOpen(false)}
        />
      )}

      {assistantModalOpen && (
        <LegalAssistantModal
          countryCode={cc}
          onClose={() => setAssistantModalOpen(false)}
          onOpenRegulation={(reg) => setSelectedRegulation(reg)}
        />
      )}

      {auditModalOpen && (
        <JurisdictionAuditModal
          countryCode={cc}
          onClose={() => setAuditModalOpen(false)}
          onSelectCategory={(catId) => {
            setAuditModalOpen(false);
            setActiveCategory(catId);
          }}
        />
      )}
    </main>
  );
}
