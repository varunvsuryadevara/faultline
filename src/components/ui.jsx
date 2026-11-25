import { useState } from 'react';
import { Check, CircleAlert, Copy, LoaderCircle, OctagonAlert, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { SEVERITY_LABEL } from '../lib/format.js';
import { copyText } from '../lib/report.js';

const cx = (...parts) => parts.filter(Boolean).join(' ');
export { cx };

const BUTTON = {
  primary:
    'bg-pen text-white shadow-sm hover:bg-pen-bright hover:shadow-[0_0_16px_rgba(70,92,230,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:bg-pen/30 disabled:text-white/50 disabled:shadow-none disabled:transform-none',
  secondary:
    'border border-rule bg-sheet text-ink hover:border-pen/50 hover:bg-hover hover:text-pen-dark dark:hover:text-white hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 active:scale-[0.985] disabled:text-ink-3 disabled:border-rule/50 disabled:transform-none',
  ghost:
    'text-ink-2 hover:bg-hover hover:text-ink active:scale-[0.985] disabled:text-ink-3 disabled:transform-none',
  danger:
    'border border-critical/40 bg-critical-wash text-critical-ink hover:border-critical hover:bg-critical-wash/80 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985] disabled:transform-none',
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled = false, className, children, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-[7px] font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen focus-visible:ring-offset-2 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-2.5 text-[13.5px]' : 'h-10 px-4 text-[15px]',
        BUTTON[variant],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-md text-ink-3 transition-all duration-150 ease-out hover:bg-hover hover:text-ink hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pen',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const SEVERITY_STYLE = {
  critical: { icon: OctagonAlert, cls: 'bg-critical-wash text-critical-ink border border-critical/30', iconCls: 'text-critical' },
  major: { icon: TriangleAlert, cls: 'bg-major-wash text-major-ink border border-major/30', iconCls: 'text-major' },
  minor: { icon: CircleAlert, cls: 'bg-minor-wash text-minor-ink border border-minor/30', iconCls: 'text-minor' },
};

export function SeverityBadge({ severity, className }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.major;
  const Icon = s.icon;
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[5px] pl-1.5 pr-2 text-[12.5px] font-semibold border', s.cls, className)}>
      <Icon className={cx('size-3.5', s.iconCls)} strokeWidth={2.4} aria-hidden="true" />
      {SEVERITY_LABEL[severity] ?? 'Major'}
    </span>
  );
}

export function SeverityIcon({ severity, className = 'size-4' }) {
  const s = SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.major;
  const Icon = s.icon;
  return <Icon className={cx(className, s.iconCls)} strokeWidth={2.4} aria-label={SEVERITY_LABEL[severity]} />;
}

// Exhibits are identified by letter, like a case file, not by colour.
export function ExhibitTag({ id, label, className }) {
  return (
    <span
      title={label ? `Exhibit ${id}: ${label}` : `Exhibit ${id}`}
      className={cx(
        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] bg-manila border border-rule px-1 text-[11.5px] font-bold leading-none text-manila-ink',
        className,
      )}
    >
      {id}
    </span>
  );
}

const MATCH_STYLE = {
  exact: { icon: ShieldCheck, text: 'Word for word', cls: 'text-agree-ink' },
  close: { icon: ShieldCheck, text: 'Close match', cls: 'text-minor-ink' },
  missing: { icon: ShieldAlert, text: 'Not found in exhibit', cls: 'text-critical-ink' },
};

export function MatchBadge({ match, compact = false }) {
  const s = MATCH_STYLE[match?.status] ?? MATCH_STYLE.missing;
  const Icon = s.icon;
  const tip =
    match?.status === 'exact'
      ? 'FaultLine found this quote in the exhibit, character for character.'
      : match?.status === 'close'
        ? 'FaultLine found this passage with small wording differences.'
        : 'FaultLine could not find this quote in the exhibit. Treat this point with caution.';
  return (
    <span className={cx('inline-flex items-center gap-1 text-[12.5px] font-medium', s.cls)} title={tip}>
      <Icon className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
      {compact ? <span className="sr-only">{s.text}</span> : s.text}
    </span>
  );
}

export function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied', onCopied, className }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          onCopied?.();
          setTimeout(() => setDone(false), 1600);
        }
      }}
      className={cx('inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] font-medium text-pen hover:bg-pen/10', className)}
    >
      {done ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {done ? copiedLabel : label}
    </button>
  );
}

export function Kbd({ children }) {
  return (
    <kbd className="rounded-[4px] border border-rule bg-card-elevated px-1.5 py-0.5 font-sans text-[11.5px] font-semibold text-ink-2 shadow-xs">
      {children}
    </kbd>
  );
}
