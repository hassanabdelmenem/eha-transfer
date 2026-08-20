import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Archive, Download } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
import { ReferralDetail } from '../components/referrals/ReferralDetail';
import { ReferralQueueRow } from '../components/referrals/ReferralQueueRow';
import { QueueDetailSplit, EmptyDetailPane } from '../components/layout/QueueDetailSplit';

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
  // Desktop master-detail selection (lg+ only), mirrors Dashboard.tsx's pattern.
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const handleExportCSV = () => {
    if (!user) return;
    const archived = myReferrals.filter(r => ['admitted', 'cancelled'].includes(r.status));

    const headers = ['ID', 'Patient Name', 'Hospital ID', 'Priority', 'Status', 'Referring Facility', 'Receiving Facility', 'Created At', 'Ended At'];
    const rows = archived.map(r => {
      const fromF = facilitiesById.get(r.referringFacilityId)?.name || 'Unknown';
      const toF = r.receivingFacilityId === 'auto' ? 'Auto-Routed (Pending)' : facilitiesById.get(r.receivingFacilityId || '')?.name || 'Unknown';
      const endedEntry = [...(r.statusHistory || [])].reverse().find(h => h.status === r.status);
      return [
        r.id,
        `"${r.patientData.name}"`,
        r.patientData.hospitalId,
        r.priority,
        r.status,
        `"${fromF}"`,
        `"${toF}"`,
        new Date(r.createdAt).toISOString(),
        endedEntry ? new Date(endedEntry.timestamp).toISOString() : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `referrals_archive_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) return null;

  // 3b: how a case closed, in one line -- who admitted it and when, or why
  // and by whom it was cancelled.
  const closedLine = (r: (typeof myReferrals)[number]) => {
    if (r.status === 'admitted') {
      const entry = [...(r.statusHistory || [])].reverse().find(h => h.status === 'admitted');
      const by = entry ? usersById.get(entry.userId)?.name : undefined;
      return `${r.requiredBedType} · admitted ${entry ? formatDateTime(entry.timestamp) : ''}${by ? ` by ${by}` : ''}`;
    }
    if (r.status === 'cancelled') {
      const by = r.cancelledBy ? usersById.get(r.cancelledBy)?.name : undefined;
      return `${r.cancelReason || 'Cancelled'}${by ? ` · closed by ${by}` : ''}`;
    }
    return '';
  };

  // 3b: most recently ended case first, using the timestamp of the status
  // history entry that matches the referral's current (ended) status.
  const endedAt = (r: (typeof myReferrals)[number]) => {
    const entry = [...(r.statusHistory || [])].reverse().find(h => h.status === r.status);
    return entry ? new Date(entry.timestamp).getTime() : new Date(r.updatedAt).getTime();
  };

  const q = searchQuery.toLowerCase().trim();
  const mobileRows = useMemo(() => myReferrals
    .filter(r => {
      if (!['admitted', 'cancelled'].includes(r.status)) return false;
      if (outcomeFilter !== 'all' && r.status !== outcomeFilter) return false;
      if (!q) return true;
      return r.patientData.name.toLowerCase().includes(q) || r.patientData.hospitalId.toLowerCase().includes(q) || r.receivingDepartments?.some(d => d.toLowerCase().includes(q));
    })
    .sort((a, b) => endedAt(b) - endedAt(a)),
  [myReferrals, outcomeFilter, q]);

  // Desktop master-detail: keep a valid selection as the filtered list changes.
  useEffect(() => {
    if (mobileRows.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!mobileRows.some(r => r.id === selectedId)) {
      setSelectedId(mobileRows[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileRows.map(r => r.id).join(',')]);

  return (
    <div className="flex flex-col space-y-6 pb-16">
      {/* 3b/3d: unified archive header + stat toggles + search + case list,
          same cards at every width -- edge-to-edge on phones, contained in a
          rounded header card once there's room, cases reflow into a grid. */}
      <div className="-mt-4 -mx-4 sm:mt-0 sm:mx-0 sm:rounded-xl sm:overflow-hidden shrink-0">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-white/60 hidden sm:block" />
            <h1 className="text-lg sm:text-xl font-heading font-semibold">Archive</h1>
          </div>
          <button onClick={handleExportCSV} className="min-h-[40px] px-3 rounded-lg border border-white/25 text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-colors flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
        <div className="p-4 sm:p-6 sm:bg-slate-50 sm:dark:bg-slate-950/40 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Referrals that have ended: the patient was admitted, or the referral was cancelled.</p>

          <div className="grid grid-cols-2 sm:max-w-md gap-3">
            <button
              onClick={() => setOutcomeFilter(outcomeFilter === 'admitted' ? 'all' : 'admitted')}
              className={`text-left rounded-xl border p-3.5 ${outcomeFilter === 'admitted' ? 'border-success-400 ring-1 ring-success-400 bg-success-50 dark:bg-success-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">Admitted</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.admitted}</p>
            </button>
            <button
              onClick={() => setOutcomeFilter(outcomeFilter === 'cancelled' ? 'all' : 'cancelled')}
              className={`text-left rounded-xl border p-3.5 ${outcomeFilter === 'cancelled' ? 'border-critical-400 ring-1 ring-critical-400 bg-critical-50 dark:bg-critical-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">Cancelled</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.cancelled}</p>
            </button>
          </div>

          <div className="relative sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Patient name, hospital ID or department"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">All ended cases · {mobileRows.length}</p>

          <div className="lg:hidden">
            {mobileRows.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No ended cases match.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {mobileRows.map(r => (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/referrals/${r.id}`)}
                    className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}, {r.patientData.age}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {r.patientData.hospitalId} · {facilitiesById.get(r.referringFacilityId)?.name || '—'} → {r.receivingFacilityId === 'auto' ? 'auto-routed' : (facilitiesById.get(r.receivingFacilityId)?.name || '—')}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${r.status === 'admitted' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400' : 'bg-critical-100 text-critical-700 dark:bg-critical-900/30 dark:text-critical-400'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">{closedLine(r)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <QueueDetailSplit
              list={
                mobileRows.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center px-3">No ended cases match.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mobileRows.map(r => (
                      <ReferralQueueRow key={r.id} referral={r} subtitle={closedLine(r)} selected={selectedId === r.id} onSelect={() => setSelectedId(r.id)} />
                    ))}
                  </div>
                )
              }
              detail={selectedId ? <ReferralDetail referralId={selectedId} variant="pane" /> : <EmptyDetailPane label="Select a case from the list to see its full details." />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
