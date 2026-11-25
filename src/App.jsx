import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { EXHIBIT_IDS, LIMITS } from '../shared/constants.js';
import { queryScenarios, randomScenario } from '../shared/scenarios/query.js';
import { cleanText } from '../shared/validate.js';
import { SAMPLE_CASES } from './data/samples.js';
import { getLocalCustomScenarios } from './lib/customScenarios.js';
import { getRecentCases, addRecentCase } from './lib/recentCases.js';
import { loadLibrary } from './lib/scenarios.js';
import { analyze, assessScenario, getStatus, isArtifact } from './lib/transport.js';
import { marksByExhibit } from './lib/segments.js';
import { combineExhibitText } from '../shared/evidence-combine.js';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import CaseFile from './components/CaseFile.jsx';
import EvidencePreviewModal from './components/EvidencePreviewModal.jsx';
import Landing from './components/Landing.jsx';
import RecentCasesDrawer from './components/RecentCasesDrawer.jsx';
import ScenarioDetail from './components/ScenarioDetail.jsx';
import ScenarioLibrary, { PAGE_SIZE } from './components/ScenarioLibrary.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Sidebar from './components/Sidebar.jsx';
import LegalLibraryHub from './components/RegulatoryLibrary/LegalLibraryHub.jsx';
import RegulatoryLibraryView from './components/RegulatoryLibrary/RegulatoryLibraryView.jsx';
import JurisdictionCompareModal from './components/RegulatoryLibrary/JurisdictionCompareModal.jsx';
import FaultLineIntelligence from './components/Intelligence/FaultLineIntelligence.jsx';
import FaultLineMiniChat from './components/Intelligence/FaultLineMiniChat.jsx';
import InteractiveParticleNetwork from './components/InteractiveParticleNetwork.jsx';
import FaultLineCloudCompanion from './components/Companion/FaultLineCloudCompanion.jsx';
import Toast from './components/Toast.jsx';
import TopBar from './components/TopBar.jsx';
import { Button } from './components/ui.jsx';

let keySeq = 0;
const nextKey = () => `ex-${(keySeq += 1)}`;
const withKeys = (exhibits) =>
  exhibits.map((e) => ({
    key: nextKey(),
    label: e.label ?? '',
    kind: e.kind ?? 'statement',
    text: e.text ?? '',
    attachments: e.attachments ? [...e.attachments] : [],
  }));
const labelFor = (exhibit, i) => exhibit.label.trim() || `Exhibit ${EXHIBIT_IDS[i]}`;

// The first thing stopping this case from running, in plain words; null when it can run.
function draftProblem({ exhibits, context }) {
  if (exhibits.length < LIMITS.minExhibits) return 'Add at least two exhibits.';
  for (const [i, e] of exhibits.entries()) {
    const readyAttachments = (e.attachments || []).filter((a) => a.status === 'ready');
    const combined = combineExhibitText(e.text, e.attachments, EXHIBIT_IDS[i], e.label);
    const length = cleanText(combined).length;
    if (!length && !readyAttachments.length) return `Paste text or attach files for exhibit ${EXHIBIT_IDS[i]}.`;
    if (length < LIMITS.minChars) return `Exhibit ${EXHIBIT_IDS[i]} needs at least a couple of sentences.`;
    if (length > LIMITS.maxChars) return `Exhibit ${EXHIBIT_IDS[i]} is over ${LIMITS.maxChars.toLocaleString()} characters.`;
  }
  const total = exhibits.reduce((n, e, i) => n + cleanText(combineExhibitText(e.text, e.attachments, EXHIBIT_IDS[i], e.label)).length, 0);
  if (total > LIMITS.maxTotalChars) return `Together the exhibits are over ${LIMITS.maxTotalChars.toLocaleString()} characters.`;
  if (cleanText(context).length > LIMITS.maxContextChars) return 'Shorten the case context.';
  return null;
}

// Each screen has its own address, so the browser's Back and Forward buttons move between them:
// #/scenarios is the library, #/scenarios/UK-001 a scenario, #/legal-library the regulatory hub, #/legal-library/:country country regulations, #/case the case workspace.
const SCENARIO_HASH = /^#\/scenarios\/([A-Za-z0-9_-]+)\/?$/;
const LEGAL_LIBRARY_HASH = /^#(?:(?:\/legal-library)|(?:\/regulations))(?:\/([A-Za-z0-9_-]+))?\/?$/;

