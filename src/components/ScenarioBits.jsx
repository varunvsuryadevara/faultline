import { CircleAlert, CircleCheck, CircleHelp, OctagonAlert, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { intentFamily, labelOf } from '../../shared/scenarios/vocab.js';
import { cx } from './ui.jsx';

// Small pieces shared by the scenario library screens. Colour stays reserved for risk (a status),
// always paired with an icon and a word; everything else is ink on paper.

const RISK_STYLE = {
  low: { icon: ShieldCheck, cls: 'bg-agree-wash text-agree-ink border border-agree/30 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/30', iconCls: 'text-agree dark:text-emerald-400' },
  medium: { icon: CircleAlert, cls: 'bg-minor-wash text-minor-ink border border-minor/30 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30', iconCls: 'text-minor dark:text-amber-400' },
  high: { icon: TriangleAlert, cls: 'bg-major-wash text-major-ink border border-major/30 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-500/30', iconCls: 'text-major dark:text-orange-400' },
  critical: { icon: OctagonAlert, cls: 'bg-critical-wash text-critical-ink border border-critical/30 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-500/30', iconCls: 'text-critical dark:text-rose-400' },
};

export function RiskBadge({ risk, className }) {
  const s = RISK_STYLE[risk] ?? RISK_STYLE.medium;
  const Icon = s.icon;
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-[12px] font-semibold tracking-tight shadow-xs', s.cls, className)}>
      <Icon className={cx('size-3.5', s.iconCls)} strokeWidth={2.4} aria-hidden="true" />
      {labelOf('risk', risk)}
    </span>
  );
}

const FAMILY_STYLE = {
  genuine: { icon: CircleCheck, cls: 'bg-agree-wash text-agree-ink border border-agree/30 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/30', iconCls: 'text-agree dark:text-emerald-400' },
  uncertain: { icon: CircleHelp, cls: 'bg-major-wash text-major-ink border border-major/30 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30', iconCls: 'text-major dark:text-amber-400' },
  disputed: { icon: CircleAlert, cls: 'bg-pen-wash text-pen-dark border border-pen/30 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-500/30', iconCls: 'text-pen dark:text-blue-400' },
  fraud: { icon: ShieldAlert, cls: 'bg-critical-wash text-critical-ink border border-critical/30 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-500/30', iconCls: 'text-critical dark:text-rose-400' },
  neutral: { icon: CircleHelp, cls: 'bg-paper text-ink-2 border border-rule dark:bg-slate-900/80 dark:text-slate-300 dark:border-slate-700', iconCls: 'text-ink-3 dark:text-slate-400' },
};

export function IntentTag({ intent, className }) {
  const fam = intentFamily(intent);
  const style =
    intent === 'disputed'
      ? FAMILY_STYLE.disputed
      : intent === 'insufficient-evidence'
        ? FAMILY_STYLE.neutral
        : FAMILY_STYLE[fam] ?? FAMILY_STYLE.neutral;
  const Icon = style.icon;
  return (
    <span
      className={cx(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[6px] border px-2 text-[12px] font-semibold tracking-tight shadow-xs',
        style.cls,
        className,
      )}
    >
      <Icon className={cx('size-3.5', style.iconCls)} strokeWidth={2.2} aria-hidden="true" />
      {labelOf('intent', intent)}
    </span>
  );
}

export function Chip({ children, className }) {
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center rounded-[5px] bg-hover px-2 text-[12.5px] font-medium text-ink-2 border border-rule/50', className)}>
      {children}
    </span>
  );
}

// A folder tab, styled for dark theme with crisp border
export function FolderTab({ children, className }) {
  return (
    <span className={cx('inline-flex h-[26px] items-center rounded-t-[7px] bg-manila border-t border-x border-rule px-3 text-[12.5px] font-semibold text-manila-ink', className)}>
      {children}
    </span>
  );
}

export function SectionHeading({ children, count, className }) {
  return (
    <h3 className={cx('flex items-baseline gap-2 text-[15px] font-semibold text-ink', className)}>
      {children}
      {count !== undefined && <span className="text-[13px] font-normal text-ink-3">{count}</span>}
    </h3>
  );
}

export function BulletList({ items, empty = 'None noted.', ordered = false, className }) {
  if (!items?.length) return <p className={cx('mt-1.5 text-[14.5px] text-ink-3', className)}>{empty}</p>;
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={cx('mt-2 space-y-1.5 text-[14.5px] leading-relaxed text-ink', ordered ? 'list-decimal pl-5 marker:text-ink-3' : '', className)}>
      {items.map((item, i) => (
        <li key={i} className={ordered ? 'pl-1' : 'relative pl-4 before:absolute before:left-0 before:top-[0.62em] before:size-1.5 before:rounded-full before:bg-ink-3/60'}>
          {item}
        </li>
      ))}
    </List>
  );
}
