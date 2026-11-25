import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookmarkCheck,
  Brain,
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Database,
  Eye,
  FilePlus2,
  FolderGit2,
  Globe2,
  HardHat,
  HelpCircle,
  LibraryBig,
  ListOrdered,
  LoaderCircle,
  MessageCircleQuestion,
  Network,
  Quote,
  Scale,
  ScanSearch,
  ServerCrash,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { countryName } from '../../shared/scenarios/vocab.js';
import { plural } from '../lib/format.js';
import { getRecentCases } from '../lib/recentCases.js';
import { getLocalCustomScenarios } from '../lib/customScenarios.js';
import { Button } from './ui.jsx';
import { ChatbotSparkleIcon } from './Companion/FaultLineCloudCompanion.jsx';

const ICONS = { car: Car, hardhat: HardHat, server: ServerCrash };

// Permanent, stable live forensic cross-examination simulation window
function ForensicNetworkGraphic({ onOpenCase }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [userHover, setUserHover] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimerRef = useRef(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const STAGES = [
    {
      id: 'intake',
      duration: 2800,
      badge: '📥 1. Evidence Intake',
      badgeCls: 'bg-pen/15 text-pen-bright border-pen/30',
      progress: 14,
      step: 0,
      cardTag: 'Evidence Intake Complete',
      cardTagCls: 'bg-pen/15 text-pen-bright border border-pen/30',
      quote: '“Indexing 4 case exhibits: claimant FNOL, statements & garage inspection...”',
      finding: 'All 4 case exhibits indexed into cross-examination matrix.',
    },
    {
      id: 'linking',
      duration: 2800,
      badge: '⚡ 2. Evidence Linking',
      badgeCls: 'bg-cyan/15 text-cyan border-cyan/30',
      progress: 28,
      step: 1,
      cardTag: 'Corroboration Linking Active',
      cardTagCls: 'bg-cyan/15 text-cyan border border-cyan/30',
      quote: '“Tracing corroboration paths between driver accounts & witness statement...”',
      finding: 'Corroboration & contradiction pathways actively mapped.',
    },
    {
      id: 'comparing',
      duration: 2800,
      badge: '⚖️ 3. Statement Comparison',
      badgeCls: 'bg-pen/15 text-pen-bright border-pen/30',
      progress: 42,
      step: 2,
      cardTag: 'Comparing Opposing Accounts',
      cardTagCls: 'bg-pen/15 text-pen-bright border border-pen/30',
      quote: '“Comparing Ex. A (\'Stopped at red\') against Ex. B (\'No brake lights\')...”',
      finding: 'Braking statements directly conflict on roundabout exit sequence.',
    },
    {
      id: 'crossexam',
      duration: 2800,
      badge: '🔍 4. Cross-Examination',
      badgeCls: 'bg-pen/15 text-pen-bright border-pen/30',
      progress: 57,
      step: 3,
      cardTag: 'Cross-Examining Telemetry',
      cardTagCls: 'bg-pen/15 text-pen-bright border border-pen/30',
      quote: '“Examining deceleration timeline against witness testimony...”',
      finding: 'Cross-examination isolates abrupt braking anomaly at roundabout junction.',
    },
    {
      id: 'contradiction',
      duration: 3000,
      badge: '⚠️ 5. Contradiction Detected',
      badgeCls: 'bg-critical-wash text-critical-ink border-critical/30 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40',
      progress: 71,
      step: 4,
      cardTag: 'Direct Contradiction Flagged',
      cardTagCls: 'bg-critical-wash text-critical-ink border border-critical/30 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40',
      quote: '“Direct conflict on roundabout exit: sudden stop vs traffic queue ahead.”',
      finding: 'Direct contradiction flagged between Exhibit A and Exhibit B.',
    },
    {
      id: 'evaluating',
      duration: 2800,
      badge: '🤖 6. AI Analysis',
      badgeCls: 'bg-pen-wash text-pen-dark border-pen/30 dark:bg-pen/15 dark:text-pen-bright dark:border-pen/30',
      progress: 85,
      step: 5,
      cardTag: 'AI Quote & Damage Verification',
      cardTagCls: 'bg-pen-wash text-pen-dark border border-pen/30 dark:bg-pen/15 dark:text-pen-bright dark:border-pen/30',
      quote: '“Heavy rust and dust on impact fracture edges proves pre-existing damage.”',
      finding: 'Physical forensic evidence in Exhibit D refutes fresh collision claim.',
    },
    {
      id: 'finding',
      duration: 4000,
      badge: '✅ 7. Finding Generated',
      badgeCls: 'bg-agree-wash text-agree-ink border-agree/30 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/40',
      progress: 100,
      step: 6,
      cardTag: 'Induced Collision Finding',
      cardTagCls: 'bg-critical-wash text-critical-ink border border-critical/30 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40',
      quote: '“BMW driver was tapping his brakes erratically beforehand…”',
      finding: 'Exhibit C & D contradict claimant statement; prior bumper rust confirmed.',
    },
  ];

  const currentStage = STAGES[stageIndex];

  // Stage advancement loop: continuous, stable, zero layout shift
  useEffect(() => {
    if (prefersReducedMotion || isPaused || userHover) return undefined;

    const timer = setTimeout(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, currentStage.duration);
    return () => clearTimeout(timer);
  }, [stageIndex, isPaused, userHover, prefersReducedMotion, currentStage]);

  // Hover pauses simulation; leaving smoothly resumes after delay
  const handleMouseEnterNode = (nodeId) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setIsPaused(true);
    setUserHover(nodeId);
  };

  const handleMouseLeave = () => {
    setUserHover(null);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 1200);
  };

  const EXHIBIT_DATA = {
    A: {
      id: 'A',
      title: 'Exhibit A: Insured First Notice of Loss',
      badgeTag: 'Claimant FNOL',
      badgeCls: 'bg-pen/15 text-pen-bright border border-pen/30',
      quote: '“Policyholder ran into the back of a BMW 3 Series... says the BMW stopped dead with no brake lights.”',
      finding: 'Claimant claims sudden unprovoked stop on Perry Barr roundabout exit.',
      label: 'Insured FNOL',
      subtext: '📄 2 files • ✓ Processed',
    },
    B: {
      id: 'B',
      title: 'Exhibit B: Third-Party Driver Statement',
      badgeTag: 'Third Party',
      badgeCls: 'bg-pen/15 text-pen-bright border border-pen/30',
      quote: '“I stopped normally for traffic ahead. The claimant vehicle slammed into my rear bumper without braking.”',
      finding: 'Directly contradicts claimant assertion of sudden unprovoked stop.',
      label: 'Third Party',
      subtext: '📄 1 file • ✓ Processed',
    },
    C: {
      id: 'C',
      title: 'Exhibit C: Independent Witness Statement',
      badgeTag: 'Witness Account',
      badgeCls: 'bg-major-wash text-major-ink border border-major/30 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30',
      quote: '“The BMW driver was tapping his brakes erratically beforehand and appeared to be looking for an opportunity.”',
      finding: 'Crucial third-party corroboration supporting induced collision pattern.',
      label: 'Witness Statement',
      subtext: '🎥 1 file • ✓ Analyzed',
    },
    D: {
      id: 'D',
      title: 'Exhibit D: Garage Inspection Job Card',
      badgeTag: 'Physical Evidence',
      badgeCls: 'bg-agree-wash text-agree-ink border border-agree/30 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/30',
      quote: '“Heavy rust and oxidized dust on impact fracture edges; paint flaking confirms damage predates reported collision.”',
      finding: 'Physical forensic evidence proves bumper fractures are pre-existing.',
      label: 'Garage Job Card',
      subtext: '📊 2 files • ✓ Processed',
    },
    contradiction: {
      id: 'contradiction',
      title: 'Direct Forensic Contradiction Detected',
      badgeTag: 'Direct Conflict',
      badgeCls: 'bg-critical-wash text-critical-ink border border-critical/30 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/40',
      quote: 'Exhibit A conflicts directly with Exhibit B on braking, while Exhibit C and D reveal an induced collision pattern.',
      finding: 'High risk of staged crash-for-cash claim with prior physical damage.',
      label: 'Contradiction Core',
      subtext: 'Braking Conflict',
    },
  };

  const activeFocus = userHover ? EXHIBIT_DATA[userHover] : null;

  // Active stage flags
  const isLinking = currentStage.id === 'linking';
  const isComparing = currentStage.id === 'comparing';
  const isContradiction = currentStage.id === 'contradiction';
  const isEvaluating = currentStage.id === 'evaluating';
  const isFinding = currentStage.id === 'finding';

  return (
    <div
      onMouseLeave={handleMouseLeave}
      className="relative mx-auto w-full max-w-[480px] h-[436px] rounded-2xl border border-rule bg-card-elevated p-4 select-none box-border flex flex-col justify-between transition-all duration-200 hover:border-pen/50 hover:shadow-[0_0_35px_rgba(79,107,255,0.15)] shadow-2xl overflow-hidden"
    >
      {/* 1. Header Bar: Fixed height (h-8), permanent 100% visibility */}
      <div className="h-8 flex items-center justify-between border-b border-rule pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5 items-center justify-center">
            <span className="absolute size-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="size-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[12px] font-bold tracking-tight text-ink uppercase flex items-center gap-1.5">
            <Activity className="size-3.5 text-pen-bright" />
            Live Cross-Examination
          </span>
        </div>
        <span
          className={`h-6 min-w-[145px] text-center inline-flex items-center justify-center text-[11px] font-mono font-semibold px-2.5 rounded-full border transition-colors duration-200 ${
            userHover
              ? 'bg-pen/15 text-pen-bright border-pen/30'
              : currentStage.badgeCls
          }`}
        >
          {userHover ? `🔎 Inspecting Ex. ${userHover}` : currentStage.badge}
        </span>
      </div>

      {/* 2. Progress Tracker: Fixed height (h-7), stationary allocated space */}
      <div className="h-7 flex items-center justify-between shrink-0 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold text-ink-3 uppercase tracking-wider">
            Stage {stageIndex + 1}/7:
          </span>
          <span className="text-[11px] font-bold text-ink truncate max-w-[170px]">
            {userHover ? 'Manual Evidence Inspection' : currentStage.cardTag}
          </span>
        </div>

        {/* 6 Stage Indicators */}
        <div className="flex items-center gap-1.5">
          {STAGES.map((s, idx) => {
            const isStepActive = idx === stageIndex;
            const isStepPast = idx < stageIndex;
            return (
              <span
                key={s.id}
                className={`size-1.5 rounded-full transition-all duration-200 ${
                  isStepActive
                    ? isContradiction
                      ? 'bg-rose-400 scale-125 ring-2 ring-rose-400/40'
                      : isFinding
                        ? 'bg-emerald-400 scale-125 ring-2 ring-emerald-400/40'
                        : 'bg-pen-bright scale-125 ring-2 ring-pen/40'
                    : isStepPast
                      ? 'bg-pen/50'
                      : 'bg-rule'
                }`}
                title={`Stage ${idx + 1}: ${s.cardTag}`}
              />
            );
          })}
        </div>
      </div>

      {/* 3. Evidence Network Canvas: Fixed allocated height (200px) */}
      <div className="relative h-[200px] w-full shrink-0">
        {/* SVG Connections & Particle Overlays: Always 100% visible baseline strokes */}
        <svg
          viewBox="0 0 380 180"
          className="absolute inset-0 size-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="conn-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#4F6BFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="conn-conflict" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FB5365" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="conn-agree" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Permanent Solid Baseline Lines (Theme adaptive) */}
          <line x1="62" y1="32" x2="318" y2="32" stroke="var(--color-rule-strong)" strokeWidth="1.8" />
          <line x1="62" y1="148" x2="318" y2="148" stroke="var(--color-rule-strong)" strokeWidth="1.8" />
          <line x1="62" y1="32" x2="62" y2="148" stroke="var(--color-rule-strong)" strokeWidth="1.8" />
          <line x1="318" y1="32" x2="318" y2="148" stroke="var(--color-rule-strong)" strokeWidth="1.8" />
          <line x1="62" y1="32" x2="318" y2="148" stroke="var(--color-rule-strong)" strokeWidth="1.8" />
          <line x1="318" y1="32" x2="62" y2="148" stroke="var(--color-rule-strong)" strokeWidth="1.8" />

          {/* Active Animated Overlays without dimming baseline */}
          {(isContradiction || userHover === 'A' || userHover === 'B' || userHover === 'contradiction') && (
            <line
              x1="62"
              y1="32"
              x2="318"
              y2="32"
              stroke="url(#conn-conflict)"
              strokeWidth="2.6"
              strokeDasharray="6 4"
              className="animate-dash-flow"
            />
          )}

          {(isEvaluating || isFinding || userHover === 'C' || userHover === 'D') && (
            <line
              x1="62"
              y1="148"
              x2="318"
              y2="148"
              stroke="url(#conn-agree)"
              strokeWidth="2.4"
              strokeDasharray="6 4"
              className="animate-dash-flow"
            />
          )}

          {(isLinking || isComparing || userHover) && (
            <>
              <line
                x1="62"
                y1="32"
                x2="62"
                y2="148"
                stroke="url(#conn-active)"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                className="animate-dash-flow"
              />
              <line
                x1="318"
                y1="32"
                x2="318"
                y2="148"
                stroke="url(#conn-active)"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                className="animate-dash-flow"
              />
            </>
          )}

          {/* Traveling Particles on top of connection lines */}
          {!prefersReducedMotion && (isLinking || isComparing || isEvaluating) && (
            <>
              <circle r="3" fill="#22D3EE">
                <animateMotion dur="2.4s" repeatCount="indefinite" path="M 62 32 L 62 148" />
              </circle>
              <circle r="3" fill="#4F6BFF">
                <animateMotion dur="2.4s" repeatCount="indefinite" path="M 318 32 L 318 148" />
              </circle>
              <circle r="3" fill="#22C55E">
                <animateMotion dur="2.2s" repeatCount="indefinite" path="M 318 148 L 190 90" />
              </circle>
            </>
          )}

          {!prefersReducedMotion && (isContradiction || userHover === 'contradiction') && (
            <circle r="3.6" fill="#FB5365">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M 62 32 L 318 32" />
            </circle>
          )}

          {!prefersReducedMotion && (isEvaluating || isFinding) && (
            <circle r="3.2" fill="#22C55E">
              <animateMotion dur="2.0s" repeatCount="indefinite" path="M 62 148 L 318 148" />
            </circle>
          )}
        </svg>

        {/* Node A (Top-Left): Fixed size, permanent 100% opacity, stable positioning */}
        <div
          onMouseEnter={() => handleMouseEnterNode('A')}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenCase}
          className={`absolute top-0 left-0 w-[142px] h-[52px] z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs cursor-pointer transition-colors duration-150 box-border ${
            userHover === 'A'
              ? 'border-pen bg-hover ring-2 ring-pen/30'
              : isContradiction
                ? 'border-rose-500/80 bg-rose-950/40'
                : isComparing
                  ? 'border-pen/70 bg-pen-wash/50 ring-1 ring-pen/20'
                  : 'border-rule bg-card-elevated hover:border-pen/60'
          }`}
          title="Exhibit A: Insured FNOL (Click to inspect)"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[10.5px] border border-rule">
            A
          </span>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[11.5px] font-bold text-ink">Insured FNOL</span>
            <span className="block truncate text-[10px] text-ink-3">{EXHIBIT_DATA.A.subtext}</span>
          </div>
        </div>

        {/* Node B (Top-Right): Fixed size, permanent 100% opacity, stable positioning */}
        <div
          onMouseEnter={() => handleMouseEnterNode('B')}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenCase}
          className={`absolute top-0 right-0 w-[142px] h-[52px] z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs cursor-pointer transition-colors duration-150 box-border ${
            userHover === 'B'
              ? 'border-pen bg-hover ring-2 ring-pen/30'
              : isContradiction
                ? 'border-rose-500/80 bg-rose-950/40'
                : isComparing
                  ? 'border-pen/70 bg-pen-wash/50 ring-1 ring-pen/20'
                  : 'border-rule bg-card-elevated hover:border-pen/60'
          }`}
          title="Exhibit B: Third Party (Click to inspect)"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[10.5px] border border-rule">
            B
          </span>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[11.5px] font-bold text-ink">Third Party</span>
            <span className="block truncate text-[10px] text-ink-3">{EXHIBIT_DATA.B.subtext}</span>
          </div>
        </div>

        {/* Central Contradiction & AI Core: Fixed dimensions, permanent 100% visibility */}
        <div
          onMouseEnter={() => handleMouseEnterNode('contradiction')}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenCase}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[190px] h-[34px] z-20 flex items-center justify-center gap-1.5 rounded-full border px-3 shadow-xs cursor-pointer transition-colors duration-200 box-border ${
            userHover === 'contradiction'
              ? 'border-critical bg-critical-wash text-critical-ink ring-4 ring-critical/20 dark:border-rose-500 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-500/30'
              : isContradiction
                ? 'border-critical bg-critical-wash text-critical-ink ring-2 ring-critical/20 dark:border-rose-500 dark:bg-rose-950/80 dark:text-rose-300 dark:ring-rose-500/30'
                : isEvaluating
                  ? 'border-pen bg-pen-wash text-pen-dark ring-2 ring-pen/20 dark:text-pen-bright'
                  : isFinding
                    ? 'border-agree/60 bg-agree-wash text-agree-ink dark:border-emerald-500/60 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border-rule bg-card-elevated text-ink hover:border-pen/60'
          }`}
          title="Click to view contradiction findings"
        >
          {isEvaluating ? (
            <>
              <Brain className="size-3.5 text-pen-bright shrink-0 animate-pulse" />
              <span className="text-[11px] font-bold text-pen-bright truncate">AI Verifying Quotes</span>
            </>
          ) : isFinding ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-300 truncate">Contradiction Confirmed</span>
            </>
          ) : isContradiction ? (
            <>
              <ShieldAlert className="size-3.5 text-rose-400 shrink-0 animate-pulse" />
              <span className="text-[11px] font-bold text-rose-300 truncate">Direct Contradiction</span>
            </>
          ) : (
            <>
              <Scale className="size-3.5 text-pen-bright shrink-0" />
              <span className="text-[11px] font-bold text-ink truncate">Cross-Exam Core</span>
            </>
          )}
        </div>

        {/* Node C (Bottom-Left): Fixed size, permanent 100% opacity, stable positioning */}
        <div
          onMouseEnter={() => handleMouseEnterNode('C')}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenCase}
          className={`absolute bottom-0 left-0 w-[142px] h-[52px] z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs cursor-pointer transition-colors duration-150 box-border ${
            userHover === 'C'
              ? 'border-pen bg-hover ring-2 ring-pen/30'
              : isEvaluating
                ? 'border-major/60 bg-major-wash/60 dark:border-amber-500/70 dark:bg-amber-950/40'
                : 'border-rule bg-card-elevated hover:border-pen/60'
          }`}
          title="Exhibit C: Witness (Click to inspect)"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[10.5px] border border-rule">
            C
          </span>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[11.5px] font-bold text-ink">Witness</span>
            <span className="block truncate text-[10px] text-ink-3">{EXHIBIT_DATA.C.subtext}</span>
          </div>
        </div>

        {/* Node D (Bottom-Right): Fixed size, permanent 100% opacity, stable positioning */}
        <div
          onMouseEnter={() => handleMouseEnterNode('D')}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenCase}
          className={`absolute bottom-0 right-0 w-[142px] h-[52px] z-10 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 shadow-xs cursor-pointer transition-colors duration-150 box-border ${
            userHover === 'D'
              ? 'border-pen bg-hover ring-2 ring-pen/30'
              : isEvaluating || isFinding
                ? 'border-agree/60 bg-agree-wash/60 dark:border-emerald-500/70 dark:bg-emerald-950/40'
                : 'border-rule bg-card-elevated hover:border-pen/60'
          }`}
          title="Exhibit D: Garage Job Card (Click to inspect)"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[10.5px] border border-rule">
            D
          </span>
          <div className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[11.5px] font-bold text-ink">Garage Job Card</span>
            <span className="block truncate text-[10px] text-ink-3">{EXHIBIT_DATA.D.subtext}</span>
          </div>
        </div>
      </div>

      {/* 4. Finding Card: Fixed height (96px), permanent 100% visible, stable allocated region */}
      <div
        onClick={onOpenCase}
        className={`h-[96px] w-full shrink-0 rounded-xl border p-3 flex flex-col justify-between box-border overflow-hidden cursor-pointer transition-colors duration-200 ${
          activeFocus
            ? 'border-pen/50 bg-pen-wash/60'
            : isContradiction
              ? 'border-critical/30 bg-critical-wash/60 dark:border-rose-500/40 dark:bg-rose-950/30'
              : isFinding
                ? 'border-agree/30 bg-agree-wash/60 dark:border-emerald-500/40 dark:bg-emerald-950/30'
                : 'border-rule bg-sheet hover:border-pen/50'
        }`}
      >
        {/* Row 1: Category Tag & Action Indicator (Fixed h-5) */}
        <div className="h-5 flex items-center justify-between">
          <span
            className={`rounded px-2 py-0.5 text-[10.5px] font-bold truncate max-w-[280px] ${
              activeFocus
                ? activeFocus.badgeCls
                : currentStage.cardTagCls
            }`}
          >
            {activeFocus ? activeFocus.badgeTag : currentStage.cardTag}
          </span>
          <span className="text-[11px] font-semibold text-pen-bright shrink-0 flex items-center gap-1 hover:underline">
            Inspect Case <ArrowRight className="size-3" />
          </span>
        </div>

        {/* Row 2: Verbatim Evidence Quote (Fixed h-5) */}
        <p className="h-5 text-[11.5px] font-serif text-ink italic truncate leading-5">
          {activeFocus ? activeFocus.quote : currentStage.quote}
        </p>

        {/* Row 3: Forensic Finding Synthesis (Fixed h-5) */}
        <p className="h-5 text-[11px] text-ink-2 font-medium truncate leading-5">
          {activeFocus ? activeFocus.finding : currentStage.finding}
        </p>
      </div>
    </div>
  );
}

function MetricCard({ title, value, label, icon: Icon, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col rounded-[12px] border border-rule/60 bg-sheet/95 backdrop-blur-xs p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-pen/60 hover:bg-card-elevated hover:shadow-[0_12px_28px_-6px_rgba(70,92,230,0.18)] active:translate-y-0 active:scale-[0.985] cursor-pointer overflow-hidden"
      title={`Open ${title}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[13px] font-semibold text-ink-2 group-hover:text-ink transition-colors">
          {title}
        </span>
        <div className="flex size-8 items-center justify-center rounded-lg bg-paper border border-rule/50 text-ink-3 transition-all duration-200 group-hover:scale-110 group-hover:bg-pen-wash group-hover:text-pen-dark dark:group-hover:bg-pen/15 dark:group-hover:text-pen-bright">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[28px] font-extrabold tracking-tight text-ink tabular transition-colors group-hover:text-pen-dark dark:group-hover:text-pen-bright">
          {value}
        </span>
        {badge && (
          <span className="rounded-full bg-pen-wash border border-pen/20 px-2 py-0.5 text-[11px] font-bold text-pen-dark dark:bg-pen/15 dark:border-pen/30 dark:text-pen-bright">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12.5px] font-medium text-ink-3">{label}</p>

      {/* Subtle bottom hover accent bar */}
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-pen opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </button>
  );
}

