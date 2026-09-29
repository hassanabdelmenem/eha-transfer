import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { subDays, subWeeks, subMonths, subQuarters, format } from 'date-fns';
import { FacilityAnalyticsChartsProps } from './types';
import { cn } from '../../lib/utils';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type Row = { name: string; incoming: number; outgoing: number; oneWay: number; serviceReturn: number; assessmentReturn: number };
type SeriesKey = Exclude<keyof Row, 'name'>;

// Categorical palette, fixed order: brand blue, clay, violet. Stepped from the
// ink-and-paper hues until they cleared the dataviz validator (lightness band,
// chroma floor, CVD and normal-vision separation, 3:1 against the card) in
// each mode. Dark uses its own steps, validated against the dark card surface.
const PALETTE = {
  light: ['#3f6fa6', '#c2613f', '#7a55a8'],
  dark: ['#5b8fd0', '#d8704a', '#9a79d6'],
} as const;

const FLOW: { key: SeriesKey; label: string; slot: 0 | 1 | 2 }[] = [
  { key: 'incoming', label: 'Incoming', slot: 0 },
  { key: 'outgoing', label: 'Outgoing', slot: 1 },
];
const TYPES: { key: SeriesKey; label: string; slot: 0 | 1 | 2 }[] = [
  { key: 'oneWay', label: 'One way', slot: 0 },
  { key: 'serviceReturn', label: 'Service and return', slot: 1 },
  { key: 'assessmentReturn', label: 'Assessment and return', slot: 2 },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'yearly', label: 'Yearly' },
];

function useChartTheme() {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  return {
    series: isDark ? PALETTE.dark : PALETTE.light,
    // The card surface: used for the 2px gap between stacked segments.
    surface: isDark ? '#1f1f1e' : '#ffffff',
    grid: isDark ? 'rgba(250,249,245,0.10)' : '#e8e6dc',
    tick: isDark ? 'rgba(250,249,245,0.62)' : '#78766d',
    cursor: isDark ? 'rgba(250,249,245,0.06)' : '#f0eee6',
  };
}

const Legend: React.FC<{ series: typeof FLOW; colors: readonly string[] }> = ({ series, colors }) => (
  <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-slate-700 dark:text-white/70">
    {series.map(s => (
      <li key={s.key} className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: colors[s.slot] }} />
        {s.label}
      </li>
    ))}
  </ul>
);

