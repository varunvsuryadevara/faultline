import { ArrowLeft, ChevronRight, Clock, Cpu, Menu, Plus, Settings } from 'lucide-react';
import { prettyModel } from '../lib/format.js';
import ThemeToggle from './ThemeToggle.jsx';
import { Button, IconButton, cx } from './ui.jsx';

// The mark: a line broken and displaced along a red fault.
export function FaultMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-card-elevated)" stroke="var(--color-rule)" strokeWidth="1.2" />
      <path d="M5 12.5h10M17 19.5h10" stroke="var(--color-pen)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18.5 6 13.5 26" stroke="var(--color-contradiction)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ModelStatus({ status, onClick }) {
  let dot = 'bg-ink-3/50';
  let text = 'Checking model';
  let tip = 'Checking which model the server is configured to use.';
  if (status) {
    if (!status.reachable) {
      dot = 'bg-rose-500';
      text = status.mode === 'artifact' ? 'Open on claude.ai' : 'Server offline';
      tip =
        status.mode === 'artifact'
          ? 'Live analysis runs when this page is opened on claude.ai.'
          : 'The FaultLine API server is not running.';
    } else if (!status.configured) {
      dot = 'bg-amber-500';
      text = 'API key missing';
      tip = status.setupHint || 'Add an API key to .env and save it.';
    } else {
      dot = 'bg-emerald-500';
      text = prettyModel(status.model) || status.name;
      tip = `${status.name} connected (${status.model}). Click to view settings.`;
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={tip}
      className="hidden h-8 items-center gap-2 rounded-full border border-rule bg-card-elevated px-3 text-[12.5px] font-semibold text-ink-2 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-hover hover:border-rule-strong hover:text-ink active:translate-y-0 active:scale-95 md:inline-flex"
    >
      <span className={cx('size-2 rounded-full', dot)} aria-hidden="true" />
      <span className="truncate max-w-[140px]">{text}</span>
    </button>
  );
}

export default function TopBar({
  view,
  title,
  onTitleChange,
  breadcrumbs = [],
  onHome,
  onNewCase,
  onOpenRecent,
  onOpenSettings,
  onToggleMobileSidebar,
  backToScenario,
  status,
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule/60 bg-sheet-translucent">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        {/* Left Side: Mobile Menu Button & Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          <IconButton
            label="Toggle navigation menu"
            onClick={onToggleMobileSidebar}
            className="lg:hidden text-ink"
          >
            <Menu className="size-5" />
          </IconButton>

          {/* Breadcrumb Navigation */}
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="flex items-center min-w-0">
              <ol className="flex items-center gap-1.5 text-[13px] text-ink-3 min-w-0">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <li key={idx} className="flex items-center gap-1.5 min-w-0">
                      {idx > 0 && (
                        <ChevronRight className="size-3.5 shrink-0 text-ink-3/70" aria-hidden="true" />
                      )}
                      {crumb.onClick && !isLast ? (
                        <button
                          type="button"
                          onClick={crumb.onClick}
                          className="truncate font-medium text-ink-2 hover:text-pen hover:underline underline-offset-2 transition-colors max-w-[140px] sm:max-w-[200px]"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span
                          className={cx(
                            'truncate',
                            isLast
                              ? 'font-bold text-ink max-w-[180px] sm:max-w-[320px]'
                              : 'font-medium text-ink-2 max-w-[140px]'
                          )}
                          aria-current={isLast ? 'page' : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : (
            <button
              type="button"
              onClick={onHome}
              className="flex items-center gap-2.5 rounded-md lg:hidden"
              aria-label="FaultLine"
            >
              <FaultMark className="size-7" />
              <span className="text-[17px] font-bold text-ink">FaultLine</span>
            </button>
          )}

          {/* Workspace Case Title Editing */}
          {view === 'workspace' && (
            <div className="hidden sm:flex items-center gap-2 min-w-0 ml-2">
              <span className="h-4 w-px bg-rule-strong" aria-hidden="true" />
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                aria-label="Case title"
                placeholder="Untitled case"
                maxLength={90}
                className="w-48 sm:w-64 truncate rounded-md bg-paper px-2.5 py-1 text-[13.5px] font-semibold text-ink outline-none focus:border-pen border border-rule focus:bg-card-elevated"
              />
            </div>
          )}
        </div>

        {/* Right Side: Status, Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          <ModelStatus status={status} onClick={onOpenSettings} />

          {backToScenario && (
            <Button
              variant="secondary"
              size="sm"
              onClick={backToScenario.onClick}
              title={`Back to scenario ${backToScenario.id}`}
              className="text-[13px] h-8"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Scenario</span> {backToScenario.id}
            </Button>
          )}

          <IconButton
            label="Recent cases"
            onClick={onOpenRecent}
            className="border border-rule bg-card-elevated text-ink-2 hover:bg-hover hover:text-ink"
          >
            <Clock className="size-4" />
          </IconButton>

          <IconButton
            label="Settings & Appearance"
            onClick={onOpenSettings}
            className="border border-rule bg-card-elevated text-ink-2 hover:bg-hover hover:text-ink"
          >
            <Settings className="size-4" />
          </IconButton>

          {view === 'workspace' && (
            <Button variant="secondary" size="sm" onClick={onNewCase} className="h-8 text-[13px]">
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">New Case</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
