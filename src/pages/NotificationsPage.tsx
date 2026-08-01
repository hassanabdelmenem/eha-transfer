import React from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { formatDateTime } from '../lib/utils';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const { user } = useAuth();

  if (!user) return null;

  const userNotifs = notifications.filter(n => n.userId === user.id);
  const unreadCount = userNotifs.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
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

      {userNotifs.length === 0 ? (
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
                className={`p-4 rounded border ${notif.read ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'} shadow-sm cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800`}
                onClick={() => !notif.read && markNotificationRead(notif.id)}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className={`mt-1 shrink-0 ${notif.type === 'urgent' ? 'text-red-500' : notif.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold uppercase ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-blue-900 dark:text-blue-300'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">{notif.message}</p>
                    <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{formatDateTime(notif.createdAt)}</span>
                      {notif.referralId && (
                        <Link
                          to={`/referrals/${notif.referralId}`}
                          className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
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
  );
};
