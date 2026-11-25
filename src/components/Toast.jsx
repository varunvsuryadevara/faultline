import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, Sparkles, Trash2, X } from 'lucide-react';

function getToastIcon(message = '') {
  const lower = message.toLowerCase();
  if (lower.includes('deleted') || lower.includes('cleared') || lower.includes('removed')) {
    return { Icon: Trash2, cls: 'text-rose-400 bg-rose-500/20' };
  }
  if (lower.includes('saved') || lower.includes('added') || lower.includes('restored') || lower.includes('updated')) {
    return { Icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/20' };
  }
  if (lower.includes('ai') || lower.includes('assessment') || lower.includes('cross-examin')) {
    return { Icon: Sparkles, cls: 'text-pen bg-pen/20' };
  }
  if (lower.includes('error') || lower.includes('failed') || lower.includes('cannot')) {
    return { Icon: AlertCircle, cls: 'text-amber-400 bg-amber-500/20' };
  }
  return { Icon: Info, cls: 'text-blue-400 bg-blue-500/20' };
}

export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [toast, onDone]);

  if (!toast) return null;

  const { Icon, cls } = getToastIcon(toast.message);

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div
        key={toast.id}
        className="pointer-events-auto flex items-center gap-3 rounded-[10px] border border-rule-strong bg-sheet px-4 py-2.5 text-[14px] font-medium text-ink shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur-md animate-slide-up max-w-md"
      >
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${cls}`}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="flex-1">{toast.message}</span>
        <button
          type="button"
          onClick={onDone}
          className="rounded p-1 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
