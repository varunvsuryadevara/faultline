import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Columns2,
  Copy,
  FileText,
  Info,
  LoaderCircle,
  MapPin,
  Pencil,
  RotateCcw,
  Save,
  Scale,
  ScanSearch,
  Share2,
  ShieldAlert,
  Shuffle,
  Users,
  Wind,
} from 'lucide-react';
import { EXHIBIT_IDS, EXHIBIT_KINDS } from '../../shared/constants.js';
import { scenarioCase } from '../../shared/scenarios/case.js';
import { labelOf } from '../../shared/scenarios/vocab.js';
import {
  clearScenarioOverride,
  duplicateScenarioVersion,
  getLocalCustomScenarios,
  getScenarioOverride,
  persistScenario,
  setScenarioOverride,
} from '../lib/customScenarios.js';
import { addRecentCase } from '../lib/recentCases.js';
import EvidenceConnections from './EvidenceConnections.jsx';
import InvestigationTimeline from './InvestigationTimeline.jsx';
import ScenarioAssessment from './ScenarioAssessment.jsx';
import { BulletList, FolderTab, IntentTag, RiskBadge, SectionHeading } from './ScenarioBits.jsx';
import ScenarioCaseFile from './ScenarioCaseFile.jsx';
import { Button, CopyButton, ExhibitTag, IconButton, cx } from './ui.jsx';

const KIND_LABEL = Object.fromEntries(EXHIBIT_KINDS.map((k) => [k.value, k.label]));

const TABS = [
  { id: 'case', label: 'Case File & Evidence' },
  { id: 'timeline', label: 'Forensic Timeline' },
  { id: 'ai', label: 'AI Assessment' },
  { id: 'reference', label: 'Reference Answers' },
];

const FACTS = [
  ['stage', 'Claim stage'],
  ['category', 'Category'],
  ['claimType', 'Claim type'],
  ['vehicle', 'Vehicle'],
  ['weather', 'Weather'],
  ['accidentType', 'Accident type'],
  ['fraudType', 'Fraud type'],
  ['difficulty', 'Difficulty'],
  ['country', 'Country'],
];

