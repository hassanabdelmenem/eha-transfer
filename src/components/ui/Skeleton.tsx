import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Base skeleton block. Decorative only (aria-hidden) — the accessible "this is
 * loading" announcement belongs on the wrapping <SkeletonGroup>, not on every
 * individual bar, or a screen reader would hear "loading, loading, loading…"
 * once per placeholder.
 *
 * `motion-safe:animate-pulse`, not `animate-pulse`: a bare `animate-pulse`
 * ignores prefers-reduced-motion, and a whole screen of pulsing gray blocks is
 * exactly the kind of large-area repeating motion that setting is meant to
 * suppress. Under reduced motion this still renders as a static gray block —
 * the "something is loading here" cue survives, only the animation drops.
 */
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    aria-hidden="true"
    className={cn('rounded bg-slate-200 dark:bg-slate-800 motion-safe:animate-pulse', className)}
    {...props}
  />
);

/**
 * Wraps a group of <Skeleton> placeholders with the one live-region
 * announcement a screen reader needs for the whole group: role="status" plus
 * aria-busy so assistive tech knows this region is mid-load, and a single
 * sr-only label (default "Loading…") instead of per-bar noise. Visually this
 * renders nothing but its children.
 */
export const SkeletonGroup: React.FC<{ label?: string; className?: string; children: React.ReactNode }> = ({
  label = 'Loading…',
  className,
  children,
}) => (
  <div role="status" aria-busy="true" aria-live="polite" className={className}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);

/** A single line of placeholder text. */
export const SkeletonLine: React.FC<{ className?: string; width?: string }> = ({ className, width = 'w-full' }) => (
  <Skeleton className={cn('h-3', width, className)} />
);

/** Mirrors the KPI stat tiles at the top of Dashboard/AdminDashboard. */
export const SkeletonStatCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 border border-slate-200 dark:border-slate-800 rounded shadow-sm bg-white dark:bg-slate-900', className)}>
    <Skeleton className="h-3 w-24 mb-3" />
    <Skeleton className="h-8 w-14" />
  </div>
);

/** Mirrors one row of ReferralList's mobile card layout. */
export const SkeletonReferralCard: React.FC = () => (
  <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-16 shrink-0" />
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-2 w-2 rounded-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

/** Mirrors one row of ReferralList's desktop table layout. */
export const SkeletonReferralRow: React.FC = () => (
  <tr className="border-b border-slate-100 dark:border-slate-800">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-3.5" style={{ width: `${55 + (i % 3) * 15}%` }} />
      </td>
    ))}
  </tr>
);

/**
 * Drop-in replacement for a referral list while DataContext is still loading.
 * `count` should roughly match how many rows a caller expects on a typical
 * screen, so the layout doesn't visibly jump once real data lands.
 */
export const SkeletonReferralList: React.FC<{ count?: number; variant?: 'cards' | 'table' }> = ({
  count = 5,
  variant = 'cards',
}) => (
  <SkeletonGroup label="Loading referrals…" className={variant === 'cards' ? 'space-y-3' : 'contents'}>
    {variant === 'cards'
      ? Array.from({ length: count }).map((_, i) => <SkeletonReferralCard key={i} />)
      : Array.from({ length: count }).map((_, i) => <SkeletonReferralRow key={i} />)}
  </SkeletonGroup>
);

/** Mirrors a Card-wrapped block of prose/detail content (e.g. ReferralDetailPage). */
export const SkeletonDetailBlock: React.FC<{ lines?: number; className?: string }> = ({ lines = 4, className }) => (
  <SkeletonGroup label="Loading…" className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? 'w-1/2' : 'w-full'} />
    ))}
  </SkeletonGroup>
);

/** Mirrors a facility/bed-management table row. */
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr className="border-b border-slate-100 dark:border-slate-800">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-3.5 w-3/4" />
      </td>
    ))}
  </tr>
);
