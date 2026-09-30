import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Download } from 'lucide-react';
import { ScreenHeader, headerActionClass } from '../components/layout/ScreenHeader';
import { MicroLabel, EmptyQueue } from '../components/dashboard/RoleHome';
import { toCsv, downloadCsv, isoOrEmpty } from '../lib/csv';
import { formatDateTime, cn } from '../lib/utils';
import { useI18n } from '../i18n';
import { formatDayMonthClock } from '../i18n/format';

/**
 * Referrals that have ended: the patient was admitted, or the referral was
 * cancelled. Kept out of the day-to-day Referrals list (see the 'archived'
 * branch in ReferralList) so that list stays focused on cases still moving,
 * and given its own space here instead so ended cases are still easy to find
 * and audit later.
 */
export const ArchivePage: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilitiesById, usersById } = useData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'admitted' | 'cancelled'>('all');
  const { t, lang } = useI18n();

  const myReferrals = useMemo(() => {
    if (!user) return [];
    return referrals.filter(r =>
      r.referringFacilityId === user.facilityId ||
      r.receivingFacilityId === user.facilityId ||
      (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user.facilityId || '')) ||
      user.role === 'system_admin' ||
      user.role === 'owner'
    );
  }, [referrals, user]);

  const stats = useMemo(() => {
    const archived = myReferrals.filter(r => ['admitted', 'cancelled'].includes(r.status));
    return {
      admitted: archived.filter(r => r.status === 'admitted').length,
      cancelled: archived.filter(r => r.status === 'cancelled').length,
    };
  }, [myReferrals]);

  // 3b: most recently ended case first, using the timestamp of the status
  // history entry that matches the referral's current (ended) status.
  const endedEntry = (r: (typeof myReferrals)[number]) =>
    [...(Array.isArray(r.statusHistory) ? r.statusHistory : [])].reverse().find(h => h.status === r.status);
  const endedAt = (r: (typeof myReferrals)[number]) => {
    const t = Date.parse(endedEntry(r)?.timestamp || r.updatedAt);
    return Number.isNaN(t) ? 0 : t;
  };

  const q = searchQuery.toLowerCase().trim();
  // Before the early return: a hook after it changed the hook order once the user loaded.
  const rows = useMemo(() => myReferrals
    .filter(r => {
      if (!['admitted', 'cancelled'].includes(r.status)) return false;
      if (outcomeFilter !== 'all' && r.status !== outcomeFilter) return false;
      if (!q) return true;
      return r.patientData.name.toLowerCase().includes(q) || r.patientData.hospitalId.toLowerCase().includes(q) || r.receivingDepartments?.some(d => d.toLowerCase().includes(q));
    })
    .sort((a, b) => endedAt(b) - endedAt(a)),
  [myReferrals, outcomeFilter, q]);

  const facilityName = (id: string) => (id === 'auto' ? t('archive.autoRouted') : facilitiesById.get(id)?.name || '—');

  const handleExportCSV = () => {
    const archived = myReferrals.filter(r => ['admitted', 'cancelled'].includes(r.status));
    const headers = ['ID', 'Patient Name', 'Hospital ID', 'Priority', 'Status', 'Referring Facility', 'Receiving Facility', 'Created At', 'Ended At'];
    const data = archived.map(r => [
      r.id,
      r.patientData.name,
      r.patientData.hospitalId,
      r.priority,
      r.status,
      facilitiesById.get(r.referringFacilityId)?.name || 'Unknown',
      r.receivingFacilityId === 'auto' ? 'Auto-Routed (Pending)' : facilitiesById.get(r.receivingFacilityId || '')?.name || 'Unknown',
      isoOrEmpty(r.createdAt),
      isoOrEmpty(endedEntry(r)?.timestamp),
    ]);
    downloadCsv(`referrals_archive_${new Date().toISOString().split('T')[0]}.csv`, toCsv(headers, data));
  };

  if (!user) return null;

  // 3b: how a case closed, in one line -- who admitted it and when, or why
  // and by whom it was cancelled.
  const closedLine = (r: (typeof myReferrals)[number]) => {
    if (r.status === 'admitted') {
      const entry = endedEntry(r);
      const by = entry ? usersById.get(entry.userId)?.name : undefined;
      // English keeps its long date; Arabic gets day, month and a 24-hour clock.
      const when = entry && (lang === 'ar' ? formatDayMonthClock(new Date(entry.timestamp), lang) : formatDateTime(entry.timestamp));
      return [t('archive.admittedLine', { bed: r.requiredBedType }), when, by && t('archive.by', { name: by })].filter(Boolean).join(' ');
    }
    const by = r.cancelledBy ? usersById.get(r.cancelledBy)?.name : undefined;
    return `${r.cancelReason || t('archive.cancelled')}${by ? ` · ${t('archive.closedBy', { name: by })}` : ''}`;
  };

  const tile = (key: 'admitted' | 'cancelled', label: string, count: number) => {
    const on = outcomeFilter === key;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setOutcomeFilter(on ? 'all' : key)}
        className={cn(
          'min-h-[76px] rounded-xl border px-[14px] py-3 text-start transition-colors',
          on
            ? key === 'admitted'
              ? 'border-success-700 bg-success-100 ring-1 ring-success-700 dark:border-success-400 dark:bg-success-900/50 dark:ring-success-400'
              : 'border-critical-700 bg-critical-100 ring-1 ring-critical-700 dark:border-critical-400 dark:bg-critical-950/50 dark:ring-critical-400'
            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/12 dark:bg-white/[0.05] dark:hover:bg-white/10'
        )}
      >
        <span className="block text-[13.5px] text-slate-700 dark:text-white/70">{label}</span>
        <span className="mt-0.5 block font-heading text-[26px] font-semibold leading-none tabular-nums text-ink dark:text-paper">{count}</span>
      </button>
    );
  };

  return (
    <div className="max-w-[640px]">
      <ScreenHeader
        title={t('archive.title')}
        action={
          <button type="button" onClick={handleExportCSV} className={headerActionClass}>
            <Download className="me-1.5 h-4 w-4" aria-hidden="true" /> {t('screen.exportCsv')}
          </button>
        }
      />

      <p className="text-[14.5px] leading-[1.45] text-slate-700 dark:text-white/65">
        {t('archive.intro')}
      </p>

      <div role="group" aria-label={t('archive.filterLabel')} className="mt-3.5 grid grid-cols-2 gap-2.5">
        {tile('admitted', t('archive.admitted'), stats.admitted)}
        {tile('cancelled', t('archive.cancelled'), stats.cancelled)}
      </div>

      <div className="relative mt-3">
        <label htmlFor="archive-search" className="sr-only">{t('archive.searchLabel')}</label>
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500 dark:text-white/55" aria-hidden="true" />
        <input
          id="archive-search"
          type="search"
          autoComplete="off"
          placeholder={t('archive.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="min-h-[52px] w-full rounded-[10px] border border-slate-300 bg-white ps-11 pe-3 text-[16px] text-ink placeholder:text-slate-500 focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper dark:placeholder:text-white/45"
        />
      </div>

      <section aria-labelledby="archive-list" className="mt-5 flex flex-col gap-2.5">
        <MicroLabel id="archive-list">
          {outcomeFilter === 'all' ? t('archive.allEnded') : outcomeFilter === 'admitted' ? t('archive.admitted') : t('archive.cancelled')} · {rows.length}
        </MicroLabel>
        {rows.length === 0 ? (
          <EmptyQueue>{q || outcomeFilter !== 'all' ? t('archive.noMatch') : t('archive.noneYet')}</EmptyQueue>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/referrals/${r.id}`)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-[14px] text-start transition-colors hover:bg-slate-50 dark:border-white/12 dark:bg-white/[0.05] dark:hover:bg-white/10"
                >
                  <span className="flex items-start justify-between gap-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] font-semibold text-ink dark:text-paper">{r.patientData.name}, {r.patientData.age}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-[1.4] text-slate-700 dark:text-white/65">
                        <bdi className="font-mono">{r.patientData.hospitalId}</bdi> · <bdi>{facilityName(r.referringFacilityId)}</bdi> <span className="inline-block rtl:-scale-x-100">→</span> <bdi>{facilityName(r.receivingFacilityId)}</bdi>
                      </span>
                    </span>
                    <span className={cn(
                      'shrink-0 rounded-[6px] px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em]',
                      r.status === 'admitted' ? 'bg-success-100 text-success-800 dark:bg-success-900/60 dark:text-success-200' : 'bg-critical-100 text-critical-700 dark:bg-critical-950/60 dark:text-critical-200'
                    )}>
                      {t(`status.${r.status}`)}
                    </span>
                  </span>
                  <span className="mt-2.5 block border-t border-slate-200 pt-2.5 text-[13.5px] leading-[1.4] text-slate-700 dark:border-white/10 dark:text-white/70">
                    {closedLine(r)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
