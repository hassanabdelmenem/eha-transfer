import React from 'react';
import { formatClock, formatDayMonth } from '../i18n/format';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton';
import { Notification } from '../types';
import { ScreenHeader, headerActionClass } from '../components/layout/ScreenHeader';
import { EmptyQueue } from '../components/dashboard/RoleHome';
import { cn } from '../lib/utils';
import { useI18n, type Language } from '../i18n';
import { renderNotification } from '../i18n/notifications';

// 2d inbox: a kind micro-label and an action label carrying the actual next
// step, layered on top of the real `type` (which still drives the tint) via
// a title-keyword match. Falls back to a generic label rather than a wrong
// specific one when nothing matches, since notification titles are free text
// written across many call sites in DataContext.tsx.
// Keys into inbox.kind.* and inbox.act.* in the catalogue.
type KindKey = 'escalated' | 'requirements' | 'needsApproval' | 'accepted' | 'arrived' | 'cancelled' | 'urgent' | 'update' | 'notice';
type ActKey = 'review' | 'answer' | 'finalApproval' | 'approveOrSend' | 'consent' | 'view';
const inboxKind = (notif: Notification): { label: KindKey; action: ActKey } => {
  // Titles are stored in English (DataContext writes them), so the match stays English.
  const t = notif.title.toLowerCase();
  if (t.includes('escalat')) return { label: 'escalated', action: 'review' };
  if (notif.type === 'purple' || t.includes('requirement')) return { label: 'requirements', action: 'answer' };
  if (t.includes('department approved')) return { label: 'needsApproval', action: 'finalApproval' };
  if (t.includes('new') && t.includes('referral')) return { label: 'needsApproval', action: 'approveOrSend' };
  if (t.includes('consent')) return { label: 'accepted', action: 'consent' };
  if (t.includes('arrived')) return { label: 'arrived', action: 'view' };
  if (t.includes('cancel')) return { label: 'cancelled', action: 'view' };
  if (notif.type === 'urgent') return { label: 'urgent', action: 'review' };
  return { label: notif.type === 'success' ? 'update' : 'notice', action: 'view' };
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

const stamp = (iso: string, lang: Language) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? formatClock(d, lang)
    : formatDayMonth(d, lang);
};

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useI18n();

  if (!user) return null;

  const userNotifs = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.read).length;

  return (
    <div className="max-w-[640px]">
      <ScreenHeader
        title={t('inbox.title')}
        subtitle={unreadCount > 0 ? t('inbox.unread', { count: unreadCount }) : undefined}
        action={unreadCount > 0 ? (
          <button type="button" onClick={() => markAllNotificationsRead()} className={headerActionClass}>
            {t('inbox.markAllRead')}
          </button>
        ) : undefined}
      />

      {loading ? (
        <SkeletonGroup label={t('inbox.loading')} className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </SkeletonGroup>
      ) : userNotifs.length === 0 ? (
        <EmptyQueue>{t('inbox.empty')}</EmptyQueue>
      ) : (
        <ul className="flex flex-col gap-3">
          {userNotifs.map(notif => {
            const kind = inboxKind(notif);
            const escalated = kind.label === 'escalated';
            return (
              <li key={notif.id} className={cn('rounded-xl border p-[14px]', notif.read ? READ_CLASSES : TINT_CLASSES[notif.type])}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className={cn('text-[11px] font-bold uppercase tracking-[0.09em]', notif.read ? 'text-slate-500 dark:text-white/60' : LABEL_TEXT_CLASSES[notif.type])}>
                      {t(`inbox.kind.${kind.label}`)}
                    </span>
                    {/* Unread is said in words, not only by the tint. */}
                    {!notif.read && (
                      <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-paper dark:bg-paper dark:text-ink">{t('inbox.new')}</span>
                    )}
                  </span>
                  <time dateTime={notif.createdAt} className="font-mono text-[12px] font-medium text-slate-700 dark:text-white/65">{stamp(notif.createdAt, lang)}</time>
                </div>
                {/* In the reader's language when the notification carries a catalogue key;
                    older ones keep their stored English, laid out in its own direction. */}
                <p dir="auto" className="mt-1.5 text-[15.5px] leading-[1.45] text-ink dark:text-paper">{renderNotification(lang, notif).message}</p>
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
                    {t(`inbox.act.${kind.action}`)}
                  </button>
                )}
                {!notif.referralId && !notif.read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(notif.id)}
                    className="mt-3 min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white text-[15px] font-semibold text-ink transition-colors hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10"
                  >
                    {t('inbox.markRead')}
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
