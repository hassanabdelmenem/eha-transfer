import React, { useEffect, useState } from 'react';
import { Referral } from '../../types';
import { isSlaTracked, secondsUntilSlaBreach } from '../../lib/sla';
import { cn } from '../../lib/utils';

// The pieces every role home is built from, in the handoff's order:
// headline count -> one line of ordering rationale -> optional segmented
// control -> the card column -> optional action bar. The queue's order is the
// ranking; nothing here is allowed to compete with it.

export const RoleHomeHeadline: React.FC<{ title: string; rationale: string }> = ({ title, rationale }) => (
  <div>
    <h1 className="font-heading text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink text-balance dark:text-paper">
      {title}
    </h1>
    <p className="mt-1.5 text-[14.5px] leading-[1.45] text-slate-700 dark:text-white/65">{rationale}</p>
  </div>
);

/** 11px/700 tracked label that heads a section of the card column. */
export const MicroLabel: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className, id }) => (
  <h2 id={id} className={cn('text-[11px] font-bold uppercase leading-none tracking-[0.09em] text-slate-500 dark:text-white/60', className)}>
    {children}
  </h2>
);

export interface Segment<K extends string> {
  key: K;
  label: string;
  count: number;
}

/** Equal-width segments, each carrying its own case count. */
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
  label,
}: {
  segments: Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {segments.map(s => {
        const active = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(s.key)}
            className={cn(
              'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700 focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:focus-visible:ring-offset-ink',
              active
                ? 'border-ink bg-ink text-paper dark:border-paper dark:bg-paper dark:text-ink'
                : 'border-slate-200 bg-white text-ink hover:bg-slate-50 dark:border-white/15 dark:bg-white/[0.04] dark:text-paper dark:hover:bg-white/10'
            )}
          >
            <span className="text-[14.5px] font-semibold leading-tight">{s.label}</span>
            <span className={cn('mt-0.5 text-[11.5px] leading-tight', active ? 'text-paper/70 dark:text-ink/70' : 'text-slate-500 dark:text-white/60')}>
              {s.count} {s.count === 1 ? 'case' : 'cases'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A plain, quiet line where a queue would be. */
export const EmptyQueue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-[14.5px] leading-[1.45] text-slate-700 dark:border-white/20 dark:text-white/65">
    {children}
  </p>
);

/**
 * The action bar: pinned to the bottom of the phone screen while the queue
 * scrolls under it, inline under the queue on desktop. Bleeds to the screen
 * edges so the hairline spans the full width.
 */
export const HomeActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  // bottom: -2.5rem cancels <main>'s pb-10, which otherwise insets the sticky edge.
  <div className="sticky -bottom-10 z-30 -mx-[18px] -mb-10 mt-6 flex gap-2.5 border-t border-slate-200 bg-paper px-[18px] pt-3 pb-[max(16px,env(safe-area-inset-bottom))] dark:border-white/12 dark:bg-ink lg:static lg:mx-0 lg:mb-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-0 dark:lg:bg-transparent">
    {children}
  </div>
);

export const actionBarPrimary =
  'inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[16px] font-semibold text-paper transition-colors hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200';
export const actionBarSquare =
  'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-ink transition-colors hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';

/** One clock for every SLA countdown on the screen, ticking once a second. */
export function useSecondTick(enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * "8:12 left" under the priority chip. Scope and threshold come from lib/sla,
 * so it cannot drift from the escalation that acts on it; an untracked case
 * says "no clock" rather than showing nothing, so its absence is never read as
 * "plenty of time". The visible text ticks; screen readers get a coarse
 * minute-level label so they are not re-read every second.
 */
export const SlaClock: React.FC<{ referral: Referral; now: number }> = ({ referral, now }) => {
  if (!isSlaTracked(referral)) {
    return <span className="text-[12.5px] font-medium text-slate-500 dark:text-white/60">no clock</span>;
  }
  const left = secondsUntilSlaBreach(referral, now);
  if (left === null) return null;
  const over = left <= 0;
  const text = over ? `+${clock(Math.abs(left))} over` : `${clock(left)} left`;
  const spoken = over
    ? `SLA passed ${Math.floor(Math.abs(left) / 60)} minutes ago`
    : `${Math.ceil(left / 60)} minutes left on the SLA`;
  return (
    <span
      aria-label={spoken}
      className={cn(
        'text-[13px] font-bold tabular-nums',
        over || referral.priority === 'emergency' ? 'text-critical-700 dark:text-critical-300' : 'text-warning-800 dark:text-warning-300'
      )}
    >
      {text}
    </span>
  );
};
