import { useEffect } from 'react';
import {
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  FilePlus2,
  FolderGit2,
  LayoutDashboard,
  Scale,
  ScanSearch,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { FaultMark } from './TopBar.jsx';
import { FaultLineCompanionIcon } from './Companion/FaultLineCloudCompanion.jsx';

export default function Sidebar({
  view,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onGoHome,
  onGoLibrary,
  onGoRegulations,
  onGoIntelligence,
  onGoSavedScenarios,
  onNewCase,
  onOpenRecent,
  onOpenSettings,
  libraryCount = 266,
  customCount = 0,
  recentCount = 0,
  status,
}) {
  // Shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        onToggleCollapse?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleCollapse]);

  const navSections = [
    {
      title: 'OPERATIONS',
      items: [
        {
          id: 'landing',
          label: 'Dashboard',
          icon: LayoutDashboard,
          active: view === 'landing',
          onClick: () => {
            onGoHome();
            onCloseMobile?.();
          },
        },
        {
          id: 'workspace',
          label: 'New Investigation',
          icon: FilePlus2,
          active: view === 'workspace',
          onClick: () => {
            onNewCase();
            onCloseMobile?.();
          },
        },
        {
          id: 'saved',
          label: 'Saved & Custom Cases',
          icon: BookmarkCheck,
          badge: customCount > 0 ? `${customCount}` : null,
          onClick: () => {
            onGoSavedScenarios();
            onCloseMobile?.();
          },
        },
        {
          id: 'recent',
          label: 'Recent Investigations',
          icon: Clock,
          badge: recentCount > 0 ? `${recentCount}` : null,
          onClick: () => {
            onOpenRecent();
            onCloseMobile?.();
          },
        },
      ],
    },
    {
      title: 'RESEARCH & INTELLIGENCE',
      items: [
        {
          id: 'library',
          label: 'Scenario Library',
          icon: Database,
          active: view === 'library' || view === 'scenario',
          badge: libraryCount ? `${libraryCount}` : null,
          onClick: () => {
            onGoLibrary();
            onCloseMobile?.();
          },
        },
        {
          id: 'legal-library',
          label: 'Legal & Regulatory Library',
          icon: Scale,
          active: view === 'legal-library' || view === 'regulations',
          badge: '20 Jurisdictions',
          onClick: () => {
            onGoRegulations?.();
            onCloseMobile?.();
          },
        },
        {
          id: 'intelligence',
          label: 'FaultLine Chatbot',
          icon: FaultLineCompanionIcon,
          active: view === 'intelligence' || view === 'chat',
          badge: 'AI',
          onClick: () => {
            onGoIntelligence?.();
            onCloseMobile?.();
          },
        },
      ],
    },
  ];

  const sidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col justify-between">
      {/* Brand & Links */}
      <div>
        {/* Logo Header */}
        <div
          className={`flex items-center border-b border-rule ${
            collapsed && !isMobile ? 'justify-center p-3' : 'justify-between px-5 py-4'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              onGoHome();
              onCloseMobile?.();
            }}
            className="flex items-center gap-3 text-left transition-colors duration-150 hover:opacity-90"
            title="FaultLine Dashboard"
          >
            <FaultMark className="size-8 shrink-0 shadow-xs" />
            {(!collapsed || isMobile) && (
              <div>
                <span className="block text-[18px] font-bold tracking-tight text-ink">FaultLine</span>
                <span className="block text-[11px] font-medium text-ink-3">Claims Intelligence</span>
              </div>
            )}
          </button>
          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded-md p-1.5 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex size-7 items-center justify-center rounded-md border border-rule bg-card-elevated text-ink-3 hover:bg-hover hover:text-ink hover:border-pen/40 transition-colors duration-150"
              title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-4" aria-label="Main navigation">
          {navSections.map((sec, secIdx) => (
            <div key={sec.title || secIdx} className="space-y-1.5">
              {(!collapsed || isMobile) && sec.title && (
                <div className="px-3 pt-1 pb-0.5 text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isItemActive = item.active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`group relative flex w-full items-center gap-3 rounded-[8px] border transition-colors duration-150 ${
                      collapsed && !isMobile ? 'justify-center p-2.5' : 'px-3 py-2.5 text-left'
                    } ${
                      isItemActive
                        ? 'border-pen/30 bg-pen-wash text-pen-dark font-semibold shadow-2xs dark:border-pen/50 dark:bg-pen dark:text-white dark:shadow-[0_0_15px_rgba(79,107,255,0.3)]'
                        : 'border-transparent text-ink-2 font-medium hover:border-rule-strong hover:bg-hover hover:text-ink'
                    }`}
                    aria-label={item.label}
                  >
                    {/* Active indicator bar */}
                    {isItemActive && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-pen dark:bg-cyan" />
                    )}

                    <Icon
                      className={`size-[18px] shrink-0 transition-colors duration-150 ${
                        isItemActive
                          ? 'text-pen dark:text-white'
                          : 'text-ink-3 group-hover:text-pen'
                      }`}
                    />
                    {(!collapsed || isMobile) && (
                      <span className="flex-1 truncate text-[14px]">{item.label}</span>
                    )}
                    {(!collapsed || isMobile) && item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular ${
                          isItemActive
                            ? 'bg-pen/15 text-pen-dark dark:bg-white/20 dark:text-white'
                            : 'bg-paper border border-rule/60 text-ink-2'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Floating tooltip when collapsed */}
                    {collapsed && !isMobile && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-full ml-3 z-50 rounded-md border border-rule bg-sheet px-2.5 py-1 text-[12px] font-semibold text-ink shadow-2xl opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap"
                      >
                        {item.label}
                        {item.badge && <span className="ml-1.5 opacity-80">({item.badge})</span>}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rule" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Area: AI Engine indicator & Settings */}
      <div className="border-t border-rule/50 p-3 space-y-2 bg-paper/30">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onCloseMobile?.();
          }}
          className={`group relative flex w-full items-center gap-3 rounded-[8px] p-2 text-left transition-colors duration-150 bg-card-elevated border border-rule/60 hover:bg-hover hover:border-rule ${
            collapsed && !isMobile ? 'justify-center' : ''
          }`}
          aria-label="AI Settings & Status"
        >
          <div className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-pen/15 text-pen-bright transition-colors duration-150">
            <Cpu className="size-4" />
            <span
              className={`absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-sheet ${
                status?.configured && status?.reachable ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-bold text-ink">
                {status?.name || 'Claude'}
              </span>
              <span className="block truncate text-[11px] text-ink-3">
                {status?.configured ? 'AI Engine Ready' : 'Key missing'}
              </span>
            </div>
          )}

          {/* Floating Tooltip in collapsed mode */}
          {collapsed && !isMobile && (
            <div
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 z-50 rounded-md border border-rule bg-sheet px-2.5 py-1 text-[12px] font-semibold text-ink shadow-2xl opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap"
            >
              {status?.name || 'Claude'} • {status?.configured ? 'Online' : 'Config required'}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rule" />
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onCloseMobile?.();
          }}
          className={`group relative flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-hover hover:text-ink transition-colors duration-150 ${
            collapsed && !isMobile ? 'justify-center px-0' : ''
          }`}
          aria-label="Settings"
        >
          <Settings className="size-4 shrink-0 transition-colors duration-150 group-hover:text-ink" />
          {(!collapsed || isMobile) && <span>Settings</span>}

          {/* Floating Tooltip in collapsed mode */}
          {collapsed && !isMobile && (
            <div
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 z-50 rounded-md border border-rule bg-sheet px-2.5 py-1 text-[12px] font-semibold text-ink shadow-2xl opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 whitespace-nowrap"
            >
              Application Settings
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-rule" />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-rule/50 bg-sidebar-translucent transition-[width] duration-250 ease-in-out z-30 shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-[250px]'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex lg:hidden bg-black/75 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-rule bg-sidebar-translucent shadow-2xl animate-slide-right">
            {sidebarContent(true)}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
}