function Facts({ scenario: s, onFilter }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {FACTS.map(([key, label]) => (
        <div key={key} className="min-w-0">
          <dt className="text-[12.5px] text-ink-3">{label}</dt>
          <dd className="mt-0.5">
            <button
              type="button"
              onClick={() => onFilter(key, s[key])}
              title={`Show every scenario with ${label.toLowerCase()}: ${labelOf(key, s[key])}`}
              className="rounded text-left text-[14px] font-medium text-ink decoration-ink-3/60 underline-offset-[3px] hover:text-pen hover:underline"
            >
              {labelOf(key, s[key])}
            </button>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CaseOverviewPanel({ scenario: s, onFilter }) {
  return (
    <div className="rounded-[12px] border border-rule bg-sheet p-6 shadow-xs">
      <div className="flex items-center gap-2 border-b border-rule pb-3.5 mb-5">
        <ClipboardList className="size-4 text-pen" />
        <h3 className="text-[14.5px] font-bold text-ink">Structured Incident Overview</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
        {/* Col 1 */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-ink-3 tracking-wider">
            <Car className="size-3.5" />
            Vehicle Details
          </span>
          <p className="text-[14px] font-semibold text-ink">
            {labelOf('vehicle', s.vehicle)}
          </p>
          <button
            type="button"
            onClick={() => onFilter('vehicle', s.vehicle)}
            className="text-[12px] text-pen hover:underline"
          >
            Filter by vehicle
          </button>
        </div>

        {/* Col 2 */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-ink-3 tracking-wider">
            <MapPin className="size-3.5" />
            Jurisdiction & Accident
          </span>
          <p className="text-[14px] font-semibold text-ink">
            {labelOf('country', s.country)} • {labelOf('accidentType', s.accidentType)}
          </p>
          <button
            type="button"
            onClick={() => onFilter('country', s.country)}
            className="text-[12px] text-pen hover:underline"
          >
            Filter by country
          </button>
        </div>

        {/* Col 3 */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-ink-3 tracking-wider">
            <Wind className="size-3.5" />
            Weather & Conditions
          </span>
          <p className="text-[14px] font-semibold text-ink">
            {labelOf('weather', s.weather)}
          </p>
          <span className="text-[12px] text-ink-3">Atmospheric & surface state</span>
        </div>

        {/* Col 4 */}
        <div className="space-y-1">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase text-ink-3 tracking-wider">
            <Scale className="size-3.5" />
            Claim Classification
          </span>
          <p className="text-[14px] font-semibold text-ink">
            {labelOf('claimType', s.claimType)} • {labelOf('category', s.category)}
          </p>
          <span className="text-[12px] text-ink-3">Difficulty: {labelOf('difficulty', s.difficulty)}</span>
        </div>
      </div>

      {/* Specific parties & physical damage summary */}
      {(s.damage || s.thirdParties?.length || s.claimant) && (
        <div className="mt-5 pt-4 border-t border-rule/70 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] bg-paper/60 p-3.5 rounded-lg">
          {s.damage && (
            <div>
              <strong className="font-semibold text-ink">Damage Noted on File:</strong>
              <p className="mt-0.5 text-ink-2">{s.damage}</p>
            </div>
          )}
          {s.thirdParties?.length > 0 && (
            <div>
              <strong className="font-semibold text-ink">Parties Involved:</strong>
              <p className="mt-0.5 text-ink-2">{s.thirdParties.join(', ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function questionsText(s) {
  return [`Investigation questions for scenario ${s.id}: ${s.title}`, '', ...s.questions.map((q) => `- ${q}`)].join('\n');
}

function ReferenceTab({ scenario: s, onNotify }) {
  return (
    <div className="space-y-8">
      <section className="rounded-[12px] border border-rule bg-sheet p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <IntentTag intent={s.intent} />
          <RiskBadge risk={s.risk} />
          <span className="text-[13px] text-ink-3 font-medium">Confidence: {labelOf('confidence', s.confidence)}</span>
        </div>
        <h3 className="mt-5 text-[15.5px] font-bold text-ink">Ground Truth: What Actually Happened</h3>
        <p className="mt-1.5 max-w-[78ch] text-[15px] leading-relaxed text-ink">{s.whatHappened}</p>
        <h3 className="mt-5 text-[15.5px] font-bold text-ink">Reference Assessment</h3>
        <p className="mt-1.5 max-w-[78ch] text-[15px] leading-relaxed text-ink">{s.assessment}</p>
        <h3 className="mt-5 text-[15.5px] font-bold text-ink">Recommended Handling Action</h3>
        <p className="mt-1.5 max-w-[78ch] text-[15px] leading-relaxed text-ink">{s.action}</p>
      </section>

      <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading count={s.inconsistencies.length || undefined}>Verified Inconsistencies</SectionHeading>
          <BulletList items={s.inconsistencies} empty="None. The accounts and the evidence line up." />
        </section>
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading count={s.indicators.length || undefined}>Suspicious Indicators</SectionHeading>
          <BulletList items={s.indicators} empty="None. Nothing here points to fraud." />
        </section>
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading>Plausible Innocent Explanations</SectionHeading>
          <BulletList items={s.innocent} />
        </section>
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading count={s.missing.length || undefined}>Crucial Missing Evidence</SectionHeading>
          <BulletList items={s.missing} />
        </section>
      </div>

      <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
          <SectionHeading count={s.questions.length || undefined}>Key Investigator Questions</SectionHeading>
          <CopyButton text={questionsText(s)} label="Copy questions" onCopied={() => onNotify?.('Questions copied')} />
        </div>
        <BulletList items={s.questions} />
      </section>

      <div className="grid gap-x-8 gap-y-8 md:grid-cols-2">
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading>Recommended Next Steps</SectionHeading>
          <BulletList items={s.steps} ordered />
        </section>
        <section className="rounded-[10px] border border-rule bg-sheet p-5 shadow-xs">
          <SectionHeading>Anticipated Settlement Outcomes</SectionHeading>
          <BulletList items={s.outcomes} />
        </section>
      </div>
    </div>
  );
}

export default function ScenarioDetail({
  scenario: s,
  position,
  backLabel,
  tab,
  onTab,
  onBack,
  onOpen,
  onRandom,
  onFilter,
  onCrossExamine,
  run,
  status,
  onAssess,
  onCancelAssess,
  onRestoreAssess,
  onNotify,
}) {
  const originalCaseFile = useMemo(() => scenarioCase(s), [s]);

  // Load any persisted override from localStorage, or scenario's own case, or originalCaseFile
  const [caseFile, setCaseFile] = useState(() => {
    const override = getScenarioOverride(s.id);
    return override || s.case || originalCaseFile;
  });

  // Track recent case access
  useEffect(() => {
    if (s?.id) {
      addRecentCase({
        id: s.id,
        title: s.title,
        country: s.country,
        intent: s.intent,
        risk: s.risk,
        isCustom: Boolean(s.isCustom),
      });
    }
  }, [s.id, s.title, s.country, s.intent, s.risk, s.isCustom]);

  // Re-sync when scenario changes
  useEffect(() => {
    const override = getScenarioOverride(s.id);
    setCaseFile(override || s.case || originalCaseFile);
  }, [s.id, s.case, originalCaseFile]);

  // Check if case exhibits or context have been modified compared to original predefined
  const isModified = useMemo(() => {
    if (!caseFile || !originalCaseFile) return false;
    if (caseFile.exhibits.length !== originalCaseFile.exhibits.length) return true;
    return caseFile.exhibits.some((e, i) => {
      const orig = originalCaseFile.exhibits[i];
      if (!orig) return true;
      return e.text !== orig.text || e.label !== orig.label || e.kind !== orig.kind;
    });
  }, [caseFile, originalCaseFile]);

  // Get other customised versions linked to this base scenario
  const relatedVersions = useMemo(() => {
    const all = getLocalCustomScenarios();
    const baseId = (s.baseScenarioId || s.id).toUpperCase();
    return all.filter((x) => (x.baseScenarioId || '').toUpperCase() === baseId || x.id === baseId);
  }, [s.id, s.baseScenarioId]);

  const handleCaseFileChange = (newCaseFile) => {
    setCaseFile(newCaseFile);
    setScenarioOverride(s.id, newCaseFile);
  };

  const handleSaveCustom = async () => {
    const saved = await persistScenario({
      ...s,
      title: caseFile.title || s.title,
      case: caseFile,
      baseScenarioId: s.baseScenarioId || s.id,
    });
    onNotify?.(`Customised scenario saved: ${saved.title}`);
    if (saved.id !== s.id) {
      onOpen?.(saved.id);
    }
  };

  const handleDuplicateScenario = async () => {
    const duplicated = await duplicateScenarioVersion(s, `${caseFile.title || s.title} (Copy)`);
    onNotify?.(`Duplicated as new scenario ${duplicated.id}`);
    onOpen?.(duplicated.id);
  };

  const handleResetToOriginal = () => {
    clearScenarioOverride(s.id);
    setCaseFile(originalCaseFile);
  };

  const handleSwitchVersion = (targetId) => {
    if (targetId === 'original') {
      const baseId = s.baseScenarioId || s.id;
      onOpen?.(baseId);
    } else {
      onOpen?.(targetId);
    }
  };

  const running = run?.status === 'running';
  const done = run?.status === 'done';

  const assess = () => {
    onTab('ai');
    if (!running && !done) onAssess(s, caseFile);
  };

  return (
    <main className="mx-auto max-w-[1360px] px-4 pb-20 pt-5 sm:px-6">
      {/* Top Navigation Row: Back Button & Pagination */}
      <nav aria-label="Scenario navigation" className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-ink-2 hover:text-ink font-semibold">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Button>

        <div className="flex items-center gap-1.5">
          {position && (
            <span className="tabular mr-2 text-[12.5px] font-semibold text-ink-3 bg-sheet px-2.5 py-1 rounded-md border border-rule">
              Claim {position.index + 1} of {position.total}
            </span>
          )}
          <IconButton
            label="Previous scenario"
            onClick={() => position?.prevId && onOpen(position.prevId)}
            disabled={!position?.prevId}
            className="border border-rule bg-sheet disabled:opacity-35"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Next scenario"
            onClick={() => position?.nextId && onOpen(position.nextId)}
            disabled={!position?.nextId}
            className="border border-rule bg-sheet disabled:opacity-35"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={onRandom} className="border border-rule bg-sheet">
            <Shuffle className="size-3.5" aria-hidden="true" />
            Random
          </Button>
        </div>
      </nav>

      {/* Main Case Header */}
      <header className="relative mt-2 pt-[25px]">
        <FolderTab className="absolute left-0 top-0 shadow-2xs">
          <span className="font-bold text-ink">{s.id}</span>
          <span className="ml-2 font-medium text-manila-ink/80">{labelOf('country', s.country)}</span>
          {s.isCustom && <span className="ml-2 font-bold text-pen">CUSTOM</span>}
        </FolderTab>

        <div className="rounded-[12px] rounded-tl-none border border-rule bg-sheet p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="max-w-[42ch] text-balance text-[clamp(1.5rem,2.8vw,2.1rem)] font-extrabold leading-tight tracking-[-0.02em] text-ink">
              {caseFile.title || s.title}
            </h1>
            {s.isCustom ? (
              <span className="rounded bg-pen-wash text-pen-dark border border-pen/30 px-2.5 py-0.5 text-[12px] font-bold dark:bg-pen/15 dark:text-pen">
                Customised Scenario
              </span>
            ) : isModified ? (
              <span className="rounded bg-major-wash text-major-ink border border-major/40 px-2.5 py-0.5 text-[12px] font-bold dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30">
                Modified Version
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 max-w-[76ch] text-[15.5px] leading-relaxed text-ink-2 font-normal">
            {s.type}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-ink-3 uppercase tracking-wider mr-1">
              Reference Benchmark:
            </span>
            <IntentTag intent={s.intent} />
            <RiskBadge risk={s.risk} />
            <span className="rounded bg-paper px-2 py-0.5 text-[12px] font-medium text-ink-3 border border-rule">
              Difficulty: {labelOf('difficulty', s.difficulty)}
            </span>
          </div>

          {/* Nine Facts Grid */}
          <div className="mt-5 border-t border-rule pt-4">
            <Facts scenario={s} onFilter={onFilter} />
          </div>

          {/* Action Callouts */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-rule pt-5">
            <Button size="md" onClick={assess} className="shadow-xs font-semibold">
              {running ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Scale className="size-4" aria-hidden="true" />
              )}
              {running ? 'Assessment Running…' : done ? 'View AI Assessment' : 'Assess with AI'}
            </Button>
            <Button variant="secondary" size="md" onClick={() => onCrossExamine(caseFile)} className="shadow-xs font-semibold">
              <ScanSearch className="size-4" aria-hidden="true" />
              Cross-examine Statements
            </Button>
            <span className="text-[13px] text-ink-3 ml-1">
              Evaluates all {caseFile.exhibits.length} exhibits for contradictions and timeline alignment.
            </span>
          </div>
        </div>
      </header>

      {/* Structured Case Overview Section */}
      <div className="mt-6">
        <CaseOverviewPanel scenario={s} onFilter={onFilter} />
      </div>

      {/* Navigation Tabs */}
      <div role="tablist" aria-label="Scenario tabs" className="mt-8 flex gap-1 overflow-x-auto border-b border-rule scrollbar-thin">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`scenario-tab-${t.id}`}
            aria-label={t.label}
            aria-selected={tab === t.id}
            aria-controls={`scenario-panel-${t.id}`}
            onClick={() => onTab(t.id)}
            className={cx(
              '-mb-px inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-4 text-[14.5px] font-bold transition-all',
              tab === t.id
                ? 'border-pen text-pen bg-sheet/50'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-rule-strong',
            )}
          >
            {t.label}
            {t.id === 'ai' && running && <LoaderCircle className="size-3.5 animate-spin text-pen" aria-label="running" />}
            {t.id === 'case' && (
              <span
                className={cx(
                  'tabular rounded-full px-2 py-0.5 text-[11px] font-bold',
                  tab === t.id ? 'bg-pen text-white' : 'bg-ink/[0.08] text-ink-2',
                )}
              >
                {caseFile.exhibits.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`scenario-panel-${tab}`} aria-labelledby={`scenario-tab-${tab}`} className="pt-6">
        {tab === 'case' && (
          <div className="space-y-8">
            <ScenarioCaseFile
              scenario={s}
              caseFile={caseFile}
              originalCaseFile={originalCaseFile}
              isModified={isModified}
              isCustom={Boolean(s.isCustom)}
              versions={relatedVersions}
              onChangeCaseFile={handleCaseFileChange}
              onSaveScenario={handleSaveCustom}
              onDuplicateScenario={handleDuplicateScenario}
              onResetToOriginal={handleResetToOriginal}
              onSwitchVersion={handleSwitchVersion}
              onNotify={onNotify}
            />
            {/* Visual Evidence Relationship Matrix */}
            <EvidenceConnections exhibits={caseFile.exhibits} />
          </div>
        )}

        {tab === 'timeline' && (
          <div className="space-y-6">
            <InvestigationTimeline
              exhibits={caseFile.exhibits}
              onSelectExhibit={(idx) => {
                onTab('case');
                setTimeout(() => {
                  const id = EXHIBIT_IDS[idx];
                  const el = document.getElementById(`exhibit-${id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-pen');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-pen'), 1500);
                  }
                }, 120);
              }}
            />
          </div>
        )}

        {tab === 'ai' && (
          <ScenarioAssessment
            scenario={s}
            run={run}
            status={status}
            onAssess={() => onAssess(s, caseFile)}
            onCancel={onCancelAssess}
            onRestore={onRestoreAssess}
            onNotify={onNotify}
            onSelectExhibit={(exhibitId) => {
              onTab('case');
              setTimeout(() => {
                const el = document.getElementById(`exhibit-${exhibitId}`);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('ring-2', 'ring-pen');
                  setTimeout(() => el.classList.remove('ring-2', 'ring-pen'), 1500);
                }
              }, 120);
            }}
          />
        )}

        {tab === 'reference' && <ReferenceTab scenario={s} onNotify={onNotify} />}
      </div>
    </main>
  );
}
