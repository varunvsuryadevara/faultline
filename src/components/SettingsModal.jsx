import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  KeyRound,
  Laptop,
  Moon,
  Network,
  Palette,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  Sliders,
  Sun,
  Type,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  ACCENT_CONFIG,
  INTERFACE_DENSITIES,
  MOTION_PREFERENCES,
  PARTICLE_PREFERENCES,
  THEME_MODES,
  TYPOGRAPHY_PREFERENCES,
} from '../lib/theme.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { prettyModel } from '../lib/format.js';
import { Button, IconButton, cx } from './ui.jsx';

export default function SettingsModal({ open, status, onRefresh, onClose, initialTab = 'appearance' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [testing, setTesting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  const {
    preferences,
    resolvedTheme,
    setMode,
    setAccent,
    setDensity,
    setMotion,
    setTypography,
    setParticleNetwork,
    resetToDefaults,
  } = useTheme();

  if (!open) return null;

  const handleTest = async () => {
    setTesting(true);
    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setTesting(false), 500);
    }
  };

  const handleReset = () => {
    resetToDefaults();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2000);
  };

  const isConfigured = Boolean(status?.configured);
  const isReachable = Boolean(status?.reachable);

  const themeModeOptions = [
    {
      id: THEME_MODES.DARK,
      label: 'Dark',
      desc: 'Deep navy/slate forensic contrast',
      icon: Moon,
    },
    {
      id: THEME_MODES.LIGHT,
      label: 'Light',
      desc: 'Clean enterprise report styling',
      icon: Sun,
    },
    {
      id: THEME_MODES.SYSTEM,
      label: 'System',
      desc: 'Automatically matches your device',
      icon: Laptop,
    },
  ];

  const densityOptions = [
    {
      id: INTERFACE_DENSITIES.COMFORTABLE,
      label: 'Comfortable',
      desc: 'Roomy padding, optimal for reading long narratives',
    },
    {
      id: INTERFACE_DENSITIES.STANDARD,
      label: 'Standard',
      desc: 'Balanced spacing designed for everyday case triage',
    },
    {
      id: INTERFACE_DENSITIES.COMPACT,
      label: 'Compact',
      desc: 'Dense data presentation for high-volume investigation',
    },
  ];

  const typographyOptions = [
    {
      id: TYPOGRAPHY_PREFERENCES.STANDARD,
      label: 'Standard',
      desc: 'Clean geometric font metrics optimized for UI',
    },
    {
      id: TYPOGRAPHY_PREFERENCES.COMFORTABLE,
      label: 'Comfortable Reading',
      desc: 'Taller line-height and larger text for extended review',
    },
  ];

  const motionOptions = [
    {
      id: MOTION_PREFERENCES.FULL,
      label: 'Full Motion',
      desc: 'Fluid micro-animations & forensic network pulses',
    },
    {
      id: MOTION_PREFERENCES.REDUCED,
      label: 'Reduced Motion',
      desc: 'Minimal animation for accessibility & focus',
    },
  ];

  const particleNetworkOptions = [
    {
      id: PARTICLE_PREFERENCES.SUBTLE,
      label: 'Subtle (Default)',
      desc: 'Calm, restrained investigative intelligence atmosphere',
    },
    {
      id: PARTICLE_PREFERENCES.STANDARD,
      label: 'Standard',
      desc: 'Dynamic interactive connections with mouse field response',
    },
    {
      id: PARTICLE_PREFERENCES.OFF,
      label: 'Off',
      desc: 'Disable particle network completely for pure flat surface',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl rounded-[14px] border border-rule bg-sheet shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-pen/15 text-pen-bright">
              {activeTab === 'appearance' ? <Palette className="size-5" /> : <Cpu className="size-5" />}
            </div>
            <div>
              <h2 id="settings-title" className="text-[17px] font-bold text-ink">
                Settings & Personalization
              </h2>
              <p className="text-[12.5px] text-ink-3">Customize appearance or check AI engine status</p>
            </div>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-rule px-6 bg-paper/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={cx(
              'flex items-center gap-2 border-b-2 py-3 px-3 text-[13.5px] font-semibold transition-colors duration-150',
              activeTab === 'appearance'
                ? 'border-pen text-pen'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-rule-strong'
            )}
          >
            <Palette className="size-4" />
            Appearance & Theme
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={cx(
              'flex items-center gap-2 border-b-2 py-3 px-3 text-[13.5px] font-semibold transition-colors duration-150',
              activeTab === 'ai'
                ? 'border-pen text-pen'
                : 'border-transparent text-ink-3 hover:text-ink hover:border-rule-strong'
            )}
          >
            <Cpu className="size-4" />
            AI Engine & Backend
            {isConfigured && isReachable && (
              <span className="size-2 rounded-full bg-emerald-500" title="Connected" />
            )}
          </button>
        </div>

        {/* Tab Body: Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* 1. Theme Mode */}
              <section aria-labelledby="theme-mode-heading">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 id="theme-mode-heading" className="text-[14px] font-bold text-ink flex items-center gap-2">
                    <Sun className="size-4 text-pen" />
                    Theme Mode
                  </h3>
                  <span className="text-[12px] font-medium text-ink-3">
                    Active: <strong className="text-ink capitalize">{resolvedTheme}</strong> ({preferences.mode} preference)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themeModeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = preferences.mode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setMode(opt.id)}
                        className={cx(
                          'flex flex-col text-left p-3.5 rounded-[10px] border transition-all duration-150',
                          isSelected
                            ? 'border-pen bg-pen/10 shadow-sm ring-1 ring-pen'
                            : 'border-rule bg-paper hover:bg-card-elevated hover:border-rule-strong'
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cx(
                              'flex size-7 items-center justify-center rounded-md',
                              isSelected ? 'bg-pen text-white' : 'bg-card-elevated text-ink-2'
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          {isSelected && <Check className="size-4 text-pen" />}
                        </div>
                        <span className="mt-2 text-[14px] font-bold text-ink">{opt.label}</span>
                        <span className="mt-0.5 text-[11.5px] leading-snug text-ink-3">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 2. Accent Color */}
              <section aria-labelledby="accent-color-heading">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 id="accent-color-heading" className="text-[14px] font-bold text-ink flex items-center gap-2">
                    <Palette className="size-4 text-pen" />
                    Accent Color
                  </h3>
                  <span className="text-[11.5px] text-ink-3">
                    Semantic decision colors (Approve/Review/Reject) remain protected.
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.values(ACCENT_CONFIG).map((cfg) => {
                    const isSelected = preferences.accent === cfg.id;
                    return (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => setAccent(cfg.id)}
                        className={cx(
                          'flex items-center gap-2.5 p-2.5 rounded-[8px] border text-left transition-all duration-150',
                          isSelected
                            ? 'border-pen bg-card-elevated ring-1 ring-pen'
                            : 'border-rule bg-paper hover:bg-card-elevated hover:border-rule-strong'
                        )}
                        aria-pressed={isSelected}
                      >
                        <span
                          className="size-5 rounded-full shrink-0 flex items-center justify-center shadow-xs"
                          style={{ backgroundColor: cfg.colorHex }}
                        >
                          {isSelected && <Check className="size-3 text-white stroke-[3]" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-ink">{cfg.label}</span>
                          <span className="block truncate text-[10.5px] text-ink-3">{cfg.description}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 3. Live Interactive Preview Card */}
              <section aria-labelledby="preview-heading" className="rounded-[10px] border border-rule bg-paper p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 id="preview-heading" className="text-[12.5px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="size-3.5 text-pen" />
                    Live Appearance Preview
                  </h4>
                  <span className="text-[11px] font-mono text-ink-3">
                    {resolvedTheme.toUpperCase()} • {ACCENT_CONFIG[preferences.accent]?.label} • {preferences.density.toUpperCase()}
                  </span>
                </div>

                <div className="rounded-[8px] border border-rule bg-sheet p-4 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-pen uppercase tracking-wide">UK-001 • Preview</span>
                      <h5 className="text-[14.5px] font-bold text-ink">Lane dispute on a spiral roundabout</h5>
                    </div>
                    {/* Semantic outcome badges verify semantic preservation */}
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                        Approve
                      </span>
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400">
                        Review
                      </span>
                    </div>
                  </div>

                  <p className="text-[13px] leading-relaxed text-ink-2">
                    Evidence links verified across 4 statements and telematics telemetry.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rule/70">
                    <Button variant="primary" size="sm" className="pointer-events-none">
                      Primary Action
                    </Button>
                    <Button variant="secondary" size="sm" className="pointer-events-none">
                      Secondary Action
                    </Button>
                    <span className="ml-auto text-[11.5px] text-ink-3">
                      Theme applies immediately
                    </span>
                  </div>
                </div>
              </section>

              {/* 4. Density, Typography, Motion & Background Effects Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Density */}
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                    <Sliders className="size-3.5 text-pen" />
                    Interface Spacing
                  </label>
                  <select
                    value={preferences.density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="block w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-pen focus:bg-sheet transition-colors"
                  >
                    {densityOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-3">
                    {densityOptions.find((o) => o.id === preferences.density)?.desc}
                  </p>
                </div>

                {/* Typography */}
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                    <Type className="size-3.5 text-pen" />
                    Typography
                  </label>
                  <select
                    value={preferences.typography}
                    onChange={(e) => setTypography(e.target.value)}
                    className="block w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-pen focus:bg-sheet transition-colors"
                  >
                    {typographyOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-3">
                    {typographyOptions.find((o) => o.id === preferences.typography)?.desc}
                  </p>
                </div>

                {/* Motion */}
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                    <Zap className="size-3.5 text-pen" />
                    Motion & Animations
                  </label>
                  <select
                    value={preferences.motion}
                    onChange={(e) => setMotion(e.target.value)}
                    className="block w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-pen focus:bg-sheet transition-colors"
                  >
                    {motionOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-3">
                    {motionOptions.find((o) => o.id === preferences.motion)?.desc}
                  </p>
                </div>

                {/* Intelligence Particle Network */}
                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                    <Network className="size-3.5 text-pen" />
                    Intelligence Network Effects
                  </label>
                  <select
                    value={preferences.particleNetwork || PARTICLE_PREFERENCES.SUBTLE}
                    onChange={(e) => setParticleNetwork(e.target.value)}
                    className="block w-full rounded-[8px] border border-rule bg-paper px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-pen focus:bg-sheet transition-colors"
                  >
                    {particleNetworkOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-3">
                    {particleNetworkOptions.find((o) => o.id === (preferences.particleNetwork || PARTICLE_PREFERENCES.SUBTLE))?.desc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* Status banner */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-4 ${
                  isConfigured && isReachable
                    ? 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300'
                    : !isReachable
                      ? 'border-rose-500/30 bg-rose-950/50 text-rose-300'
                      : 'border-amber-500/30 bg-amber-950/50 text-amber-300'
                }`}
              >
                {isConfigured && isReachable ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <XCircle className="size-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="text-[14px] font-bold">
                    {isConfigured && isReachable
                      ? 'AI Engine Online & Ready'
                      : !isReachable
                        ? 'Backend Server Offline'
                        : 'API Key Missing in .env'}
                  </h4>
                  <p className="mt-1 text-[13px] leading-relaxed opacity-90">
                    {isConfigured && isReachable
                      ? `Connected to ${status.name} (${prettyModel(status.model)}). Structured outputs and quote verification active.`
                      : !isReachable
                        ? 'Unable to reach the local FaultLine server on port 8787.'
                        : status?.setupHint || 'Add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env and save.'}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="rounded-[9px] border border-rule bg-paper p-4 space-y-3">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="flex items-center gap-2 text-ink-2">
                    <Server className="size-4 text-ink-3" />
                    Provider
                  </span>
                  <span className="font-semibold text-ink">{status?.name || 'Anthropic'}</span>
                </div>
                <div className="flex items-center justify-between text-[13.5px] border-t border-rule/70 pt-2.5">
                  <span className="flex items-center gap-2 text-ink-2">
                    <Cpu className="size-4 text-ink-3" />
                    Active Model
                  </span>
                  <span className="font-semibold text-ink">{prettyModel(status?.model) || 'claude-sonnet-5-5'}</span>
                </div>
                <div className="flex items-center justify-between text-[13.5px] border-t border-rule/70 pt-2.5">
                  <span className="flex items-center gap-2 text-ink-2">
                    <KeyRound className="size-4 text-ink-3" />
                    API Key
                  </span>
                  <span
                    className={`font-semibold ${
                      isConfigured ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {isConfigured ? 'Configured & Secured' : 'Not Configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13.5px] border-t border-rule/70 pt-2.5">
                  <span className="flex items-center gap-2 text-ink-2">
                    <Shield className="size-4 text-ink-3" />
                    Privacy & Key Safety
                  </span>
                  <span className="font-medium text-ink-2">Server-side Only</span>
                </div>
              </div>

              <p className="text-[12.5px] leading-relaxed text-ink-3">
                Settings live in the <code className="rounded bg-paper px-1.5 py-0.5 text-ink font-mono text-[12px]">.env</code> file
                in the root folder. The server automatically detects key changes without requiring a restart.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-rule px-6 py-3.5 bg-paper/50 rounded-b-[14px] shrink-0">
          <div className="flex items-center gap-2">
            {activeTab === 'appearance' ? (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-ink-3 hover:text-ink text-[12.5px]">
                <RotateCcw className="size-3.5" />
                {resetFeedback ? 'Reset to defaults!' : 'Reset to Defaults'}
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
                <RefreshCw className={`size-3.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing…' : 'Test Connection'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-3 hidden sm:inline">Preferences saved automatically</span>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
