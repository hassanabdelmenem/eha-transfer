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

/**
 * Fill for the 6px priority rail, drawn as its own element at the card's left
 * edge. It always pairs with the chip's text, so priority never rests on colour.
 */
export function priorityRailFill(priority: ReferralPriority, escalated?: boolean): string {
  if (escalated || priority === 'emergency') return 'bg-critical-700';
  if (priority === 'urgent') return 'bg-warning-800';
  return 'bg-slate-300 dark:bg-white/25';
}

/** Rail as a thick left border, for table rows that can't hold an element. */
export function priorityRailClass(priority: ReferralPriority, escalated?: boolean): string {
  if (escalated || priority === 'emergency') return 'border-s-[6px] border-critical-700';
  if (priority === 'urgent') return 'border-s-[6px] border-warning-800';
  return 'border-s-[6px] border-slate-300 dark:border-white/25';
}

export function priorityChipClasses(priority: ReferralPriority): string {
  if (priority === 'emergency') return 'bg-critical-700 text-white';
  if (priority === 'urgent') return 'bg-warning-100 text-warning-800';
  return 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/75';
}

/** Colour of the one sentence naming what the card needs, matched to its priority. */
export function priorityAskClass(priority: ReferralPriority, escalated?: boolean): string {
  if (escalated || priority === 'emergency') return 'text-critical-700 dark:text-critical-300';
  if (priority === 'urgent') return 'text-warning-800 dark:text-warning-300';
  return 'text-slate-700 dark:text-white/75';
}

export function priorityLabel(priority: ReferralPriority): string {
  return priority.toUpperCase();
}
