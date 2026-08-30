import React from 'react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ClipboardList } from 'lucide-react';
import { ShiftHandoverFeedProps } from './types';

export const ShiftHandoverFeed: React.FC<ShiftHandoverFeedProps> = ({
  shiftLogs,
  userFacilityId,
  userDepartment,
  limit = 5,
}) => {
  const filteredLogs = shiftLogs
    .filter(
      log =>
        (!userFacilityId || log.facilityId === userFacilityId) &&
        (!userDepartment || log.department === userDepartment)
    )
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, limit);

  if (filteredLogs.length === 0) {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Recent Shift Handovers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
          No recent handovers recorded for your unit.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-500" />
            Recent Shift Handovers
          </CardTitle>
          <Badge variant="default" className="text-[11px]">
            {filteredLogs.length} recent
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.map(log => (
            <div
              key={log.id}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {log.userName}
                    </span>
                    {log.department && (
                      <Badge variant="info" className="text-[10px]">
                        {log.department}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {log.summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono block">
                    {log.timestamp ? format(new Date(log.timestamp), 'MMM d, h:mm a') : ''}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1.5 justify-end text-[11px] font-semibold">
                    <span className="bg-warning-100 dark:bg-warning-900/40 text-warning-800 dark:text-warning-300 px-2 py-0.5 rounded-md">
                      Pending: {log.pendingTransfersCount ?? 0}
                    </span>
                    <span className="bg-success-100 dark:bg-success-900/40 text-success-800 dark:text-success-300 px-2 py-0.5 rounded-md">
                      Admitted: {log.admittedPatientsCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
