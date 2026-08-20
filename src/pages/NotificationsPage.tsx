import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';
import { Notification } from '../types';

// 2d inbox: a kind micro-label and an action label carrying the actual next
// step, layered on top of the real `type` (which still drives the tint) via
// a title-keyword match. Falls back to a generic label rather than a wrong
// specific one when nothing matches, since notification titles are free text
// written across many call sites in DataContext.tsx.
const inboxKind = (notif: Notification): { label: string; action: string } => {
  const t = notif.title.toLowerCase();
  if (t.includes('escalat')) return { label: 'Escalated', action: 'Review the case' };
  if (t.includes('requirement')) return { label: 'Requirements requested', action: 'Answer requirements' };
  if (t.includes('department approved')) return { label: 'Needs your approval', action: 'Give final approval' };
  if (t.includes('new') && t.includes('referral')) return { label: 'Needs your approval', action: 'Approve or send back' };
  if (t.includes('consent')) return { label: 'Accepted', action: 'Record consent' };
  if (t.includes('arrived')) return { label: 'Arrived', action: 'View referral' };
  if (t.includes('cancel')) return { label: 'Cancelled', action: 'View referral' };
  if (notif.type === 'urgent') return { label: 'Urgent', action: 'Review the case' };
  return { label: notif.type === 'success' ? 'Update' : 'Notice', action: 'View referral' };
};

const TINT_CLASSES: Record<Notification['type'], string> = {
  urgent: 'bg-critical-50 dark:bg-critical-950/30 border-critical-200 dark:border-critical-900',
  warning: 'bg-warning-100 dark:bg-warning-900/20 border-warning-300 dark:border-warning-800',
  success: 'bg-success-100 dark:bg-success-900/20 border-success-300 dark:border-success-800',
  info: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
};
const LABEL_TEXT_CLASSES: Record<Notification['type'], string> = {
  urgent: 'text-critical-700 dark:text-critical-400',
  warning: 'text-warning-800 dark:text-warning-300',
  success: 'text-success-700 dark:text-success-400',
  info: 'text-slate-500 dark:text-slate-400',
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const userNotifs = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.read).length;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* 2d/3d: unified inbox, same cards at every width -- edge-to-edge on
          phones, contained in a rounded header card once there's room. */}
      <div className="-mt-4 -mx-4 sm:mt-0 sm:mx-0 sm:rounded-xl sm:overflow-hidden">
        <div className="bg-slate-950 text-white px-4 py-4 sm:px-6 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-heading font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <button onClick={() => markAllNotificationsRead()} className="min-h-[40px] px-3 rounded-lg border border-white/25 text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-colors">
              Mark all read
            </button>
          )}
        </div>
        <div className="p-4 sm:p-6 sm:pt-4 sm:bg-slate-50 sm:dark:bg-slate-950/40">
          {loading ? (
            <SkeletonGroup label="Loading notifications…" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </SkeletonGroup>
          ) : userNotifs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">No notifications.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {userNotifs.map(notif => {
                const kind = inboxKind(notif);
                return (
                  <div key={notif.id} className={`rounded-xl border p-3.5 ${TINT_CLASSES[notif.type]}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wide ${LABEL_TEXT_CLASSES[notif.type]}`}>{kind.label}</span>
                      <span className="text-xs font-mono text-slate-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[15.5px] text-slate-800 dark:text-slate-200 mt-1.5 leading-snug">{notif.message}</p>
                    {notif.referralId && (
                      <button
                        onClick={() => { markNotificationRead(notif.id); navigate(`/referrals/${notif.referralId}`); }}
                        className="w-full mt-3 min-h-[50px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide"
                      >
                        {kind.action}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
