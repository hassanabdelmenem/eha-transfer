import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '../../types';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Flame, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  BellRing, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { formatDateTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

export interface NotificationMenuProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  className?: string;
}

export const NotificationMenu: React.FC<NotificationMenuProps> = ({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const recentNotifications = notifications.slice(0, 6);

  const getUrgencyIcon = (type: Notification['type']) => {
    switch (type) {
      case 'urgent':
        return <Flame className="w-4 h-4 text-critical-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-warning-500 shrink-0" />;
      case 'purple':
        return <BellRing className="w-4 h-4 text-purple-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-success-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getUrgencyStyles = (type: Notification['type'], read: boolean) => {
    if (read) return 'border-transparent bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400';
    switch (type) {
      case 'urgent':
        return 'border-l-4 border-l-critical-500 bg-critical-50/40 dark:bg-critical-950/30 text-slate-900 dark:text-white';
      case 'warning':
        return 'border-l-4 border-l-warning-500 bg-warning-50/40 dark:bg-warning-950/30 text-slate-900 dark:text-white';
      case 'purple':
        return 'border-l-4 border-l-purple-500 bg-purple-50/40 dark:bg-purple-950/30 text-slate-900 dark:text-white';
      case 'success':
        return 'border-l-4 border-l-success-500 bg-success-50/40 dark:bg-success-950/30 text-slate-900 dark:text-white';
      default:
        return 'border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-950/30 text-slate-900 dark:text-white';
    }
  };

  return (
    <div className={cn("relative inline-block", className)} ref={menuRef}>
      {/* Bell Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-critical-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications tray"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3.5 transition-colors flex gap-3 items-start",
                    getUrgencyStyles(notification.type, notification.read)
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getUrgencyIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className={cn(
                        "text-xs font-semibold leading-snug truncate",
                        notification.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"
                      )}>
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 ml-2">
                        {formatDateTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {notification.referralId && (
                        <Link
                          to={`/referrals/${notification.referralId}`}
                          onClick={() => {
                            onMarkRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View Transfer <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {!notification.read && (
                        <button
                          type="button"
                          onClick={() => onMarkRead(notification.id)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No notifications yet</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">All patient transfer updates will appear here</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>View full notification history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
