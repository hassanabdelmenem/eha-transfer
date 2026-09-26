import React from 'react';
import { Referral, ReferralStatus, DeptApprovalStatus, User } from '../../types';
import { format, isSameDay } from 'date-fns';
import { cn } from '../../lib/utils';

export interface ReferralTimelineProps {
  referral: Referral;
  users?: User[];
  usersById?: Map<string, User>;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  userId: string;
  title: string;
  note?: string;
  noteKind?: 'dept' | 'action';
  /** A department's decision, spoken in the by-line ("Direct approval"). */
  decision?: string;
  dot: string;
}

// Dot colours: success for approvals, arrival and admission; critical for
// rejection and escalation; warning for waiting; info for transit; violet for
// department notes, so a dept note never reads as an action note beside it.
const STATUS_EVENT: Partial<Record<ReferralStatus, { title: string; dot: string }>> = {
  pending: { title: 'Referral sent', dot: 'bg-warning-500' },
  dept_approved: { title: 'Department approved', dot: 'bg-success-500' },
  manager_approved: { title: 'Manager accepted the transfer', dot: 'bg-success-500' },
  accepted: { title: 'Transfer accepted', dot: 'bg-success-500' },
  patient_consented: { title: 'Consent recorded', dot: 'bg-success-500' },
  in_transit: { title: 'Dispatched', dot: 'bg-info-500' },
  arrived: { title: 'Arrived', dot: 'bg-success-500' },
  admitted: { title: 'Admitted', dot: 'bg-success-500' },
  discharged: { title: 'Discharged', dot: 'bg-success-500' },
  rejected: { title: 'Declined', dot: 'bg-critical-500' },
  postponed: { title: 'Postponed', dot: 'bg-purple-500' },
  cancelled: { title: 'Cancelled', dot: 'bg-slate-400' },
};

const DEPT_EVENT: Partial<Record<DeptApprovalStatus, (dept: string) => string>> = {
  direct_approval: dept => `Approved by ${dept}`,
  urgent_approval: dept => `Urgent approval by ${dept}`,
  scheduled_approval: dept => `Scheduled by ${dept}`,
  requirements_needed: dept => `${dept} asked for requirements`,
};

/** "09:18" today, "12 Aug, 09:18" otherwise; the same fallbacks as formatDateTime. */
function whenShort(iso?: string): string {
  if (!iso) return 'Unknown Time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Invalid Date';
  return isSameDay(d, new Date()) ? format(d, 'HH:mm') : format(d, 'd MMM, HH:mm');
}

export const ReferralTimeline: React.FC<ReferralTimelineProps> = ({ referral, users, usersById }) => {
  const userOf = (id: string) => (usersById ? usersById.get(id) : users?.find(u => u.id === id));
  const events: TimelineEvent[] = [];

  (Array.isArray(referral.statusHistory) ? referral.statusHistory : []).forEach((sh, idx) => {
    const known = STATUS_EVENT[sh.status];
    events.push({
      id: `sh-${idx}`,
      timestamp: sh.timestamp,
      userId: sh.userId,
      title: known?.title ?? (sh.status ? sh.status.replace(/_/g, ' ') : 'Status changed'),
      note: sh.notes,
      noteKind: 'action',
      dot: known?.dot ?? 'bg-slate-400',
    });
  });

  (Array.isArray(referral.deptComments) ? referral.deptComments : []).forEach(dc => {
    const dept = userOf(dc.userId)?.department || referral.receivingDepartments?.[0] || 'Department';
    const title = DEPT_EVENT[dc.status]?.(dept) ?? `${dept} note`;
    events.push({
      id: `dc-${dc.id}`,
      timestamp: dc.timestamp,
      userId: dc.userId,
      title,
      note: dc.comment,
      noteKind: 'dept',
      decision: dc.status ? dc.status.charAt(0).toUpperCase() + dc.status.slice(1).replace(/_/g, ' ') : undefined,
      dot: ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(dc.status) ? 'bg-success-500' : 'bg-purple-500',
    });
  });

  if (referral.isEscalated && referral.escalatedAt) {
    events.push({
      id: 'escalation',
      timestamp: referral.escalatedAt,
      userId: referral.escalatedBy && referral.escalatedBy !== 'system' ? referral.escalatedBy : '',
      title: referral.escalatedBy === 'system' ? 'Escalated automatically' : 'Escalated',
      dot: 'bg-critical-500',
    });
  }

  // Newest first. ISO strings compare correctly as strings.
  events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return (
    <ol className="flex flex-col">
      {events.map((event, i) => {
        const who = event.userId ? userOf(event.userId) : undefined;
        const byline = event.id === 'escalation' && !who ? 'System' : who?.name ?? 'System / Unknown';
        const last = i === events.length - 1;
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center" aria-hidden="true">
              <span className={cn('mt-1 h-[11px] w-[11px] rounded-full', event.dot)} />
              {!last && <span className="min-h-[22px] w-0.5 flex-1 bg-slate-200 dark:bg-white/12" />}
            </div>
            <div className={cn('min-w-0 flex-1', !last && 'pb-[14px]')}>
              <p className="text-[14px] font-semibold leading-[1.3] text-ink dark:text-paper">{event.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-[1.4] text-slate-500 dark:text-white/60">
                {byline}{event.decision ? ` · ${event.decision}` : ''} · <time dateTime={event.timestamp} className="font-mono text-[12px] font-medium">{whenShort(event.timestamp)}</time>
              </p>
              {event.note && (
                <div className="mt-[7px] rounded-[9px] border border-slate-200 bg-white px-[11px] py-[9px] text-[13px] leading-[1.45] text-slate-700 dark:border-white/12 dark:bg-white/[0.05] dark:text-white/75">
                  <span className={cn('mb-0.5 block text-[11px] font-bold uppercase tracking-[0.06em]', event.noteKind === 'dept' ? 'text-purple-700 dark:text-purple-300' : 'text-info-700 dark:text-info-300')}>
                    {event.noteKind === 'dept' ? 'Department note' : 'Action note'}
                  </span>
                  <p className="whitespace-pre-wrap">{event.note}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
