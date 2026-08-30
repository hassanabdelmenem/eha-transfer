import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { FacilityAnalyticsChartsProps } from './types';

export const FacilityAnalyticsCharts: React.FC<FacilityAnalyticsChartsProps> = ({
  facilityReferrals,
  facilityAdmissions,
  userFacilityId,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const chartColors = {
    grid: isDark ? '#334155' : '#e2e8f0',
    tick: isDark ? '#94a3b8' : '#64748b',
    cursor: isDark ? '#1e293b' : '#f1f5f9',
    tooltipBg: isDark ? '#0f172a' : '#ffffff',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    tooltipText: isDark ? '#e2e8f0' : '#0f172a',
  };

  const dynamicChartData = useMemo(() => {
    const today = new Date();
    const data: Record<
      string,
      {
        name: string;
        incoming: number;
        outgoing: number;
        oneWay: number;
        serviceReturn: number;
        assessmentReturn: number;
      }[]
    > = {
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };

    const countData = (start: Date, end: Date) => {
      const sISO = start.toISOString();
      const eISO = end.toISOString();
      const relevant = facilityReferrals.filter(x => x.createdAt >= sISO && x.createdAt <= eISO);
      const incoming = relevant.filter(
        x =>
          x.referringFacilityId !== userFacilityId &&
          (x.receivingFacilityId === userFacilityId || x.receivingFacilityId === 'auto')
      ).length;
      const outgoing = relevant.filter(x => x.referringFacilityId === userFacilityId).length;

      const oneWay = relevant.filter(x => !x.transferType || x.transferType === 'one_way').length;
      const serviceReturn = relevant.filter(x => x.transferType === 'service_and_return').length;
      const assessmentReturn = relevant.filter(x => x.transferType === 'assessment_with_return').length;

      return { incoming, outgoing, oneWay, serviceReturn, assessmentReturn };
    };

    // Weekly: Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      data.weekly.push({ name: format(d, 'EEE'), ...countData(start, end) });
    }

    // Monthly: Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const end = subWeeks(today, i);
      const start = subWeeks(today, i + 1);
      data.monthly.push({ name: `W${4 - i}`, ...countData(start, end) });
    }

    // Quarterly: Last 3 months
    for (let i = 2; i >= 0; i--) {
      const d = subMonths(today, i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      data.quarterly.push({ name: format(d, 'MMM'), ...countData(start, end) });
    }

    // Yearly: Last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const end = subQuarters(today, i);
      const start = subQuarters(today, i + 1);
      data.yearly.push({ name: `Q${4 - i}`, ...countData(start, end) });
    }

    return data;
  }, [facilityReferrals, facilityAdmissions, userFacilityId]);

  const departmentChartData = useMemo(() => {
    const deptMap = new Map<
      string,
      {
        name: string;
        incoming: number;
        outgoing: number;
        oneWay: number;
        serviceReturn: number;
        assessmentReturn: number;
      }
    >();

    const getOrAdd = (dept: string) => {
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          name: dept,
          incoming: 0,
          outgoing: 0,
          oneWay: 0,
          serviceReturn: 0,
          assessmentReturn: 0,
        });
      }
      return deptMap.get(dept)!;
    };

    facilityReferrals.forEach(ref => {
      const isOutgoing = ref.referringFacilityId === userFacilityId;
      const isIncoming =
        !isOutgoing &&
        (ref.receivingFacilityId === userFacilityId || ref.receivingFacilityId === 'auto');

      const depts =
        ref.receivingDepartments && ref.receivingDepartments.length > 0
          ? ref.receivingDepartments
          : ['Unspecified'];

      depts.forEach(dept => {
        const entry = getOrAdd(dept);
        if (isIncoming) entry.incoming++;
        if (isOutgoing) entry.outgoing++;

        const type = ref.transferType || 'one_way';
        if (type === 'one_way') entry.oneWay++;
        else if (type === 'service_and_return') entry.serviceReturn++;
        else if (type === 'assessment_with_return') entry.assessmentReturn++;
      });
    });

    return Array.from(deptMap.values()).sort(
      (a, b) => b.incoming + b.outgoing - (a.incoming + a.outgoing)
    );
  }, [facilityReferrals, userFacilityId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Volume and Transfer Type Analytics */}
      <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between py-4 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Transfer Flow Analytics
          </CardTitle>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['weekly', 'monthly', 'quarterly', 'yearly'] as const).map(period => (
              <button
                key={period}
                type="button"
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  chartPeriod === period
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                onClick={() => setChartPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 min-h-[300px]">
          <div className="h-[240px] w-full flex flex-col">
            <p className="text-xs font-semibold text-slate-500 text-center mb-2">
              Volume (Incoming vs Outgoing)
            </p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <Tooltip
                    cursor={{ fill: chartColors.cursor }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      fontSize: '12px',
                      backgroundColor: chartColors.tooltipBg,
                      color: chartColors.tooltipText,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="outgoing" name="Outgoing" fill="#f97316" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="h-[240px] w-full flex flex-col">
            <p className="text-xs font-semibold text-slate-500 text-center mb-2">
              Distribution by Transfer Type
            </p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicChartData[chartPeriod]} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <Tooltip
                    cursor={{ fill: chartColors.cursor }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      fontSize: '12px',
                      backgroundColor: chartColors.tooltipBg,
                      color: chartColors.tooltipText,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                  <Bar dataKey="serviceReturn" name="Service/Return" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="assessmentReturn" name="Assessment" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      <Card className="flex flex-col border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Departmental Referral Demand
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 min-h-[300px]">
          <div className="h-[240px] w-full flex flex-col">
            <p className="text-xs font-semibold text-slate-500 text-center mb-2">
              Volume by Specialty
            </p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} width={75} />
                  <Tooltip
                    cursor={{ fill: chartColors.cursor }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      fontSize: '12px',
                      backgroundColor: chartColors.tooltipBg,
                      color: chartColors.tooltipText,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="incoming" name="Incoming" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="outgoing" name="Outgoing" fill="#f97316" radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="h-[240px] w-full flex flex-col">
            <p className="text-xs font-semibold text-slate-500 text-center mb-2">
              Types by Specialty
            </p>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartColors.grid} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: chartColors.tick }} width={75} />
                  <Tooltip
                    cursor={{ fill: chartColors.cursor }}
                    contentStyle={{
                      borderRadius: '12px',
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      fontSize: '12px',
                      backgroundColor: chartColors.tooltipBg,
                      color: chartColors.tooltipText,
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="oneWay" name="One Way" fill="#64748b" stackId="a" />
                  <Bar dataKey="serviceReturn" name="Service/Return" fill="#3b82f6" stackId="a" />
                  <Bar dataKey="assessmentReturn" name="Assessment" fill="#10b981" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
