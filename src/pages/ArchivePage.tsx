import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ReferralList } from '../components/referrals/ReferralList';
import { Input } from '../components/ui/Input';
import { Search, Archive, CheckCircle2, Ban, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';

/**
 * Referrals that have ended: the patient was admitted, or the referral was
 * cancelled. Kept out of the day-to-day Referrals list (see the 'archived'
 * branch in ReferralList) so that list stays focused on cases still moving,
 * and given its own space here instead so ended cases are still easy to find
 * and audit later.
 */
export const ArchivePage: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilitiesById } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'admitted' | 'cancelled'>('all');

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

  // ReferralList only understands a single statusFilter value, so "admitted
  // only" / "cancelled only" is expressed by handing it that exact status
  // rather than the combined 'archived' bucket.
  const listStatusFilter = outcomeFilter === 'all' ? 'archived' : outcomeFilter;

  return (
    <div className="h-full flex flex-col space-y-6 pb-16 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Archive className="w-6 h-6 text-slate-500" />
            Archive
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Referrals that have ended: admitted patients and cancelled referrals.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="bg-white dark:bg-slate-900">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
        <button
          type="button"
          onClick={() => setOutcomeFilter(outcomeFilter === 'admitted' ? 'all' : 'admitted')}
          className={`text-left bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm flex items-center gap-4 transition-colors ${outcomeFilter === 'admitted' ? 'border-success-400 ring-1 ring-success-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-500">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Admitted</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.admitted}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setOutcomeFilter(outcomeFilter === 'cancelled' ? 'all' : 'cancelled')}
          className={`text-left bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm flex items-center gap-4 transition-colors ${outcomeFilter === 'cancelled' ? 'border-critical-400 ring-1 ring-critical-400' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="bg-critical-100 dark:bg-critical-900/30 p-3 rounded-full text-critical-600 dark:text-critical-500">
            <Ban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Cancelled</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.cancelled}</p>
          </div>
        </button>
      </div>

      <div className="shrink-0">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            className="pl-9"
            placeholder="Search by Patient Name, Hospital ID, or Department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <h3 className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">Archived Referrals</h3>
        </div>
        <div className="flex-1 overflow-auto">
          <ReferralList facilityId={user.facilityId} searchQuery={searchQuery} statusFilter={listStatusFilter} />
        </div>
      </div>
    </div>
  );
};