function routeFromHash(hash) {
  const [pathPart, queryPart] = (hash || '').split('?');
  const params = new URLSearchParams(queryPart || '');
  const tab = params.get('tab') || null;
  const filter = params.get('filter') || null;

  const m = SCENARIO_HASH.exec(pathPart);
  if (m) return { view: 'scenario', id: m[1].toUpperCase(), tab, filter };
  const regM = LEGAL_LIBRARY_HASH.exec(pathPart);
  if (regM) {
    const country = regM[1] ? regM[1].toUpperCase() : null;
    return { view: 'legal-library', country, tab, filter };
  }
  if (pathPart === '#/scenarios' || pathPart === '#/scenarios/') return { view: 'library' };
  if (pathPart === '#/intelligence' || pathPart === '#/chat') return { view: 'intelligence' };
  if (pathPart === '#/case' || pathPart === '#/workspace') return { view: 'workspace', tab, filter };
  return { view: 'landing' };
}

function urlFor({ view, id, country, tab, filter }) {
  const params = new URLSearchParams();
  if (tab) params.set('tab', tab);
  if (filter) params.set('filter', filter);
  const qs = params.toString() ? `?${params.toString()}` : '';

  if (view === 'scenario') return `#/scenarios/${id}${qs}`;
  if (view === 'library') return '#/scenarios';
  if (view === 'intelligence' || view === 'chat') return '#/intelligence';
  if (view === 'legal-library' || view === 'regulations') {
    return country ? `#/legal-library/${country}` : '#/legal-library';
  }
  if (view === 'workspace') return `#/case${qs}`;
  return window.location.pathname + window.location.search;
}

function writeHistory(route, replace = false) {
  try {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', urlFor(route));
  } catch {
    // Some sandboxed frames refuse history changes. The in-app buttons still work.
  }
}

const DRAFT_KEY = 'faultline_workspace_case_draft';

function loadSavedDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.exhibits) && parsed.exhibits.length > 0) {
      return parsed;
    }
  } catch {}
  return null;
}

// Automatically preserve and restore workspace case drafts across reloads
function initialRoute() {
  const route = routeFromHash(window.location.hash);
  if (route.view === 'workspace') {
    const draft = loadSavedDraft();
    if (draft) return { view: 'workspace', draft, tab: route.tab, filter: route.filter };
    return { view: 'landing' };
  }
  return route;
}

const EMPTY_QUERY = { q: '', filters: {}, sort: 'relevance', shown: PAGE_SIZE };

