import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';
import { Notification } from '../types';
import { ScreenHeader, headerActionClass } from '../components/layout/ScreenHeader';
import { EmptyQueue } from '../components/dashboard/RoleHome';
import { cn } from '../lib/utils';

// 2d inbox: a kind micro-label and an action label carrying the actual next
// step, layered on top of the real `type` (which still drives the tint) via
// a title-keyword match. Falls back to a generic label rather than a wrong
// specific one when nothing matches, since notification titles are free text
// written across many call sites in DataContext.tsx.
const inboxKind = (notif: Notification): { label: string; action: string } => {
  const t = notif.title.toLowerCase();
  if (t.includes('escalat')) return { label: 'Escalated', action: 'Review the case' };
  if (notif.type === 'purple' || t.includes('requirement')) return { label: 'Requirements requested', action: 'Answer requirements' };
  if (t.includes('department approved')) return { label: 'Needs your approval', action: 'Give final approval' };
  if (t.includes('new') && t.includes('referral')) return { label: 'Needs your approval', action: 'Approve or send back' };
  if (t.includes('consent')) return { label: 'Accepted', action: 'Record consent' };
  if (t.includes('arrived')) return { label: 'Arrived', action: 'View referral' };
  if (t.includes('cancel')) return { label: 'Cancelled', action: 'View referral' };
  if (notif.type === 'urgent') return { label: 'Urgent', action: 'Review the case' };
  return { label: notif.type === 'success' ? 'Update' : 'Notice', action: 'View referral' };
};

// Unread cards are tinted by type; once read they drop to plain white, so
// the eye goes to what is new. The micro-label carries the kind in words, so
// the tint is never the only signal.
const TINT_CLASSES: Record<Notification['type'], string> = {
  urgent: 'border-critical-200 bg-critical-100 dark:border-critical-800/70 dark:bg-critical-950/50',
  warning: 'border-warning-700 bg-warning-100 dark:border-warning-700/70 dark:bg-warning-900/35',
  success: 'border-success-300 bg-success-100 dark:border-success-700 dark:bg-success-900/45',
  info: 'border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]',
  purple: 'border-purple-300 bg-purple-100 dark:border-purple-700 dark:bg-purple-900/40',
};
const READ_CLASSES = 'border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.04]';
const LABEL_TEXT_CLASSES: Record<Notification['type'], string> = {
  urgent: 'text-critical-700 dark:text-critical-300',
  warning: 'text-warning-800 dark:text-warning-300',
  success: 'text-success-700 dark:text-success-300',
  info: 'text-slate-700 dark:text-white/65',
  purple: 'text-purple-700 dark:text-purple-200',
};

const stamp = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const userNotifs = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.read).length;

  return (
    <div className="max-w-[640px]">
      <ScreenHeader
        title="Inbox"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : undefined}
        action={unreadCount > 0 ? (
          <button type="button" onClick={() => markAllNotificationsRead()} className={headerActionClass}>
            Mark all read
          </button>
        ) : undefined}
      />

      {loading ? (
        <SkeletonGroup label="Loading notifications…" className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </SkeletonGroup>
      ) : userNotifs.length === 0 ? (
        <EmptyQueue>Nothing new. Approvals, requirements and arrivals land here as they happen.</EmptyQueue>
      ) : (
        <ul className="flex flex-col gap-3">
          {userNotifs.map(notif => {
            const kind = inboxKind(notif);
            const escalated = kind.label === 'Escalated';
            return (
              <li key={notif.id} className={cn('rounded-xl border p-[14px]', notif.read ? READ_CLASSES : TINT_CLASSES[notif.type])}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('text-[11px] font-bold uppercase tracking-[0.09em]', notif.read ? 'text-slate-500 dark:text-white/60' : LABEL_TEXT_CLASSES[notif.type])}>
                    {kind.label}
                    {!notif.read && <span className="sr-only"> · unread</span>}
                  </span>
                  <time dateTime={notif.createdAt} className="font-mono text-[12px] font-medium text-slate-700 dark:text-white/65">{stamp(notif.createdAt)}</time>
                </div>
                <p className="mt-1.5 text-[15.5px] leading-[1.45] text-ink dark:text-paper">{notif.message}</p>
                {notif.referralId && (
                  <button
                    type="button"
                    onClick={() => { markNotificationRead(notif.id); navigate(`/referrals/${notif.referralId}`); }}
                    className={cn(
                      'mt-3 min-h-[50px] w-full rounded-[10px] text-[15px] font-semibold transition-colors',
                      escalated && !notif.read
                        ? 'bg-critical-700 text-white hover:bg-critical-800'
                        : notif.read
                        ? 'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10'
                        : 'bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200'
                    )}
                  >
                    {kind.action}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
