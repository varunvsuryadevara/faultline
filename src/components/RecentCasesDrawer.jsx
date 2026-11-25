import { useEffect, useRef } from 'react';
import { Clock, ExternalLink, Trash2, X } from 'lucide-react';
import { clearRecentCases } from '../lib/recentCases.js';
import { IntentTag, RiskBadge } from './ScenarioBits.jsx';
import { Button, IconButton, cx } from './ui.jsx';

export default function RecentCasesDrawer({ open, recentCases = [], onOpenCase, onClose, onRefreshRecent }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const isNavigatingRef = useRef(false);
  const onCloseRef = useRef(onClose);

  // Keep latest onClose callback reference without causing stale closures
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Keyboard dismissal (Escape key), body scroll locking, and focus restoration
  useEffect(() => {
    if (!open) return undefined;

    // Capture the trigger element that opened the drawer
    if (typeof document !== 'undefined' && document.activeElement) {
      triggerRef.current = document.activeElement;
    }
    isNavigatingRef.current = false;

    // Lock body scrolling while the modal drawer is active
    const originalOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;

      // Ensure Escape closes only the active/topmost dismissible overlay
      if (typeof document !== 'undefined' && dialogRef.current) {
        const allDialogs = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"]'));
        if (allDialogs.length > 1) {
          const myDialog = dialogRef.current;
          const myIndex = allDialogs.indexOf(myDialog);
          const hasOverlayAbove = allDialogs.some((d, idx) => {
            if (d === myDialog || d.contains(myDialog) || myDialog.contains(d)) return false;
            const style = window.getComputedStyle(d);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
            const myZ = parseInt(window.getComputedStyle(myDialog).zIndex, 10) || 50;
            const otherZ = parseInt(style.zIndex, 10) || 50;
            if (otherZ > myZ) return true;
            if (otherZ === myZ && idx > myIndex) return true;
            return false;
          });

          if (hasOverlayAbove) {
            // Another modal or dialog is currently above this drawer; let it dismiss first
            return;
          }
        }
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      onCloseRef.current?.();
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);

      // Restore body scrolling
      if (typeof document !== 'undefined') {
        document.body.style.overflow = originalOverflow;
      }

      // Restore focus to trigger element only when closing without opening a case
      if (!isNavigatingRef.current && triggerRef.current && typeof triggerRef.current.focus === 'function') {
        try {
          triggerRef.current.focus();
        } catch {}
      }
    };
  }, [open]);

  if (!open) return null;

  const handleClear = () => {
    clearRecentCases();
    onRefreshRecent?.();
  };

  const handleSelectCase = (id) => {
    isNavigatingRef.current = true;
    onOpenCase?.(id);
    onClose?.();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-md flex-col border-l border-rule bg-sheet shadow-2xl animate-slide-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-pen" />
            <h2 id="recent-title" className="text-[17px] font-bold text-ink">
              Recent Investigations
            </h2>
          </div>
          <IconButton label="Close drawer" onClick={onClose} autoFocus>
            <X className="size-5" />
          </IconButton>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {recentCases.length === 0 ? (
            <div className="py-12 text-center text-ink-3">
              <Clock className="mx-auto size-8 opacity-40 mb-2" />
              <p className="text-[14px]">No recent cases yet.</p>
              <p className="mt-1 text-[12.5px]">Cases you open or investigate will appear here.</p>
            </div>
          ) : (
            recentCases.map((c) => (
              <div
                key={c.id}
                tabIndex={0}
                role="button"
                onClick={() => handleSelectCase(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectCase(c.id);
                  }
                }}
                className="group cursor-pointer rounded-[9px] border border-rule bg-paper p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-pen/60 hover:bg-sheet hover:shadow-xs active:translate-y-0 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[13px] text-pen">{c.id}</span>
                  <div className="flex items-center gap-1.5">
                    {c.isCustom && (
                      <span className="rounded bg-pen/15 px-1.5 py-0.5 text-[11px] font-semibold text-pen">
                        Custom
                      </span>
                    )}
                    <span className="text-[11.5px] text-ink-3">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <h4 className="mt-1 text-[14px] font-semibold text-ink line-clamp-2 leading-snug group-hover:text-pen">
                  {c.title}
                </h4>
                <div className="mt-2.5 flex items-center justify-between border-t border-rule/60 pt-2">
                  <div className="flex items-center gap-1.5 scale-90 -ml-1">
                    {c.decision && (
                      <span
                        className={cx(
                          'rounded px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider border',
                          c.decision === 'APPROVE'
                            ? 'bg-agree/20 text-agree-ink border-agree/30'
                            : c.decision === 'REJECT'
                              ? 'bg-critical/20 text-critical-ink border-critical/30'
                              : 'bg-minor/20 text-minor-ink border-minor/30',
                        )}
                      >
                        {c.decision}
                      </span>
                    )}
                    <IntentTag intent={c.intent} />
                    <RiskBadge risk={c.risk} />
                  </div>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-pen group-hover:underline">
                    Open <ExternalLink className="size-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {recentCases.length > 0 && (
          <div className="border-t border-rule p-4 bg-paper/50 flex justify-between items-center">
            <span className="text-[12.5px] text-ink-3">
              {recentCases.length} recent {recentCases.length === 1 ? 'case' : 'cases'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-critical-ink hover:bg-critical-wash">
              <Trash2 className="size-3.5" />
              Clear History
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