function SampleCaseCard({ sample, onOpen }) {
  const Icon = ICONS[sample.icon] ?? Car;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col rounded-[11px] border border-rule bg-sheet p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-pen/70 hover:bg-card-elevated hover:shadow-lg active:translate-y-0 active:scale-[0.985] cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2 w-full">
        <span className="flex size-7 items-center justify-center rounded-md bg-paper border border-rule/50 text-ink-2 transition-transform duration-200 group-hover:scale-110 group-hover:text-pen-bright">
          <Icon className="size-4" />
        </span>
        <span className="rounded bg-manila border border-rule px-2 py-0.5 text-[11.5px] font-bold text-manila-ink">
          {sample.ref}
        </span>
      </div>
      <h3 className="mt-3 text-[16px] font-bold text-ink group-hover:text-pen-bright transition-colors">
        {sample.title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2 line-clamp-2">
        {sample.blurb}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-rule/70 pt-3.5 text-[12.5px] w-full">
        <span className="text-ink-3 font-medium">{sample.exhibits.length} exhibits on file</span>
        <span className="font-semibold text-pen-bright flex items-center gap-1 transition-transform duration-150 group-hover:translate-x-1">
          Investigate <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  );
}

const FIRST_COUNTRIES = ['UK', 'US', 'IN'];