// A scenario address that doesn't resolve yet: still loading, failed to load, or an unknown id.
function ScenarioMissing({ id, loading, failed, onRetry, onLibrary }) {
  return (
    <main className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8">
      {loading ? (
        <p className="flex items-center gap-3 text-ink-2">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Loading scenario {id}…
        </p>
      ) : (
        <>
          <h1 className="text-[22px] font-bold">{failed ? 'The scenario library didn’t load' : `There’s no scenario ${id}`}</h1>
          <p className="mt-2 text-[15.5px] text-ink-2">
            {failed ? 'Check your connection, then try again.' : 'Scenario IDs look like UK-001 or IN-014. Pick one from the library.'}
          </p>
          <div className="mt-5 flex gap-2.5">
            {failed && <Button onClick={onRetry}>Try again</Button>}
            <Button variant={failed ? 'secondary' : 'primary'} onClick={onLibrary}>
              Open the scenario library
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

export default function App() {
  const init = useMemo(() => initialRoute(), []);
  const [view, setView] = useState(() => init.view);
  const [scenarioId, setScenarioId] = useState(() => init.id ?? null);
  const [caseFile, setCaseFile] = useState(() => init.draft || { title: '', context: '', exhibits: [] });

  // Auto-save active workspace case draft to prevent data loss on refresh
  useEffect(() => {
    if (view === 'workspace' && caseFile.exhibits?.length > 0) {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(caseFile));
      } catch {}
    }
  }, [view, caseFile]);
  const [run, setRun] = useState({ status: 'idle' });
  const [review, setReview] = useState({});
  const [tab, setTab] = useState(() => init.tab || 'conflicts');
  const [activeFilter, setActiveFilter] = useState(() => init.filter || null);
  const [activeRef, setActiveRef] = useState(null);
  const [scrollTarget, setScrollTarget] = useState(null);
  const [focus, setFocus] = useState(null);
  const [editing, setEditing] = useState({});
  const [status, setStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const controllerRef = useRef(null);

  // Global Cloud Companion & Floating Mini Chat states
  const [miniChatOpen, setMiniChatOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('testMiniChat');
    } catch {
      return false;
    }
  });
  const [intelligenceThinking, setIntelligenceThinking] = useState(false);
  const [companionVisible, setCompanionVisible] = useState(() => {
    try {
      return localStorage.getItem('faultline_show_codex') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleVis = (e) => {
      if (e.detail && typeof e.detail.visible === 'boolean') {
        setCompanionVisible(e.detail.visible);
      }
    };
    window.addEventListener('faultline-companion-visibility', handleVis);
    return () => window.removeEventListener('faultline-companion-visibility', handleVis);
  }, []);

  // Layout & drawer state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('faultline_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recentCasesOpen, setRecentCasesOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.location.search.includes('testRecentDrawer');
    } catch {
      return false;
    }
  });
  const [recentCases, setRecentCases] = useState(() => getRecentCases());

  // Regulatory Library state
  const [regulatoryCountry, setRegulatoryCountry] = useState(() => init.country || null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareCountries, setCompareCountries] = useState(['UK', 'US', 'IN']);

  // The scenario library: loaded on first use, with its search, filters and AI assessments kept
  // while you move between screens.
  const [library, setLibrary] = useState(null);
  const [libraryFailed, setLibraryFailed] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState(EMPTY_QUERY);
  const [scenarioTab, setScenarioTab] = useState('case');
  const [assessments, setAssessments] = useState({});
  const assessControllers = useRef(new Map());

  // Which model the server is set up for. Re-checked when the window regains focus and after
  // each run, so the pill updates as soon as a key is added to .env (no restart needed).
  const refreshStatus = useCallback(() => {
    getStatus().then(setStatus);
  }, []);
  useEffect(() => {
    refreshStatus();
    window.addEventListener('focus', refreshStatus);
    return () => window.removeEventListener('focus', refreshStatus);
  }, [refreshStatus]);

  const currentScenario =
    view === 'scenario' && scenarioId
      ? (library?.byId.get(scenarioId) ?? getLocalCustomScenarios().find((s) => s.id === scenarioId) ?? null)
      : null;

  // Track recent investigations automatically
  useEffect(() => {
    if (view === 'scenario' && currentScenario) {
      addRecentCase(currentScenario);
      setRecentCases(getRecentCases());
    }
  }, [view, currentScenario]);

  useEffect(() => {
    document.title =
      view === 'workspace'
        ? `${caseFile.title || 'Untitled case'} – FaultLine`
        : view === 'library'
          ? 'Motor claims scenario library – FaultLine'
          : view === 'legal-library' || view === 'regulations'
            ? regulatoryCountry
              ? `${regulatoryCountry} Motor Insurance Laws & Regulations – FaultLine`
              : 'Legal & Regulatory Library – FaultLine'
            : view === 'scenario' && currentScenario
              ? `${currentScenario.id}: ${currentScenario.title} – FaultLine`
              : "FaultLine: find where the stories don't line up";
  }, [view, caseFile.title, currentScenario, regulatoryCountry]);

  // Moving between screens. The library remembers how far down you were; every other screen
  // opens at the top.
  const viewRef = useRef(view);
  viewRef.current = view;
  const caseRef = useRef(caseFile);
  caseRef.current = caseFile;
  const libraryScroll = useRef(0);
  const pendingScroll = useRef(null);

  const show = useCallback((route) => {
    if (viewRef.current === 'library') libraryScroll.current = window.scrollY;
    pendingScroll.current = route.view === 'library' ? libraryScroll.current : 0;
    setView(route.view);
    if (route.id) setScenarioId(route.id);
    if (route.tab) setTab(route.tab);
    if (route.filter !== undefined) setActiveFilter(route.filter);
    setRegulatoryCountry(route.country || null);
  }, []);

  const navigate = useCallback(
    (route, { replace = false } = {}) => {
      show(route);
      writeHistory(route, replace);
    },
    [show],
  );

  useEffect(() => {
    if (pendingScroll.current === null) return;
    const top = pendingScroll.current;
    pendingScroll.current = null;
    window.scrollTo({ top });
  }, [view, scenarioId]);

  useEffect(() => {
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      // Not supported here; the browser restores scroll on its own.
    }
    if (window.location.hash === '#/case' && !loadSavedDraft()) writeHistory({ view: 'landing' }, true);
    const onPop = () => {
      let route = routeFromHash(window.location.hash);
      if (route.view === 'workspace' && !caseRef.current.exhibits.length) {
        const draft = loadSavedDraft();
        if (draft) setCaseFile(draft);
        else route = { view: 'landing' };
      }
      show(route);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show]);

  const ensureLibrary = useCallback(() => {
    setLibraryFailed(false);
    loadLibrary().then(setLibrary, () => setLibraryFailed(true));
  }, []);
  useEffect(() => {
    if (view === 'library' || view === 'scenario' || view === 'legal-library' || view === 'regulations') {
      ensureLibrary();
    }
  }, [view, ensureLibrary]);

  // Pre-calculate country claim counts across scenarios
  const countryCounts = useMemo(() => {
    const map = new Map();
    for (const s of library?.scenarios ?? []) {
      map.set(s.country, (map.get(s.country) ?? 0) + 1);
    }
    return map;
  }, [library]);

  // On the start page, load the library in the background once the browser is idle, so its
  // counts show and opening it is instant.
  useEffect(() => {
    if (view !== 'landing' || library) return undefined;
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200));
    const cancel = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => loadLibrary().then(setLibrary, () => {}));
    return () => cancel(handle);
  }, [view, library]);

  // A different scenario opens on its case file.
  useEffect(() => {
    setScenarioTab('case');
  }, [scenarioId]);

  // On narrow screens the analysis sits below the exhibits: bring it into view when it starts and ends.
  const analysisRef = useRef(null);
  useEffect(() => {
    if ((run.status === 'running' || run.status === 'done' || run.status === 'error') && window.innerWidth < 1024) {
      analysisRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [run.status]);

  const notify = useCallback((message) => setToast({ message, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('faultline_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const resetAnalysis = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setRun({ status: 'idle' });
    setReview({});
    setActiveRef(null);
    setScrollTarget(null);
    setFocus(null);
    setEditing({});
    setTab('conflicts');
    setActiveFilter(null);
  };

  const handleNavigateMetric = useCallback(
    (metric) => {
      let targetTab = 'conflicts';
      let targetFilter = null;
      if (metric === 'supporting') {
        targetTab = 'agreed';
        targetFilter = 'supporting';
      } else if (metric === 'unresolved') {
        targetTab = 'gaps';
        targetFilter = 'unresolved';
      } else if (metric === 'conflicts') {
        targetTab = 'conflicts';
        targetFilter = null;
      }
      setTab(targetTab);
      setActiveFilter(targetFilter);
      navigate({ view: 'workspace', tab: targetTab, filter: targetFilter });
    },
    [navigate],
  );

  const handleClearFilter = useCallback(() => {
    setActiveFilter(null);
    navigate({ view: 'workspace', tab });
  }, [navigate, tab]);

  const openCase = (c) => {
    resetAnalysis();
    setCaseFile({ title: c.title, context: c.context ?? '', exhibits: withKeys(c.exhibits), scenarioId: c.scenarioId ?? null });
    navigate({ view: 'workspace' });
  };
  const openBlank = () => openCase({ title: '', context: '', exhibits: [{ kind: 'statement' }, { kind: 'witness' }] });
  const goHome = () => {
    resetAnalysis();
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    navigate({ view: 'landing' });
  };

  const handleGoLegalLibrary = useCallback(
    (country = null) => {
      setRegulatoryCountry(country);
      navigate({ view: 'legal-library', country });
    },
    [navigate],
  );
  const handleGoRegulations = handleGoLegalLibrary;

  // ---- Scenario library ----

  const libraryResult = useMemo(() => (library ? queryScenarios(library.scenarios, libraryQuery) : null), [library, libraryQuery]);
  const queryActive = Boolean(libraryQuery.q.trim()) || Object.values(libraryQuery.filters).some((v) => v?.length);
  const updateQuery = useCallback((patch) => setLibraryQuery((q) => ({ ...q, ...patch })), []);

  const openLibrary = (query) => {
    if (query) {
      setLibraryQuery({ ...EMPTY_QUERY, ...query });
      libraryScroll.current = 0;
    }
    // Already on the library: go back to the top instead of adding another history entry.
    if (viewRef.current === 'library') {
      window.scrollTo({ top: 0 });
      return;
    }
    navigate({ view: 'library' });
  };
  const openScenario = useCallback((id) => navigate({ view: 'scenario', id }), [navigate]);

  const handleGoSavedScenarios = () => {
    const customList = getLocalCustomScenarios();
    if (customList.length === 0) {
      notify('No custom scenarios created yet. Open any scenario and click "Customise" to edit it.');
      openLibrary();
    } else {
      openLibrary({ q: 'custom' });
    }
  };

  const customCount = useMemo(() => {
    return getLocalCustomScenarios().length;
  }, [library, view]);

  // Random picks come from the current results, or from the whole library when there is nothing else to pick.
  const openRandom = (pool, exclude) => {
    const list = pool?.length > 1 || (pool?.length === 1 && pool[0].id !== exclude) ? pool : (library?.scenarios ?? []);
    const pick = randomScenario(list, { exclude });
    if (pick) openScenario(pick.id);
  };
  const openRandomFromAnywhere = () => {
    if (library) openRandom(library.scenarios);
    else loadLibrary().then((lib) => {
      setLibrary(lib);
      const pick = randomScenario(lib.scenarios);
      if (pick) openScenario(pick.id);
    }, () => setLibraryFailed(true));
  };

  // Where the open scenario sits in the current results, for previous and next.
  const position = useMemo(() => {
    if (!library || !currentScenario) return null;
    let list = libraryResult?.items ?? library.scenarios;
    let index = list.findIndex((s) => s.id === currentScenario.id);
    if (index === -1) {
      list = library.scenarios;
      index = list.findIndex((s) => s.id === currentScenario.id);
    }
    return { index, total: list.length, prevId: list[index - 1]?.id ?? null, nextId: list[index + 1]?.id ?? null };
  }, [library, libraryResult, currentScenario]);

  // Dynamic Breadcrumb Trail
  const breadcrumbs = useMemo(() => {
    if (view === 'landing') {
      return [{ label: 'Dashboard', current: true }];
    }
    if (view === 'library') {
      return [
        { label: 'Home', onClick: goHome },
        { label: 'Scenario Library', current: true },
      ];
    }
    if (view === 'legal-library' || view === 'regulations') {
      if (regulatoryCountry) {
        return [
          { label: 'Home', onClick: goHome },
          { label: 'Legal & Regulatory Library', onClick: () => handleGoLegalLibrary(null) },
          { label: `${regulatoryCountry} Regulations`, current: true },
        ];
      }
      return [
        { label: 'Home', onClick: goHome },
        { label: 'Legal & Regulatory Library', current: true },
      ];
    }
    if (view === 'scenario') {
      return [
        { label: 'Home', onClick: goHome },
        { label: 'Scenario Library', onClick: () => openLibrary() },
        { label: currentScenario?.id || scenarioId || 'Case', onClick: () => openScenario(scenarioId) },
        { label: currentScenario?.title || 'Case Overview', current: true },
      ];
    }
    if (view === 'workspace') {
      if (caseFile.scenarioId) {
        return [
          { label: 'Home', onClick: goHome },
          { label: 'Scenario Library', onClick: () => openLibrary() },
          { label: caseFile.scenarioId, onClick: () => openScenario(caseFile.scenarioId) },
          { label: 'Cross-Examination Workspace', current: true },
        ];
      }
      return [
        { label: 'Home', onClick: goHome },
        { label: 'New Investigation', current: true },
      ];
    }
    return [];
  }, [view, scenarioId, currentScenario, caseFile.scenarioId]);

  const runAssessment = async (scenario, customCase) => {
    const { id } = scenario;
    if (assessControllers.current.has(id)) return;
    const controller = new AbortController();
    assessControllers.current.set(id, controller);
    const isCurrent = () => assessControllers.current.get(id) === controller;
    const before = assessments[id];
    const previous = before?.status === 'done' ? before : (before?.previous ?? null);
    setAssessments((m) => ({ ...m, [id]: { status: 'running', startedAt: Date.now(), progress: { stage: 0, counts: {}, reasoning: '' }, previous } }));
    try {
      const result = await assessScenario(scenario, {
        signal: controller.signal,
        customCase,
        onProgress: (progress) => setAssessments((m) => (isCurrent() && m[id]?.status === 'running' ? { ...m, [id]: { ...m[id], progress } } : m)),
      });
      if (!isCurrent()) return;
      setAssessments((m) => ({ ...m, [id]: { status: 'done', result } }));
    } catch (err) {
      if (controller.signal.aborted || !isCurrent()) return;
      setAssessments((m) => ({
        ...m,
        [id]: { status: 'error', error: { code: err?.code || 'UNKNOWN', message: err?.message || 'Something went wrong.' }, previous },
      }));
    } finally {
      if (isCurrent()) assessControllers.current.delete(id);
      refreshStatus();
    }
  };

  // Stop goes back to the last finished assessment of this scenario, if there was one.
  const restoreAssessment = (id) =>
    setAssessments((m) => {
      const next = { ...m };
      if (m[id]?.previous) next[id] = m[id].previous;
      else delete next[id];
      return next;
    });
  const cancelAssessment = (id) => {
    const controller = assessControllers.current.get(id);
    if (!controller) return;
    assessControllers.current.delete(id);
    controller.abort();
    restoreAssessment(id);
    notify('Assessment stopped');
  };

  const problem = useMemo(() => draftProblem(caseFile), [caseFile]);
  const result = run.status === 'done' ? run.result : null;
  const marks = useMemo(() => marksByExhibit(result, review), [result, review]);

  const allAttachments = useMemo(() => {
    return caseFile.exhibits.flatMap((e) => e.attachments || []);
  }, [caseFile.exhibits]);

  const handlePreviewAttachment = useCallback((attachment, exhibitId, exhibitLabel, page, sheet, cell) => {
    setPreviewTarget({
      attachment,
      exhibitLabel: exhibitLabel ? (exhibitLabel.startsWith('Exhibit') ? exhibitLabel : `Exhibit ${exhibitId} — ${exhibitLabel}`) : `Exhibit ${exhibitId}`,
      initialPage: page || 1,
      initialSheet: sheet || null,
      initialCell: cell || null,
    });
  }, []);

  // Highlights only show on exhibits whose text is unchanged since the analysis ran.
  const views = useMemo(() => {
    const out = {};
    caseFile.exhibits.forEach((e, i) => {
      const snap = run.snapshot?.[i];
      const id = EXHIBIT_IDS[i];
      const combined = cleanText(combineExhibitText(e.text, e.attachments, id, labelFor(e, i)));
      const unchanged = Boolean(result && snap && snap.key === e.key && combined === snap.text);
      out[e.key] = {
        marks: unchanged ? (marks[id] ?? []) : [],
        annotated: unchanged && !editing[e.key] ? snap.text : null,
        canShowHighlights: unchanged && Boolean(editing[e.key]),
      };
    });
    return out;
  }, [caseFile.exhibits, run.snapshot, result, marks, editing]);

  const stale = useMemo(() => {
    if (run.status !== 'done') return false;
    const snap = run.snapshot;
    if (snap.length !== caseFile.exhibits.length || cleanText(caseFile.context) !== run.context) return true;
    return caseFile.exhibits.some((e, i) => {
      const s = snap[i];
      if (!s) return true;
      const combined = cleanText(combineExhibitText(e.text, e.attachments, EXHIBIT_IDS[i], labelFor(e, i)));
      if (e.key !== s.key || combined !== s.text || e.kind !== s.kind || labelFor(e, i) !== s.label) return true;
      const eAtts = (e.attachments || []).map((a) => a.id).join(',');
      const sAtts = (s.attachments || []).map((a) => a.id).join(',');
      return eAtts !== sAtts;
    });
  }, [run, caseFile]);

  const runAnalysis = async () => {
    if (problem || run.status === 'running') return;
    const snapshot = caseFile.exhibits.map((e, i) => {
      const id = EXHIBIT_IDS[i];
      const label = labelFor(e, i);
      const combined = combineExhibitText(e.text, e.attachments, id, label);
      return {
        key: e.key,
        id,
        label,
        kind: e.kind,
        rawText: cleanText(e.text),
        text: cleanText(combined),
        attachments: e.attachments ? [...e.attachments] : [],
      };
    });
    const context = cleanText(caseFile.context);
    const controller = new AbortController();
    controllerRef.current = controller;
    // Keep the last good result so Stop, or a failed retry, can go back to it.
    const previous = run.status === 'done' ? { ...run, review } : (run.previous ?? null);

    setRun({
      status: 'running',
      progress: { stage: 0, events: 0, conflicts: [], agreed: 0, reasoning: '' },
      startedAt: Date.now(),
      snapshot,
      context,
      previous,
    });
    setEditing({});
    setActiveRef(null);
    setScrollTarget(null);
    setFocus(null);

    try {
      const out = await analyze(
        { context, sources: snapshot.map(({ label, kind, text }) => ({ label, kind, text })) },
        {
          signal: controller.signal,
          onProgress: (progress) => setRun((r) => (r.status === 'running' && controllerRef.current === controller ? { ...r, progress } : r)),
        },
      );
      if (controllerRef.current !== controller) return;
      setRun({ status: 'done', result: out, snapshot, context });
      setReview({});
      setTab('conflicts');
    } catch (err) {
      if (controller.signal.aborted || controllerRef.current !== controller) return;
      setRun({
        status: 'error',
        error: { code: err?.code || 'UNKNOWN', message: err?.message || 'Something went wrong.', retryable: err?.retryable },
        snapshot,
        context,
        previous,
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      refreshStatus();
    }
  };

  // Back to the last good result (after Stop, or from an error), with its review decisions.
  const restorePrevious = (previous) => {
    if (previous) {
      const { review: savedReview = {}, ...rest } = previous;
      setRun(rest);
      setReview(savedReview);
    } else {
      setRun({ status: 'idle' });
    }
  };

  const cancelRun = () => {
    const controller = controllerRef.current;
    if (!controller) return;
    controllerRef.current = null;
    controller.abort();
    restorePrevious(run.previous);
    notify('Analysis stopped');
  };

  // Ctrl/Cmd + Enter runs the analysis from anywhere in the workspace.
  const runRef = useRef(runAnalysis);
  runRef.current = runAnalysis;
  useEffect(() => {
    if (view !== 'workspace') return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view]);

  // Selecting a finding from a highlight, the fault line or the timeline opens it and scrolls to it.
  const selectRef = (ref) => {
    if (!ref) return;
    setTab(ref.startsWith('K') ? 'agreed' : 'conflicts');
    setActiveRef(ref);
    setScrollTarget({ ref, nonce: Date.now() });
  };

  const showEvidence = (evidence, ref) => {
    const exhibit = caseFile.exhibits[EXHIBIT_IDS.indexOf(evidence.exhibit)];
    if (exhibit) setEditing((m) => ({ ...m, [exhibit.key]: false }));
    setActiveRef(ref);
    setFocus({ exhibitId: evidence.exhibit, start: evidence.match.start, end: evidence.match.end, nonce: Date.now() });
  };

  const setReviewState = (id, state) =>
    setReview((r) => {
      const next = { ...r };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });

  return (
    <div className="relative flex min-h-dvh bg-paper text-ink overflow-x-hidden">
      {/* Global Enterprise Interactive Particle Intelligence Atmosphere */}
      <InteractiveParticleNetwork
        view={view}
        activeTab={view === 'workspace' ? tab : null}
        density="standard"
        isAnalyzing={run.status === 'running'}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Modern Collapsible Sidebar */}
      <Sidebar
        view={view}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onGoHome={goHome}
        onGoLibrary={() => openLibrary()}
        onGoRegulations={() => handleGoLegalLibrary(null)}
        onGoIntelligence={() => navigate({ view: 'intelligence' })}
        onGoSavedScenarios={handleGoSavedScenarios}
        onNewCase={openBlank}
        onOpenRecent={() => setRecentCasesOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        libraryCount={library?.scenarios?.length ?? 266}
        customCount={customCount}
        recentCount={recentCases.length}
        status={status}
      />

      {/* Main Viewport Container */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 bg-transparent">
        <TopBar
          view={view}
          title={caseFile.title}
          onTitleChange={(title) => setCaseFile((c) => ({ ...c, title }))}
          breadcrumbs={breadcrumbs}
          onHome={goHome}
          onNewCase={openBlank}
          onOpenRecent={() => setRecentCasesOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((o) => !o)}
          backToScenario={
            view === 'workspace' && caseFile.scenarioId
              ? { id: caseFile.scenarioId, onClick: () => openScenario(caseFile.scenarioId) }
              : null
          }
          status={status}
        />

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {view === 'landing' ? (
            <Landing
              samples={SAMPLE_CASES}
              onOpenSample={openCase}
              onBlank={openBlank}
              library={library}
              onBrowse={(query) => openLibrary(query ?? EMPTY_QUERY)}
              onRandom={openRandomFromAnywhere}
              onSaved={handleGoSavedScenarios}
              onOpenCountryLibrary={(code) => handleGoRegulations(code)}
              onOpenCompare={(codes) => {
                setCompareCountries(codes);
                setCompareModalOpen(true);
              }}
              onOpenIntelligence={() => navigate({ view: 'intelligence' })}
            />
          ) : view === 'library' ? (
            <ScenarioLibrary
              scenarios={library?.scenarios ?? null}
              failed={libraryFailed}
              onRetry={ensureLibrary}
              query={libraryQuery}
              onQuery={updateQuery}
              onOpen={openScenario}
              onRandom={(items) => openRandom(items)}
              onNotify={notify}
            />
          ) : view === 'scenario' ? (
            currentScenario ? (
              <ScenarioDetail
                scenario={currentScenario}
                position={position}
                backLabel={queryActive ? 'Back to results' : 'All scenarios'}
                tab={scenarioTab}
                onTab={setScenarioTab}
                onBack={() => openLibrary()}
                onOpen={openScenario}
                onRandom={() => openRandom(libraryResult?.items, currentScenario.id)}
                onFilter={(key, value) => openLibrary({ filters: { [key]: [value] } })}
                onCrossExamine={openCase}
                run={assessments[currentScenario.id]}
                status={status}
                onAssess={(scen, cCase) => runAssessment(scen || currentScenario, cCase)}
                onCancelAssess={() => cancelAssessment(currentScenario.id)}
                onRestoreAssess={() => restoreAssessment(currentScenario.id)}
                onNotify={notify}
              />
            ) : (
              <ScenarioMissing
                id={scenarioId}
                loading={!library && !libraryFailed}
                failed={libraryFailed}
                onRetry={ensureLibrary}
                onLibrary={() => openLibrary()}
              />
            )
          ) : (view === 'legal-library' || view === 'regulations') ? (
            regulatoryCountry ? (
              <RegulatoryLibraryView
                countryCode={regulatoryCountry}
                onBack={() => handleGoLegalLibrary(null)}
                onBrowseClaims={(query) => openLibrary(query ?? EMPTY_QUERY)}
                onSelectCountry={(c) => {
                  setRegulatoryCountry(c);
                  navigate({ view: 'legal-library', country: c });
                }}
              />
            ) : (
              <LegalLibraryHub
                countryCounts={countryCounts}
                onOpenCountry={(code) => handleGoLegalLibrary(code)}
                onBrowseClaims={(query) => openLibrary(query ?? EMPTY_QUERY)}
              />
            )
          ) : (view === 'intelligence' || view === 'chat') ? (
            <FaultLineIntelligence
              activeCaseId={currentScenario?.id || caseFile?.scenarioId || null}
              caseFile={caseFile}
              onNavigateToCase={() => navigate({ view: 'workspace' })}
              onNavigateToLibrary={() => openLibrary()}
              onNavigateToLegal={() => handleGoLegalLibrary(null)}
              onThinkingChange={setIntelligenceThinking}
            />
          ) : (
            <main className="mx-auto w-full max-w-[1720px] lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(380px,1fr)_minmax(0,1.3fr)] xl:grid-cols-[minmax(420px,1fr)_minmax(0,1.4fr)]">
              <div className="scrollbar-thin px-4 pt-6 sm:px-6 lg:overflow-y-auto lg:border-r lg:border-rule lg:pt-8">
                <CaseFile
                  caseFile={caseFile}
                  onChange={setCaseFile}
                  views={views}
                  activeRef={activeRef}
                  onSelectRef={selectRef}
                  focus={focus}
                  onEditExhibit={(key) => setEditing((m) => ({ ...m, [key]: true }))}
                  onShowHighlights={(key) => setEditing((m) => ({ ...m, [key]: false }))}
                  running={run.status === 'running'}
                  problem={problem}
                  stale={stale}
                  onRun={runAnalysis}
                  onCancel={cancelRun}
                  onPreviewAttachment={handlePreviewAttachment}
                />
              </div>
              <div
                ref={analysisRef}
                className="scrollbar-thin scroll-mt-16 border-t border-rule bg-sheet px-4 py-8 sm:px-6 lg:overflow-y-auto lg:border-t-0 lg:px-9"
              >
                <AnalysisPanel
                  run={run}
                  exhibitCount={caseFile.exhibits.length}
                  problem={problem}
                  status={status}
                  artifact={isArtifact}
                  onRun={runAnalysis}
                  onCancel={cancelRun}
                  onRestore={run.previous ? () => restorePrevious(run.previous) : null}
                  title={caseFile.title}
                  context={cleanText(caseFile.context)}
                  review={review}
                  onReview={setReviewState}
                  tab={tab}
                  onTab={setTab}
                  activeRef={activeRef}
                  scrollTarget={scrollTarget}
                  onSelect={selectRef}
                  onShowEvidence={showEvidence}
                  stale={stale}
                  onNotify={notify}
                  onPreviewAttachment={handlePreviewAttachment}
                  allAttachments={allAttachments}
                  onOpenCountryLibrary={(code) => handleGoRegulations(code)}
                  activeFilter={activeFilter}
                  onClearFilter={handleClearFilter}
                  onNavigateMetric={handleNavigateMetric}
                />
              </div>
            </main>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <SettingsModal
        open={settingsOpen}
        status={status}
        onRefresh={refreshStatus}
        onClose={() => setSettingsOpen(false)}
      />

      <RecentCasesDrawer
        open={recentCasesOpen}
        recentCases={recentCases}
        onOpenCase={(id) => {
          openScenario(id);
          setRecentCasesOpen(false);
        }}
        onClose={() => setRecentCasesOpen(false)}
        onRefreshRecent={() => setRecentCases(getRecentCases())}
      />

      {compareModalOpen && (
        <JurisdictionCompareModal
          initialCountries={compareCountries}
          onClose={() => setCompareModalOpen(false)}
        />
      )}

      {previewTarget && (
        <EvidencePreviewModal
          attachment={previewTarget.attachment}
          exhibitLabel={previewTarget.exhibitLabel}
          initialPage={previewTarget.initialPage}
          initialSheet={previewTarget.initialSheet}
          initialCell={previewTarget.initialCell}
          onClose={() => setPreviewTarget(null)}
        />
      )}

      {/* Persistent Global FaultLine Cloud AI Companion */}
      <FaultLineCloudCompanion
        currentView={view}
        isThinking={run.status === 'running' || intelligenceThinking}
        activeCase={caseFile?.title || currentScenario?.id || null}
        onOpenIntelligence={() => setMiniChatOpen((prev) => !prev)}
        visible={companionVisible && (!miniChatOpen || view === 'intelligence')}
      />

      {/* Floating Quick Intelligence Mini Chat Overlay (Right-side panel) */}
      {view !== 'intelligence' && (
        <FaultLineMiniChat
          open={miniChatOpen}
          onClose={() => setMiniChatOpen(false)}
          currentView={view}
          activeCaseId={currentScenario?.id || caseFile?.scenarioId || null}
          caseFile={caseFile}
          statusInfo={status}
          onThinkingChange={setIntelligenceThinking}
          onOpenFullIntelligence={() => {
            setMiniChatOpen(false);
            navigate({ view: 'intelligence' });
          }}
        />
      )}

      <Toast toast={toast} onDone={clearToast} />
    </div>
  );
}
