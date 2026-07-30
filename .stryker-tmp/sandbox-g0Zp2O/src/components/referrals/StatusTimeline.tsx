// @ts-nocheck
import React from 'react';
import { Referral, User } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { CheckCircle, XCircle, AlertCircle, Clock, Truck, MessageSquare } from 'lucide-react';

interface StatusTimelineProps {
  referral: Referral;
  users: User[];
}

interface TimelineEvent {
  id: string;
  type: 'status_change' | 'dept_comment';
  timestamp: string;
  userId: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  dotColor?: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ referral, users }) => {
  const events: TimelineEvent[] = [];

  referral.statusHistory.forEach((sh, idx) => {
    let dotColor = 'bg-slate-300 dark:bg-slate-600';
    let icon = <Clock className="w-3 h-3 text-white" />;
    
    if (['accepted', 'arrived', 'admitted', 'manager_approved', 'dept_approved'].includes(sh.status)) {
      dotColor = 'bg-emerald-500';
      icon = <CheckCircle className="w-3 h-3 text-white" />;
    } else if (['rejected'].includes(sh.status)) {
      dotColor = 'bg-red-500';
      icon = <XCircle className="w-3 h-3 text-white" />;
    } else if (['pending'].includes(sh.status)) {
      dotColor = 'bg-amber-500';
      icon = <AlertCircle className="w-3 h-3 text-white" />;
    } else if (['in_transit'].includes(sh.status)) {
      dotColor = 'bg-blue-500';
      icon = <Truck className="w-3 h-3 text-white" />;
    }

    events.push({
      id: `sh-${idx}`,
      type: 'status_change',
      timestamp: sh.timestamp,
      userId: sh.userId,
      title: `Status: ${sh.status.replace(/_/g, ' ').toUpperCase()}`,
      description: sh.notes,
      dotColor,
      icon,
    });
  });

  referral.deptComments.forEach((dc) => {
    events.push({
      id: `dc-${dc.id}`,
      type: 'dept_comment',
      timestamp: dc.timestamp,
      userId: dc.userId,
      title: `Dept Review: ${dc.status.replace(/_/g, ' ').toUpperCase()}`,
      description: dc.comment,
      dotColor: 'bg-purple-500',
      icon: <MessageSquare className="w-3 h-3 text-white" />,
    });
  });

  // Sort by timestamp descending (newest first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="relative pt-4 space-y-0">
      <div className="absolute left-3 top-4 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800"></div>
      
      {events.map((event) => {
        const user = users.find(u => u.id === event.userId);
        const userName = user ? user.name : 'System / Unknown';
        const userRole = user ? user.role.replace(/_/g, ' ') : '';

        return (
          <div key={event.id} className="relative pl-10 pb-6 group">
            <div className={`absolute left-0 top-1 w-6 h-6 flex items-center justify-center ${event.dotColor || 'bg-slate-400'} rounded-full ring-4 ring-white dark:ring-slate-950 z-10 transition-transform group-hover:scale-110 shadow-sm`}>
              {event.icon}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1 sm:gap-4">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{event.title}</span>
                <p className="text-[10px] text-slate-500 font-medium">by {userName} <span className="opacity-70">({userRole})</span></p>
              </div>
              <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {formatDateTime(event.timestamp)}
              </span>
            </div>
            
            {event.description && (
              <div className="text-slate-700 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mt-2 border border-slate-100 dark:border-slate-800 shadow-sm leading-relaxed">
                {event.type === 'dept_comment' && <div className="text-[10px] font-bold text-purple-600 mb-1 uppercase tracking-wider">Department Note</div>}
                {event.type === 'status_change' && <div className="text-[10px] font-bold text-blue-600 mb-1 uppercase tracking-wider">Action Note</div>}
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
