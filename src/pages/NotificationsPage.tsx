import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { formatDateTime } from '../lib/utils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Mobile: 2d inbox */}
      <div className="md:hidden -mt-4 -mx-4 space-y-0">
        <div className="bg-slate-950 text-white px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-heading font-semibold">Inbox</h1>
          {unreadCount > 0 && (
            <button onClick={() => markAllNotificationsRead()} className="min-h-[40px] px-3 rounded-lg border border-white/25 text-xs font-bold uppercase tracking-wide">
              Mark all read
            </button>
          )}
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <SkeletonGroup label="Loading notifications…" className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </SkeletonGroup>
          ) : userNotifs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">No notifications.</p>
          ) : userNotifs.map(notif => {
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
      </div>

      {/* Desktop */}
      <div className="hidden md:block space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Notifications</h1>
          <p className="text-gray-500 dark:text-slate-400">Updates and alerts for your facility.</p>
        </div>
        {unreadCount > 0 && markAllNotificationsRead && (
          <button
            type="button"
            onClick={() => markAllNotificationsRead()}
            className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 min-h-[40px] rounded transition-colors shrink-0"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonGroup label="Loading notifications…" className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded" />)}
        </SkeletonGroup>
      ) : userNotifs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-slate-400">
          No notifications.
        </Card>
      ) : (
        <div className="space-y-3">
          {userNotifs.map(notif => {
            const Icon = notif.type === 'urgent' ? AlertTriangle : notif.type === 'success' ? CheckCircle : Info;
            return (
              <div
                key={notif.id}
                className={`p-4 rounded border ${notif.read ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-info-50 dark:bg-info-950/30 border-info-200 dark:border-info-900'} shadow-sm cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`}
                onClick={() => !notif.read && markNotificationRead(notif.id)}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className={`mt-1 shrink-0 ${notif.type === 'urgent' ? 'text-critical-500' : notif.type === 'success' ? 'text-success-500' : 'text-info-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold uppercase ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-info-900 dark:text-info-300'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">{notif.message}</p>
                    <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{formatDateTime(notif.createdAt)}</span>
                      {notif.referralId && (
                        <Link
                          to={`/referrals/${notif.referralId}`}
                          className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          onClick={() => markNotificationRead(notif.id)}
                        >
                          View Referral &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
