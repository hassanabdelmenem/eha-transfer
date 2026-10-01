import React from 'react';
import { formatDayMonthClock } from '../../i18n/format';
import { ShiftHandoverFeedProps } from './types';
import { MicroLabel } from './RoleHome';
import { useI18n, type Language } from '../../i18n';
import { shiftLogSummary } from '../../i18n/notifications';

const when = (iso: string | undefined, lang: Language) => {
  const t = Date.parse(iso || '');
  return Number.isNaN(t) ? '' : formatDayMonthClock(new Date(t), lang);
};

/** The last few handovers written for this unit, quiet, below the queue. */
export const ShiftHandoverFeed: React.FC<ShiftHandoverFeedProps> = ({
  shiftLogs,
  userFacilityId,
  userDepartment,
  limit = 5,
}) => {
  const { t, lang } = useI18n();
  const filteredLogs = shiftLogs
    .filter(
      log =>
        (!userFacilityId || log.facilityId === userFacilityId) &&
        (!userDepartment || log.department === userDepartment)
    )
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, limit);

  return (
    <section aria-labelledby="handover-feed" className="mt-6">
      <MicroLabel id="handover-feed">{t('handover.recent')}</MicroLabel>
      {filteredLogs.length === 0 ? (
        <p className="mt-2.5 text-[14px] text-slate-700 dark:text-white/65">{t('handover.none')}</p>
      ) : (
        <ul className="mt-2.5 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.04]">
          {filteredLogs.map(log => (
            <li key={log.id} className="px-[14px] py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-semibold text-ink dark:text-paper">
                  <bdi>{log.userName}</bdi>
                  {log.department && <span className="font-normal text-slate-700 dark:text-white/65"> · <bdi>{log.department}</bdi></span>}
                </p>
                <span className="shrink-0 font-mono text-[12px] font-medium text-slate-500 dark:text-white/60">{when(log.timestamp, lang)}</span>
              </div>
              {/* In the reader's language when the log carries key + vars; older logs keep their English. */}
              <p dir="auto" className="mt-1 line-clamp-2 text-[14px] leading-[1.5] text-slate-700 dark:text-white/70">{shiftLogSummary(lang, log)}</p>
              <p className="mt-1.5 flex gap-3 text-[12.5px] font-semibold">
                <span className="text-warning-800 dark:text-warning-300">{t('handover.pending', { count: log.pendingTransfersCount ?? 0 })}</span>
                <span className="text-success-700 dark:text-success-300">{t('handover.admitted', { count: log.admittedPatientsCount ?? 0 })}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