export default function Landing({
  samples,
  onOpenSample,
  onBlank,
  library,
  onBrowse,
  onRandom,
  onSaved,
  onOpenIntelligence,
}) {
  const [heroMousePos, setHeroMousePos] = useState({ x: 50, y: 35 });
  const customScenarios = getLocalCustomScenarios();
  const totalScenarios = library?.scenarios.length || 266;
  const countryCounts = new Map();
  for (const s of library?.scenarios ?? []) {
    countryCounts.set(s.country, (countryCounts.get(s.country) ?? 0) + 1);
  }
  const countries = library ? [...countryCounts.keys()] : FIRST_COUNTRIES;

  // Primary benchmark sample case
  const benchmarkSample = samples?.[0];

  const handleOpenBenchmark = () => {
    if (benchmarkSample) onOpenSample(benchmarkSample);
    else onBrowse();
  };

  const handleScrollToJurisdictions = () => {
    const el = document.getElementById('jurisdictions-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onBrowse();
    }
  };

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setHeroMousePos({
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    });
  };

  return (
    <div className="min-h-full pb-16 animate-fade-in-up">
      {/* 1. Hero Section with Interactive Ambient Lighting & Tech Grid */}
      <section
        onMouseMove={handleHeroMouseMove}
        className="relative overflow-hidden border-b border-rule/35 bg-tech-grid px-5 py-12 sm:px-8 sm:py-16 transition-colors"
        style={{
          backgroundImage: `radial-gradient(850px circle at ${heroMousePos.x}% ${heroMousePos.y}%, rgba(79, 107, 255, 0.12), transparent 75%)`,
        }}
      >
        {/* Soft Ambient Light Glow Orbs */}
        <div className="pointer-events-none absolute -top-32 -left-32 size-[420px] rounded-full bg-pen/10 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 right-10 size-[380px] rounded-full bg-cyan/10 blur-[110px]" />

        <div className="relative z-10 mx-auto max-w-[1240px]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center">
            {/* Left Column: Headlines & Structured Action Hub */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-pen/30 bg-pen/10 px-3.5 py-1.5 text-[12.5px] font-bold text-pen-bright mb-4 shadow-2xs">
                <Sparkles className="size-3.5 text-cyan animate-pulse" />
                AI-Powered Claims Investigation Platform
              </div>
              <h1 className="text-[clamp(2.2rem,4.4vw,3.6rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink text-balance">
                Find where the stories{' '}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-300 bg-clip-text text-transparent underline decoration-pen/40 underline-offset-4">
                  don't line up.
                </span>
              </h1>
              <p className="mt-4 max-w-[54ch] text-[16.5px] sm:text-[17.5px] leading-relaxed text-ink-2 font-normal">
                Investigate claims, compare evidence, uncover contradictions, and use AI to reconstruct what really happened.
              </p>

              {/* Structured 2-Tier Action Hub */}
              <div className="mt-8 space-y-3">
                {/* Primary Tier: Main Investigation Paths */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="md"
                    onClick={onBlank}
                    className="shadow-[0_0_20px_rgba(79,107,255,0.4)] group px-5 text-[14.5px] font-semibold"
                  >
                    <ScanSearch className="size-4.5 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    Start Investigation
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => onBrowse()}
                    className="group px-5 text-[14.5px] font-medium"
                  >
                    <Database className="size-4.5 transition-transform duration-200 group-hover:scale-110 text-pen-bright" aria-hidden="true" />
                    Explore Scenario Library
                  </Button>
                </div>

                {/* Secondary Discovery Tier */}
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                  {onOpenIntelligence && (
                    <button
                      type="button"
                      onClick={onOpenIntelligence}
                      className="group inline-flex items-center gap-2.5 rounded-full border border-rule/80 dark:border-[#202E4E] bg-sheet/95 dark:bg-[#0B1220]/95 px-3.5 py-1.5 text-ink hover:border-blue-500/60 hover:shadow-[0_4px_16px_rgba(37,99,235,0.18)] transition-all duration-200 shadow-2xs active:scale-[0.98]"
                      title="Open FaultLine Chatbot Workspace"
                      aria-label="Open FaultLine Chatbot Workspace"
                    >
                      <span className="flex size-5 items-center justify-center rounded-full bg-blue-100 dark:bg-[#1A2644] text-blue-600 dark:text-[#60A5FA] shrink-0 transition-transform duration-200 group-hover:scale-110">
                        <ChatbotSparkleIcon className="size-3" />
                      </span>
                      <span className="text-[13px] font-bold tracking-tight text-ink dark:text-white">
                        FaultLine Chatbot
                      </span>
                      <span className="rounded-full px-1.5 py-0.2 text-[9.5px] font-bold tracking-wider uppercase bg-blue-50 dark:bg-[#16213D] text-blue-600 dark:text-[#60A5FA] border border-blue-200/60 dark:border-blue-500/20">
                        AI
                      </span>
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRandom}
                    className="group text-[13px] text-ink-2 hover:text-ink hover:bg-sheet/60 font-medium"
                  >
                    <Shuffle className="size-3.5 transition-transform duration-200 group-hover:rotate-45 text-pen-bright" aria-hidden="true" />
                    Random Scenario
                  </Button>
                </div>
              </div>

              {/* Trust statement */}
              <p className="mt-5 text-[13px] text-ink-3 flex items-center gap-2 pt-2 border-t border-rule/30 max-w-[54ch]">
                <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                <span>Exhibits are analyzed neutrally with verbatim quote verification. All findings link to exact evidence.</span>
              </p>
            </div>

            {/* Right Column: Visual Forensic Graphic */}
            <div className="lg:pl-6">
              <ForensicNetworkGraphic onOpenCase={handleOpenBenchmark} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Real Metrics Dashboard Cards */}
      <section className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            title="Scenario Library"
            value={totalScenarios}
            label="Realistic motor claims"
            icon={Database}
            badge="Verified"
            onClick={() => onBrowse()}
          />
          <MetricCard
            title="Jurisdictions"
            value={countryCounts.size || 20}
            label="Countries & regions"
            icon={Globe2}
            onClick={handleScrollToJurisdictions}
          />
          <MetricCard
            title="Forensic Categories"
            value="8"
            label="Accident & fraud types"
            icon={Scale}
            onClick={() => onBrowse({ filters: { category: ['genuine-accident'] } })}
          />
          <MetricCard
            title="Customised Cases"
            value={customScenarios.length}
            label="Saved custom versions"
            icon={BookmarkCheck}
            badge={customScenarios.length ? 'Active' : null}
            onClick={onSaved}
          />
        </div>
      </section>

      {/* 3. Quick Action Hub */}
      <section className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[18px] font-bold text-ink">Investigation Workspace</h2>
            <p className="text-[13.5px] text-ink-3">Choose a workflow to begin forensic cross-examination</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onBrowse()} className="group">
            View all claims <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Action 1 */}
          <div
            onClick={onBlank}
            className="group cursor-pointer rounded-[12px] border border-rule/60 bg-sheet/95 backdrop-blur-xs p-5 transition-all duration-200 hover:-translate-y-1 hover:border-pen/70 hover:bg-card-elevated hover:shadow-[0_12px_28px_-6px_rgba(70,92,230,0.18)] active:translate-y-0 active:scale-[0.985]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-pen-wash text-pen-dark border border-pen/20 dark:bg-pen/15 dark:text-pen-bright dark:border-pen/30 transition-transform duration-200 group-hover:scale-110">
              <FilePlus2 className="size-5" />
            </div>
            <h3 className="mt-3.5 text-[16px] font-bold text-ink group-hover:text-pen-dark dark:group-hover:text-pen-bright transition-colors">
              New Investigation Canvas
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              Paste two or more statements, CCTV logs, job cards, or witness accounts to cross-examine from scratch.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-dark dark:text-pen-bright transition-transform duration-150 group-hover:translate-x-1">
              Open canvas <ArrowRight className="size-3.5" />
            </span>
          </div>

          {/* Action 2 */}
          <div
            onClick={() => onBrowse()}
            className="group cursor-pointer rounded-[12px] border border-rule/60 bg-sheet/95 backdrop-blur-xs p-5 transition-all duration-200 hover:-translate-y-1 hover:border-pen/70 hover:bg-card-elevated hover:shadow-[0_12px_28px_-6px_rgba(70,92,230,0.18)] active:translate-y-0 active:scale-[0.985]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-pen-wash text-pen-dark border border-pen/20 dark:bg-pen/15 dark:text-pen-bright dark:border-pen/30 transition-transform duration-200 group-hover:scale-110">
              <LibraryBig className="size-5" />
            </div>
            <h3 className="mt-3.5 text-[16px] font-bold text-ink group-hover:text-pen-dark dark:group-hover:text-pen-bright transition-colors">
              Motor Claims Library
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              Search and filter 266 motor claims across 20 countries. Assess blind with AI or check against reference answers.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-dark dark:text-pen-bright transition-transform duration-150 group-hover:translate-x-1">
              Browse library <ArrowRight className="size-3.5" />
            </span>
          </div>

          {/* Action 3 */}
          <div
            onClick={onRandom}
            className="group cursor-pointer rounded-[12px] border border-rule/60 bg-sheet/95 backdrop-blur-xs p-5 transition-all duration-200 hover:-translate-y-1 hover:border-pen/70 hover:bg-card-elevated hover:shadow-[0_12px_28px_-6px_rgba(70,92,230,0.18)] active:translate-y-0 active:scale-[0.985]"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-pen-wash text-pen-dark border border-pen/20 dark:bg-pen/15 dark:text-pen-bright dark:border-pen/30 transition-transform duration-200 group-hover:scale-110">
              <Shuffle className="size-5" />
            </div>
            <h3 className="mt-3.5 text-[16px] font-bold text-ink group-hover:text-pen-dark dark:group-hover:text-pen-bright transition-colors">
              Random Claim Audit
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              Select a random claim from the library to test the AI assessor against complex or suspicious scenarios.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pen-dark dark:text-pen-bright transition-transform duration-150 group-hover:translate-x-1">
              Pick random claim <ArrowRight className="size-3.5" />
            </span>
          </div>
        </div>
      </section>

      {/* 4. Sample Benchmark Cases */}
      <section className="mx-auto max-w-[1240px] px-5 py-6 sm:px-8">
        <h2 className="text-[17px] font-bold text-ink mb-1">Try a Benchmark Case</h2>
        <p className="text-[13.5px] text-ink-3 mb-4">
          Pre-built cases with verified contradictions and quote references ready for analysis.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {samples.map((s) => (
            <SampleCaseCard key={s.id} sample={s} onOpen={() => onOpenSample(s)} />
          ))}
        </div>
      </section>
    </div>
  );
}
