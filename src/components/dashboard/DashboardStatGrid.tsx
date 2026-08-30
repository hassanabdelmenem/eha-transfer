import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { DashboardStatGridProps, DashboardMetric } from './types';

export const DashboardStatGrid: React.FC<DashboardStatGridProps> = ({
  metrics,
  loading = false,
  facilityReferrals = [],
}) => {
  const displayMetrics: DashboardMetric[] = metrics || (() => {
    const pending = facilityReferrals.filter(r => r.status === 'pending').length;
    const inTransit = facilityReferrals.filter(r => r.status === 'in_transit').length;
    const emergencies = facilityReferrals.filter(r => r.priority === 'emergency' && r.status !== 'cancelled').length;
    const completed = facilityReferrals.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status)).length;

    return [
      {
        label: 'Pending Referrals',
        value: pending,
        valueColor: 'text-warning-600 dark:text-warning-400',
        bg: 'bg-white dark:bg-slate-900',
        labelColor: 'text-slate-500 dark:text-slate-400',
        badgeBg: 'bg-warning-100 dark:bg-warning-900/40',
        badgeText: 'text-warning-700 dark:text-warning-300',
        badgeLabel: 'Needs Action',
      },
      {
        label: 'In Transit',
        value: inTransit,
        valueColor: 'text-slate-900 dark:text-slate-100',
        bg: 'bg-white dark:bg-slate-900',
        labelColor: 'text-slate-500 dark:text-slate-400',
        badgeBg: 'bg-info-100 dark:bg-info-900/40',
        badgeText: 'text-info-500 dark:text-info-300',
        badgeLabel: 'Real-time',
      },
      {
        label: 'Emergencies',
        value: emergencies,
        valueColor: 'text-critical-700 dark:text-critical-400',
        bg: 'bg-white dark:bg-slate-900',
        labelColor: 'text-critical-600 dark:text-critical-400',
        badgeBg: 'bg-critical-100 dark:bg-critical-900/40',
        badgeText: 'text-critical-700 dark:text-critical-300',
        badgeLabel: 'Priority',
      },
      {
        label: 'Completed',
        value: completed,
        valueColor: 'text-white',
        bg: 'bg-blue-900',
        labelColor: 'text-blue-200',
        badgeBg: 'bg-blue-800',
        badgeText: 'text-blue-300',
        badgeLabel: 'Optimal',
      },
    ];
  })();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      {loading ? (
        <div role="status" aria-busy="true" aria-live="polite" className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          <span className="sr-only">Loading statistics…</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {displayMetrics.map((stat, i) => (
            <div
              key={i}
              className={`p-5 flex flex-col justify-between transition-colors ${
                stat.bg === 'bg-blue-900' ? 'bg-blue-600 dark:bg-blue-900' : 'bg-transparent'
              }`}
            >
              <span
                className={`text-xs font-bold ${
                  stat.bg === 'bg-blue-900' ? 'text-blue-100' : stat.labelColor
                }`}
              >
                {stat.label}
              </span>
              <div className="flex items-baseline justify-between gap-2 mt-3">
                <span
                  className={`text-4xl font-light tracking-tight ${
                    stat.bg === 'bg-blue-900' ? 'text-white' : stat.valueColor
                  }`}
                >
                  {stat.value}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    stat.bg === 'bg-blue-900'
                      ? 'bg-blue-500 text-blue-50'
                      : `${stat.badgeBg} ${stat.badgeText}`
                  }`}
                >
                  {stat.badgeLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const KPIGrid = DashboardStatGrid;
