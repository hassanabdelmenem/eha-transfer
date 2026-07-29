// @ts-nocheck
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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">Updates and alerts for your facility.</p>
        </div>
        {unreadCount > 0 && markAllNotificationsRead && (
          <button 
            onClick={() => markAllNotificationsRead()}
            className="text-xs font-bold uppercase text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {userNotifs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No notifications.
        </Card>
      ) : (
        <div className="space-y-3">
          {userNotifs.map(notif => {
            const Icon = notif.type === 'urgent' ? AlertTriangle : notif.type === 'success' ? CheckCircle : Info;
            return (
              <div 
                key={notif.id}
                className={`p-4 rounded border ${notif.read ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' : 'bg-blue-50 border-blue-200'} shadow-sm cursor-pointer transition-colors hover:bg-slate-50 dark:bg-slate-950`}
                onClick={() => !notif.read && markNotificationRead(notif.id)}
              >
                <div className="flex gap-4">
                  <div className={`mt-1 ${notif.type === 'urgent' ? 'text-red-500' : notif.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold uppercase ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-blue-900'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-sm text-slate-600 mt-1 font-medium">{notif.message}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] font-mono text-slate-400">{formatDateTime(notif.createdAt)}</span>
                      {notif.referralId && (
                        <Link 
                          to={`/referrals/${notif.referralId}`}
                          className="text-[10px] font-bold uppercase text-blue-700 hover:text-blue-900 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
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
