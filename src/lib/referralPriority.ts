import { Referral, ReferralPriority } from '../types';

/**
 * Workflow ordering shared by every mobile list: escalated cases pinned on
 * top, then emergency -> urgent -> routine, then longest-waiting first within
 * a tier. Replaces the newest-first default that buried what actually needs a
 * decision under whatever was most recently touched.
 */
const PRIORITY_WEIGHT: Record<ReferralPriority, number> = {
  emergency: 2,
  urgent: 1,
  routine: 0,
};

export function sortByWorkflow<T extends Pick<Referral, 'isEscalated' | 'priority' | 'createdAt'>>(
  referrals: T[]
): T[] {
  return [...referrals].sort((a, b) => {
    if (!!a.isEscalated !== !!b.isEscalated) return a.isEscalated ? -1 : 1;
    const priorityDelta = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (priorityDelta !== 0) return priorityDelta;
    // Oldest first within a tier: the case that has waited longest is the one
    // the workflow most needs surfaced.
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

/** 5-6px left rail colour, carrying priority alongside the text chip -- never colour alone. */
export function priorityRailClass(priority: ReferralPriority, escalated?: boolean): string {
  if (escalated) return 'border-l-[6px] border-critical-700';
  if (priority === 'emergency') return 'border-l-[6px] border-critical-600';
  if (priority === 'urgent') return 'border-l-[6px] border-warning-500';
  return 'border-l-[6px] border-slate-200 dark:border-slate-700';
}

export function priorityChipClasses(priority: ReferralPriority): string {
  if (priority === 'emergency') return 'bg-critical-700 text-white dark:bg-critical-600';
  if (priority === 'urgent') return 'bg-warning-100 text-warning-800 border border-warning-700 dark:bg-warning-900/40 dark:text-warning-300 dark:border-warning-700';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function priorityLabel(priority: ReferralPriority): string {
  return priority.toUpperCase();
}
