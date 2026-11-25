import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  LoaderCircle,
  RotateCcw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { SORT_OPTIONS, facetCounts, queryScenarios } from '../../shared/scenarios/query.js';
import { FILTERS, labelOf } from '../../shared/scenarios/vocab.js';
import { plural } from '../lib/format.js';
import { Chip, FolderTab, IntentTag, RiskBadge } from './ScenarioBits.jsx';
import { Button, cx } from './ui.jsx';

export const PAGE_SIZE = 24;

const EXAMPLES = [
  'UK crash for cash',
  'Monsoon flood damage in India',
  'Garage invoice fraud',
  'Vehicle theft',
  'Witnesses disagree',
  'Genuine accident with suspicious damage',
];

function ScenarioCard({ scenario: s, onOpen }) {
  return (
    <article
      tabIndex={0}
      role="button"
      onClick={() => onOpen(s.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(s.id);
        }
      }}
      aria-label={`Open scenario ${s.id}: ${s.title}`}
      className="group relative flex flex-col pt-[24px] text-left cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen rounded-[10px]"
    >
      <FolderTab className="absolute left-0 top-0 shadow-2xs">
        <span className="font-bold text-ink">{s.id}</span>
        <span className="ml-2 font-medium text-manila-ink/80">{labelOf('country', s.country)}</span>
        {s.isCustom && <span className="ml-2 font-bold text-pen">CUSTOM</span>}
      </FolderTab>

      <div className="flex flex-1 flex-col rounded-[10px] rounded-tl-none border border-rule bg-sheet p-5 shadow-xs transition-colors duration-150 group-hover:border-pen/70 group-hover:bg-hover group-hover:shadow-[0_8px_24px_rgba(79,107,255,0.1)]">
        {/* Title */}
        <h3 className="text-[16px] font-bold leading-snug text-ink group-hover:text-pen transition-colors line-clamp-2">
          {s.title}
        </h3>

        {/* Status badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {s.isCustom && (
            <span className="rounded bg-pen/15 px-2 py-0.5 text-[11.5px] font-bold text-pen border border-pen/30">
              Customised
            </span>
          )}
          <IntentTag intent={s.intent} />
          <RiskBadge risk={s.risk} />
          <span className="rounded bg-paper px-2 py-0.5 text-[11.5px] font-medium text-ink-3 border border-rule">
            {labelOf('difficulty', s.difficulty)}
          </span>
        </div>

        {/* Narrative excerpt */}
        <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">
          {s.story || s.type || 'Claim file exhibits and statements ready for cross-examination.'}
        </p>

        {/* Forensic metadata row with Action pill */}
        <div className="mt-auto pt-4 border-t border-rule/60 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[12px] text-ink-3">
          <div className="flex flex-wrap gap-x-2.5 gap-y-1">
            <span className="font-medium text-ink-2">{labelOf('category', s.category)}</span>
            <span>•</span>
            <span>{labelOf('vehicle', s.vehicle)}</span>
            {s.accidentType && (
              <>
                <span>•</span>
                <span>{labelOf('accidentType', s.accidentType)}</span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-pen/10 px-2.5 py-1 text-[12px] font-bold text-pen transition-colors duration-150 group-hover:bg-pen group-hover:text-white">
            Open Case <ArrowRight className="size-3" />
          </span>
        </div>
      </div>
    </article>
  );
}

function FilterGroup({ title, filters, queryFilters, facets, onChange }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-rule/70 py-3 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[13px] font-bold text-ink hover:text-pen"
      >
        <span>{title}</span>
        {open ? <ChevronUp className="size-3.5 text-ink-3" /> : <ChevronDown className="size-3.5 text-ink-3" />}
      </button>

      {open && (
        <div className="mt-2.5 space-y-2.5">
          {filters.map((f) => {
            const value = queryFilters[f.key]?.[0] ?? '';
            const counts = facets[f.key] ?? {};
            const total = Object.values(counts).reduce((a, b) => a + b, 0);

            return (
              <label key={f.key} className="block">
                <span className="text-[12px] font-semibold text-ink-2">{f.label}</span>
                <select
                  value={value}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className={cx(
                    'mt-1 block h-8 w-full rounded-[6px] border bg-paper px-2 text-[13px] text-ink outline-none transition-colors focus:border-pen',
                    value ? 'border-pen font-semibold bg-sheet' : 'border-rule hover:border-rule-strong',
                  )}
                >
                  <option value="">
                    {f.all} ({total})
                  </option>
                  {f.groups
                    ? f.groups.map((g) => {
                        const shown = f.options.filter((o) => o.group === g.value && ((counts[o.value] ?? 0) > 0 || o.value === value));
                        if (!shown.length) return null;
                        return (
                          <optgroup key={g.value} label={g.label}>
                            {shown.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label} ({counts[o.value] ?? 0})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    : f.options.map((o) => {
                        const n = counts[o.value] ?? 0;
                        if (!n && o.value !== value) return null;
                        return (
                          <option key={o.value} value={o.value}>
                            {o.label} ({n})
                          </option>
                        );
                      })}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSidebar({ queryFilters, facets, onChange, onClear, activeCount }) {
  const jurisdictionFilters = FILTERS.filter((f) => ['country', 'stage'].includes(f.key));
  const classificationFilters = FILTERS.filter((f) => ['category', 'intent', 'risk', 'fraudType'].includes(f.key));
  const technicalFilters = FILTERS.filter((f) => ['claimType', 'vehicle', 'accidentType', 'weather', 'difficulty'].includes(f.key));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Pinned top bar: Search Filters title & Reset */}
      <div className="shrink-0 flex items-center justify-between p-4 pb-3 border-b border-rule bg-sheet">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-pen" />
          <h2 className="text-[14px] font-bold text-ink">Search Filters</h2>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] font-bold text-pen hover:underline"
          >
            <RotateCcw className="size-3" />
            Reset ({activeCount})
          </button>
        )}
      </div>

      {/* Independently scrollable filter groups */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin overscroll-contain">
        <FilterGroup
          title="Jurisdiction & Claim Stage"
          filters={jurisdictionFilters}
          queryFilters={queryFilters}
          facets={facets}
          onChange={onChange}
        />
        <FilterGroup
          title="Intent & Fraud Patterns"
          filters={classificationFilters}
          queryFilters={queryFilters}
          facets={facets}
          onChange={onChange}
        />
        <FilterGroup
          title="Incident & Vehicle Factors"
          filters={technicalFilters}
          queryFilters={queryFilters}
          facets={facets}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export default function ScenarioLibrary({ scenarios, failed, onRetry, query, onQuery, onOpen, onRandom, onNotify }) {
  const [text, setText] = useState(query.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef(null);

  // Search as you type with smooth debounce
  useEffect(() => {
    if (text === query.q) return undefined;
    const t = setTimeout(() => onQuery({ q: text, shown: PAGE_SIZE }), 220);
    return () => clearTimeout(t);
  }, [text, query.q, onQuery]);
  useEffect(() => setText(query.q), [query.q]);

  // "/" jumps to the search box
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const list = scenarios ?? [];
  const result = useMemo(() => queryScenarios(list, query), [list, query]);
  const facets = useMemo(() => facetCounts(list, query), [list, query]);
  const countries = useMemo(() => new Set(list.map((s) => s.country)).size, [list]);
  const active = FILTERS.filter((f) => query.filters[f.key]?.length);

  const setFilter = (key, value) =>
    onQuery({ filters: { ...query.filters, [key]: value ? [value] : undefined }, shown: PAGE_SIZE });
  const clearFilters = () => {
    onQuery({ filters: {}, shown: PAGE_SIZE });
    onNotify?.('Filters cleared');
  };

  if (!scenarios) {
    if (failed) {
      return (
        <main className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8">
          <div className="rounded-xl border border-critical/30 bg-sheet p-8 text-center max-w-md mx-auto">
            <h1 className="text-[20px] font-bold text-ink">The scenario library didn’t load</h1>
            <p className="mt-2 text-[14.5px] text-ink-2">Check your server connection, then try again.</p>
            <Button className="mt-5 mx-auto" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </main>
      );
    }
    return (
      <main className="mx-auto flex max-w-[1240px] items-center justify-center gap-3 px-5 py-24 text-ink-2 sm:px-8">
        <LoaderCircle className="size-6 animate-spin text-pen" aria-hidden="true" />
        <span className="font-semibold text-[15px]">Loading scenario intelligence database…</span>
      </main>
    );
  }

  const shown = result.items.slice(0, query.shown);

  return (
    <main className="mx-auto max-w-[1360px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      {/* Header */}
      <header className="rounded-xl border border-rule bg-sheet p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-pen/10 text-pen">
                <Database className="size-4" />
              </span>
              <span className="text-[12.5px] font-bold text-pen uppercase tracking-wider">
                Intelligence Database
              </span>
            </div>
            <h1 className="mt-1 text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold tracking-[-0.02em] text-ink">
              Motor Claims Scenario Library
            </h1>
            <p className="mt-1.5 max-w-[76ch] text-[15px] leading-relaxed text-ink-2">
              {plural(list.length, 'realistic claim file')} spanning {plural(countries, 'jurisdiction', 'jurisdictions')}.
              Inspect evidence, test the AI assessor blind, or cross-examine conflicting statements.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={() => onRandom(result.items)} disabled={!result.items.length}>
              <Shuffle className="size-4" aria-hidden="true" />
              Random Scenario
            </Button>
          </div>
        </div>

        {/* Prominent Search Bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search scenarios</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search claims in plain words (e.g., 'UK crash for cash', 'monsoon flood', 'garage invoice fraud')..."
              className="h-12 w-full rounded-[9px] border border-rule bg-paper pl-11 pr-10 text-[15px] text-ink font-medium outline-none transition-colors placeholder:text-ink-3/80 focus:border-pen focus:bg-sheet focus:shadow-xs"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink hover:bg-ink/5"
                title="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </label>

          <Button
            variant="secondary"
            onClick={() => setFiltersOpen((v) => !v)}
            className="h-12 lg:hidden font-semibold"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters {active.length ? `(${active.length})` : ''}
          </Button>
        </div>

        {/* Suggested natural language search tags */}
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[12.5px] text-ink-3">
          <span className="font-semibold text-ink-2">Suggested:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                onQuery({ q: ex, shown: PAGE_SIZE });
              }}
              className="rounded-md border border-rule/80 bg-paper px-2 py-0.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-pen hover:bg-sheet hover:text-pen"
            >
              {ex}
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid: Sidebar + Cards */}
      <div className="mt-7 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 items-start">
        {/* Filter Sidebar */}
        <aside
          className={cx(
            'rounded-[10px] border border-rule bg-sheet shadow-xs lg:sticky lg:top-[76px] max-h-[75vh] lg:max-h-[calc(100vh-92px)] flex-col overflow-hidden',
            filtersOpen ? 'flex mb-6' : 'hidden lg:flex',
          )}
        >
          <FilterSidebar
            queryFilters={query.filters}
            facets={facets}
            onChange={setFilter}
            onClear={clearFilters}
            activeCount={active.length}
          />
        </aside>

        {/* Results Area */}
        <section aria-label="Scenarios List">
          {/* Controls Bar: Active Chips & Sorting */}
          <div className="rounded-[9px] border border-rule bg-sheet px-4 py-3 shadow-2xs mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13.5px] font-bold text-ink">
                  {plural(result.total, 'claim')} matching
                </span>
                {active.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-pen/30 bg-pen-wash px-2.5 py-0.5 text-[12px] font-bold text-pen"
                  >
                    <span>{f.label}:</span>
                    <span className="font-semibold">{labelOf(f.key, query.filters[f.key][0])}</span>
                    <button
                      type="button"
                      onClick={() => setFilter(f.key, '')}
                      className="rounded-full hover:bg-pen/10 p-0.5"
                      title={`Remove filter ${f.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {active.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[12.5px] font-medium text-ink-3 hover:text-pen hover:underline ml-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[12.5px] font-semibold text-ink-3">Sort by:</span>
                <select
                  value={query.sort}
                  onChange={(e) => onQuery({ sort: e.target.value })}
                  className="h-8 rounded-[6px] border border-rule bg-paper px-2 text-[13px] font-semibold text-ink outline-none focus:border-pen"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value === 'relevance' && !query.q ? 'Default Order' : o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {result.partial && (
            <div className="mb-4 rounded-[8px] border border-major/40 bg-major-wash px-4 py-2.5 text-[13.5px] font-medium text-major-ink dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300">
              No exact match for every keyword. Showing closest matching claims below.
            </div>
          )}

          {/* Cards Grid */}
          {shown.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {shown.map((s) => (
                <ScenarioCard key={s.id} scenario={s} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-rule-strong bg-sheet px-6 py-14 text-center">
              <Database className="mx-auto size-10 text-ink-3/40 mb-3" />
              <h3 className="text-[16px] font-bold text-ink">No matching claims found</h3>
              <p className="mt-1.5 text-[14px] text-ink-2 max-w-md mx-auto">
                No scenario matched your current search filters. Try removing a filter or using broader keywords.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Reset All Filters
                </Button>
                <Button variant="primary" size="sm" onClick={() => onQuery({ q: '', filters: {}, shown: PAGE_SIZE })}>
                  Clear Search & Filters
                </Button>
              </div>
            </div>
          )}

          {/* Pagination / Load More */}
          {result.items.length > shown.length && (
            <div className="mt-10 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => onQuery({ shown: query.shown + PAGE_SIZE })}
                className="shadow-xs font-semibold px-6"
              >
                Load {Math.min(PAGE_SIZE, result.items.length - shown.length)} More Claims
              </Button>
              <span className="text-[12.5px] text-ink-3">
                Showing {shown.length} of {result.items.length} claims
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