/** Tooltip in text tokens; the swatch beside each value carries identity. */
const ChartTooltip: React.FC<{
  active?: boolean;
  label?: string;
  payload?: { dataKey?: string | number; value?: number; color?: string; name?: string }[];
}> = ({ active, label, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-[10px] border border-slate-200 bg-white px-3 py-2 shadow-[0_4px_16px_rgba(20,20,19,0.12)] dark:border-white/15 dark:bg-slate-900">
      <p className="text-[12px] font-semibold text-ink dark:text-paper">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {payload.map(p => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-[12.5px] text-slate-700 dark:text-white/75">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums text-ink dark:text-paper">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The same numbers as a table, for screen readers and for anyone who prefers them. */
const TableView: React.FC<{ caption: string; rows: Row[]; series: typeof FLOW; rowHeader: string }> = ({ caption, rows, series, rowHeader }) => (
  <details className="group mt-2">
    <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-[13px] font-semibold text-slate-700 underline-offset-4 hover:underline dark:text-white/70">
      View as table
    </summary>
    <div className="overflow-x-auto">
      <table className="w-full text-start text-[13px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:border-white/10 dark:text-white/60">
            <th scope="col" className="py-1.5 pe-3">{rowHeader}</th>
            {series.map(s => <th key={s.key} scope="col" className="py-1.5 pe-3 text-end">{s.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              <th scope="row" className="py-1.5 pe-3 font-medium text-ink dark:text-paper">{r.name}</th>
              {series.map(s => <td key={s.key} className="py-1.5 pe-3 text-end tabular-nums text-slate-700 dark:text-white/75">{r[s.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </details>
);

const ChartBlock: React.FC<{
  title: string;
  rows: Row[];
  series: typeof FLOW;
  stacked?: boolean;
  horizontal?: boolean;
  rowHeader: string;
}> = ({ title, rows, series, stacked, horizontal, rowHeader }) => {
  const t = useChartTheme();
  const height = horizontal ? Math.max(160, rows.length * (stacked ? 34 : 44) + 40) : 220;
  const last = series[series.length - 1].key;
  const axisTick = { fontSize: 11, fill: t.tick };
  // Grouped bars cap at 12px so a pair stays under the 24px ceiling; a stack is one bar.
  const barSize = stacked ? (horizontal ? 18 : 22) : horizontal ? 10 : 12;
  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[14px] font-semibold text-ink dark:text-paper">{title}</span>
        <Legend series={series} colors={t.series} />
      </figcaption>
      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 4, left: horizontal ? 0 : -22, bottom: 0 }}
            barGap={2}
          >
            <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} stroke={t.grid} strokeWidth={1} />
            {horizontal ? (
              <>
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={axisTick} width={88} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" axisLine={{ stroke: t.grid }} tickLine={false} tick={axisTick} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
              </>
            )}
            <Tooltip cursor={{ fill: t.cursor }} content={<ChartTooltip />} />
            {series.map(s => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={t.series[s.slot]}
                stackId={stacked ? 'a' : undefined}
                barSize={barSize}
                // 4px rounded data-end, square at the baseline. In a stack only
                // the outermost segment gets the round end; the 2px surface
                // stroke is the gap between segments.
                radius={!stacked || s.key === last ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
                stroke={stacked ? t.surface : undefined}
                strokeWidth={stacked ? 2 : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView caption={title} rows={rows} series={series} rowHeader={rowHeader} />
    </figure>
  );
};

const panel = 'rounded-xl border border-slate-200 bg-white p-[14px] dark:border-white/12 dark:bg-white/[0.05]';
const panelTitle = 'font-heading text-[17px] font-semibold tracking-[-0.01em] text-ink dark:text-paper';

export const FacilityAnalyticsCharts: React.FC<FacilityAnalyticsChartsProps> = ({
  facilityReferrals,
  facilityAdmissions,
  userFacilityId,
}) => {
  const [chartPeriod, setChartPeriod] = useState<Period>('weekly');

  const dynamicChartData = useMemo(() => {
    const today = new Date();
    const data: Record<Period, Row[]> = { weekly: [], monthly: [], quarterly: [], yearly: [] };

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

    // Weekly: last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      data.weekly.push({ name: format(d, 'EEE'), ...countData(start, end) });
    }
    // Monthly: last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const end = subWeeks(today, i);
      const start = subWeeks(today, i + 1);
      data.monthly.push({ name: `W${4 - i}`, ...countData(start, end) });
    }
    // Quarterly: last 3 months
    for (let i = 2; i >= 0; i--) {
      const d = subMonths(today, i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      data.quarterly.push({ name: format(d, 'MMM'), ...countData(start, end) });
    }
    // Yearly: last 4 quarters
    for (let i = 3; i >= 0; i--) {
      const end = subQuarters(today, i);
      const start = subQuarters(today, i + 1);
      data.yearly.push({ name: `Q${4 - i}`, ...countData(start, end) });
    }
    return data;
  }, [facilityReferrals, facilityAdmissions, userFacilityId]);

  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, Row>();
    const getOrAdd = (dept: string) => {
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { name: dept, incoming: 0, outgoing: 0, oneWay: 0, serviceReturn: 0, assessmentReturn: 0 });
      }
      return deptMap.get(dept)!;
    };

    facilityReferrals.forEach(ref => {
      const isOutgoing = ref.referringFacilityId === userFacilityId;
      const isIncoming =
        !isOutgoing && (ref.receivingFacilityId === userFacilityId || ref.receivingFacilityId === 'auto');
      const depts = ref.receivingDepartments && ref.receivingDepartments.length > 0 ? ref.receivingDepartments : ['Unspecified'];
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

    return Array.from(deptMap.values()).sort((a, b) => b.incoming + b.outgoing - (a.incoming + a.outgoing));
  }, [facilityReferrals, userFacilityId]);

  const periodRows = dynamicChartData[chartPeriod];

  return (
    <div className="grid grid-cols-1 gap-3">
      <section aria-labelledby="transfer-flow" className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="transfer-flow" className={panelTitle}>Transfer flow</h3>
          {/* The period filter sits above both charts it controls. */}
          <div role="group" aria-label="Period" className="flex rounded-[10px] border border-slate-200 bg-paper p-0.5 dark:border-white/12 dark:bg-white/5">
            {PERIODS.map(p => (
              <button
                key={p.key}
                type="button"
                aria-pressed={chartPeriod === p.key}
                onClick={() => setChartPeriod(p.key)}
                className={cn(
                  'min-h-[40px] rounded-[8px] px-2.5 text-[12.5px] font-semibold transition-colors',
                  chartPeriod === p.key
                    ? 'bg-ink text-paper dark:bg-paper dark:text-ink'
                    : 'text-slate-700 hover:text-ink dark:text-white/70 dark:hover:text-paper'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <ChartBlock title="Referrals in and out" rows={periodRows} series={FLOW} rowHeader="Period" />
          <ChartBlock title="By transfer type" rows={periodRows} series={TYPES} stacked rowHeader="Period" />
        </div>
      </section>

      <section aria-labelledby="dept-demand" className={panel}>
        <h3 id="dept-demand" className={panelTitle}>Demand by department</h3>
        <p className="mt-0.5 text-[13px] text-slate-700 dark:text-white/65">All time, busiest first</p>
        {departmentChartData.length === 0 ? (
          <p className="mt-3 text-[14px] text-slate-700 dark:text-white/65">No referrals recorded yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <ChartBlock title="Referrals in and out" rows={departmentChartData} series={FLOW} horizontal rowHeader="Department" />
            <ChartBlock title="By transfer type" rows={departmentChartData} series={TYPES} stacked horizontal rowHeader="Department" />
          </div>
        )}
      </section>
    </div>
  );
};
