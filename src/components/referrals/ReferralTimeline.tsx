import React from 'react';
import { Referral, ReferralStatus, DeptApprovalStatus, User } from '../../types';
import { isSameDay } from 'date-fns';
import { cn } from '../../lib/utils';
import { useI18n, type Language } from '../../i18n';
import { formatClock, formatDayMonthClock } from '../../i18n/format';

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
  /** The action note of a status change folded into this entry. */
  actionNote?: string;
  /** A department's decision, spoken in the by-line ("Direct approval"). */
  decision?: string;
  dot: string;
}

// Dot colours: success for approvals, arrival and admission; critical for
// rejection and escalation; warning for waiting; info for transit; violet for
// department notes, so a dept note never reads as an action note beside it.
// Titles: timeline.status.* in the catalogue.
const STATUS_DOT: Record<ReferralStatus, string> = {
  pending: 'bg-warning-500',
  dept_approved: 'bg-success-500',
  manager_approved: 'bg-success-500',
  accepted: 'bg-success-500',
  patient_consented: 'bg-success-500',
  in_transit: 'bg-info-500',
  arrived: 'bg-success-500',
  admitted: 'bg-success-500',
  discharged: 'bg-success-500',
  rejected: 'bg-critical-500',
  postponed: 'bg-purple-500',
  cancelled: 'bg-slate-400',
};

// Titles: timeline.dept.* ("Approved by {dept}").
const DEPT_EVENTS = ['direct_approval', 'urgent_approval', 'scheduled_approval', 'requirements_needed'] as const;
const isDeptEvent = (s: DeptApprovalStatus): s is (typeof DEPT_EVENTS)[number] => (DEPT_EVENTS as readonly string[]).includes(s);

/** "09:18" today, "12 Aug, 09:18" otherwise; the same fallbacks as formatDateTime. */
function whenShort(iso: string | undefined, t: ReturnType<typeof useI18n>['t'], lang: Language): string {
  if (!iso) return t('timeline.unknownTime');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t('timeline.invalidDate');
  return isSameDay(d, new Date()) ? formatClock(d, lang) : formatDayMonthClock(d, lang);
}

export const ReferralTimeline: React.FC<ReferralTimelineProps> = ({ referral, users, usersById }) => {
  const { t, lang } = useI18n();
  const userOf = (id: string) => (usersById ? usersById.get(id) : users?.find(u => u.id === id));
  const events: TimelineEvent[] = [];

  const history = Array.isArray(referral.statusHistory) ? referral.statusHistory : [];
  const comments = Array.isArray(referral.deptComments) ? referral.deptComments : [];
  const APPROVALS = ['direct_approval', 'urgent_approval', 'scheduled_approval'];
  // A department head's approval writes a comment and moves the status in the
  // same click; shown as one entry, the comment's ("Approved by Cardiology").
  const foldedInto = new Map<number, string>();
  history.forEach((sh, idx) => {
    if (sh.status !== 'dept_approved') return;
    const dc = comments.find(c => APPROVALS.includes(c.status) && c.userId === sh.userId
      && Math.abs(Date.parse(c.timestamp) - Date.parse(sh.timestamp)) <= 2 * 60 * 1000);
    if (dc) foldedInto.set(idx, dc.id);
  });

  history.forEach((sh, idx) => {
    if (foldedInto.has(idx)) return;
    const known = sh.status && sh.status in STATUS_DOT;
    // An entry that leaves the status where it was (escort, destination override)
    // was titled by that status, so the escort read as a second "Consent recorded".
    const unchanged = idx > 0 && history[idx - 1]?.status === sh.status;
    const title = sh.event
      ? t(`timeline.event.${sh.event}`)
      : unchanged
        ? t('timeline.updated')
        : known ? t(`timeline.status.${sh.status}`) : sh.status ? String(sh.status).replace(/_/g, ' ') : t('timeline.statusChanged');
    events.push({
      id: `sh-${idx}`,
      timestamp: sh.timestamp,
      userId: sh.userId,
      title,
      note: sh.notes,
      noteKind: 'action',
      dot: sh.event || unchanged ? 'bg-slate-400' : known ? STATUS_DOT[sh.status] : 'bg-slate-400',
    });
  });

  const foldedNotes = new Map<string, string | undefined>();
  foldedInto.forEach((dcId, idx) => foldedNotes.set(dcId, history[idx].notes));

  comments.forEach(dc => {
    const dept = userOf(dc.userId)?.department || referral.receivingDepartments?.[0] || t('timeline.department');
    const title = isDeptEvent(dc.status) ? t(`timeline.dept.${dc.status}`, { dept }) : t('timeline.deptNote', { dept });
    events.push({
      id: `dc-${dc.id}`,
      timestamp: dc.timestamp,
      userId: dc.userId,
      title,
      note: dc.comment,
      noteKind: 'dept',
      actionNote: foldedNotes.get(dc.id),
      decision: dc.status ? t(`timeline.decision.${dc.status}`) : undefined,
      dot: ['direct_approval', 'urgent_approval', 'scheduled_approval'].includes(dc.status) ? 'bg-success-500' : 'bg-purple-500',
    });
  });

  if (referral.isEscalated && referral.escalatedAt) {
    events.push({
      id: 'escalation',
      timestamp: referral.escalatedAt,
      userId: referral.escalatedBy && referral.escalatedBy !== 'system' ? referral.escalatedBy : '',
      title: referral.escalatedBy === 'system' ? t('timeline.escalatedAuto') : t('timeline.escalated'),
      dot: 'bg-critical-500',
    });
  }

  // Newest first. ISO strings compare correctly as strings.
  events.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return (
    <ol className="flex flex-col">
      {events.map((event, i) => {
        const who = event.userId ? userOf(event.userId) : undefined;
        const byline = event.id === 'escalation' && !who ? t('timeline.system') : who?.name ?? t('timeline.systemUnknown');
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
                <bdi>{byline}</bdi>{event.decision ? ` · ${event.decision}` : ''} · <time dateTime={event.timestamp} className="font-mono text-[12px] font-medium">{whenShort(event.timestamp, t, lang)}</time>
              </p>
              {event.note && (
                <div className="mt-[7px] rounded-[9px] border border-slate-200 bg-white px-[11px] py-[9px] text-[13px] leading-[1.45] text-slate-700 dark:border-white/12 dark:bg-white/[0.05] dark:text-white/75">
                  <span className={cn('mb-0.5 block text-[11px] font-bold uppercase tracking-[0.06em]', event.noteKind === 'dept' ? 'text-purple-700 dark:text-purple-300' : 'text-info-700 dark:text-info-300')}>
                    {event.noteKind === 'dept' ? t('timeline.deptNoteLabel') : t('timeline.actionNoteLabel')}
                  </span>
                  <p dir="auto" className="whitespace-pre-wrap">{event.note}</p>
                </div>
              )}
              {event.actionNote && event.actionNote !== event.note && (
                <div className="mt-[7px] rounded-[9px] border border-slate-200 bg-white px-[11px] py-[9px] text-[13px] leading-[1.45] text-slate-700 dark:border-white/12 dark:bg-white/[0.05] dark:text-white/75">
                  <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-info-700 dark:text-info-300">{t('timeline.actionNoteLabel')}</span>
                  <p dir="auto" className="whitespace-pre-wrap">{event.actionNote}</p>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
