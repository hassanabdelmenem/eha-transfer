import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Referral } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatDateTime } from '../../lib/utils';
import { isSlaTracked, secondsUntilSlaBreach } from '../../lib/sla';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Timer, AlertTriangle } from 'lucide-react';
import { SkeletonGroup, SkeletonReferralCard, SkeletonReferralRow } from '../ui/Skeleton';

interface ReferralListProps {
  limit?: number;
  facilityId?: string;
  searchQuery?: string;
  priorityFilter?: string;
  statusFilter?: string;
  deptFilter?: string;
  bedFilter?: string;
  prioritySort?: boolean;
}



const UrgencyTimer: React.FC<{ referral: Referral; now: Date }> = ({ referral, now }) => {
  // Scope and threshold both come from lib/sla so this badge cannot drift out of
  // step with the escalation that acts on it.
  if (!isSlaTracked(referral)) return null;

  const secondsToLimit = secondsUntilSlaBreach(referral, now);
  // Unreadable createdAt: show nothing rather than a countdown built on NaN.
  if (secondsToLimit === null) return null;

  if (secondsToLimit <= 0) {
    const overdueSeconds = Math.abs(secondsToLimit);
    const m = Math.floor(overdueSeconds / 60);
    const s = overdueSeconds % 60;
    // Distinguish "escalated" from "breached but not yet escalated". The badge
    // used to claim a breach while nothing had actually happened; if escalation
    // has not landed yet (offline, or the sweep has not run), say so plainly
    // rather than implying the system has taken over.
    // Solid fill, not a tint: the countdown state below is a tint, so severity is
    // carried by shape and weight as well as colour. `motion-safe:` gates the
    // pulse — an infinite opacity animation drops this text to roughly 2:1
    // contrast at the trough, and there is no way to pause it.
    return (
      <div className="inline-flex items-center gap-1 mt-1 text-white bg-critical-700 px-2 py-0.5 rounded motion-safe:animate-pulse border border-critical-800">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
        <span className="text-xs font-sans font-bold uppercase tabular-nums">
          {referral.isEscalated ? 'Escalated' : 'No response'} +{m}:{s.toString().padStart(2, '0')}
        </span>
        {/* The escalated/pending distinction used to live only in a title
            tooltip, which touch users never see and screen readers generally do
            not announce — and it is the difference between "the system has taken
            over" and "nobody has done anything yet". */}
        <span className="sr-only">
          {referral.isEscalated
            ? 'Overdue, escalated to administrator'
            : 'Overdue, escalation pending'}
        </span>
      </div>
    );
  }

  const m = Math.floor(secondsToLimit / 60);
  const s = secondsToLimit % 60;
  return (
    <div className="inline-flex items-center gap-1 mt-1 text-warning-800 bg-warning-100 dark:text-warning-300 dark:bg-warning-900/40 px-2 py-0.5 rounded border border-warning-300 dark:border-warning-700">
      <Timer className="w-3 h-3" aria-hidden="true" />
      {/* tabular-nums stops the digits shifting horizontally on every tick, which
          is its own legibility problem on a 1Hz counter. */}
      <span className="text-xs font-sans font-bold uppercase tabular-nums" aria-hidden="true">
        {m}:{s.toString().padStart(2, '0')} left
      </span>
      {/* Coarse, so it does not change every second under a screen reader. */}
      <span className="sr-only">
        {m >= 5 ? 'Response due within 30 minutes' : 'Response overdue in under 5 minutes'}
      </span>
    </div>
  );
};

export const ReferralList: React.FC<ReferralListProps> = ({ limit, facilityId, searchQuery = '', priorityFilter = 'all', statusFilter = 'all', deptFilter = 'all', bedFilter = 'all', prioritySort = false }) => {
  const { referrals, facilities, loading } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Create a quick lookup map for facilities to avoid O(n) finds during render
  const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);

  // Shared timer for all list items: one interval for the whole list instead of one per row.
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    if (!referrals.some(isSlaTracked)) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [referrals]);

  // Referrals hasn't loaded yet -- show placeholders, not "No referrals found."
  // Firestore's onSnapshot starts every subscriber from an empty array, so
  // without this a clinician opening the app mid-shift briefly sees the same
  // screen as a facility with a genuinely empty referral queue.
  if (loading) {
    return (
      <div className="w-full">
        <div className="block md:hidden space-y-4">
          <SkeletonGroup label="Loading referrals…">
            {Array.from({ length: limit ?? 4 }).map((_, i) => <SkeletonReferralCard key={i} />)}
          </SkeletonGroup>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-6 py-3">Patient Identity</th>
                <th className="px-6 py-3">Origin Facility</th>
                <th className="px-6 py-3">Target Specialty</th>
                <th className="px-6 py-3">Clinical Priority</th>
                <th className="px-6 py-3">Current Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            {/* aria-label/aria-busy directly on <tbody>, not a wrapping <div>:
                a <div> is not a valid child of <table> and browsers will hoist
                it out, which can silently break the table's own structure. */}
            <tbody className="text-xs" aria-busy="true" aria-live="polite" aria-label="Loading referrals">
              {Array.from({ length: limit ?? 6 }).map((_, i) => <SkeletonReferralRow key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  let filtered = referrals;

  // If user is admin/owner and no facilityId passed (or explicitly showing all), show all
  const isAdmin = user?.role === 'system_admin' || user?.role === 'owner';
  
  if (facilityId) {
    filtered = referrals.filter(
      r => r.referringFacilityId === facilityId || 
           r.receivingFacilityId === facilityId || 
           (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId))
    );
  } else if (!isAdmin && user?.facilityId) {
     filtered = referrals.filter(
      r => r.referringFacilityId === user.facilityId || 
           r.receivingFacilityId === user.facilityId || 
           (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(user?.facilityId || ''))
    );
  }

  // Apply search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => 
      r.patientData.name.toLowerCase().includes(q) ||
      r.patientData.hospitalId.toLowerCase().includes(q) ||
      r.receivingDepartments.some(d => d.toLowerCase().includes(q))
    );
  }

  // Apply priority filter
  if (priorityFilter !== 'all') {
    filtered = filtered.filter(r => r.priority === priorityFilter);
  }

  // Apply dept filter
  if (deptFilter !== 'all') {
    filtered = filtered.filter(r => r.receivingDepartments.includes(deptFilter));
  }

  // Apply bed filter
  if (bedFilter !== 'all') {
    filtered = filtered.filter(r => r.requiredBedType === bedFilter);
  }

  // Apply status filter. Cancelled referrals are archived out of every view except the
  // explicit "cancelled" filter, so they don't clutter day-to-day lists/KPIs.
  if (statusFilter === 'cancelled') {
    filtered = filtered.filter(r => r.status === 'cancelled');
  } else if (statusFilter === 'archived') {
    // The Archive: referrals that have ended, one way or the other -- the
    // patient was admitted, or the referral was cancelled. Discharged and
    // rejected referrals stay out of this bucket deliberately; only admitted
    // and cancelled were asked for.
    filtered = filtered.filter(r => ['admitted', 'cancelled'].includes(r.status));
  } else if (statusFilter !== 'all') {
    if (statusFilter === 'active') {
      filtered = filtered.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status));
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(r => ['admitted', 'discharged', 'rejected'].includes(r.status));
    } else if (statusFilter === 'accepted') {
      filtered = filtered.filter(r => ['accepted', 'patient_consented', 'in_transit', 'arrived'].includes(r.status));
    } else {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
  } else {
    filtered = filtered.filter(r => r.status !== 'cancelled' && r.status !== 'admitted');
  }

  // Pre-parse timestamps once per referral to avoid repeated Date parsing during sort
  const enriched = filtered.map(r => ({ r, createdAtMs: Date.parse(r.createdAt) }));

  if (prioritySort) {
    const getPriorityWeight = (priority: string) => {
      if (priority === 'emergency') return 3000;
      if (priority === 'urgent') return 2000;
      return 1000;
    };
    const getSeverityWeight = (bedType: string) => {
      if (bedType === 'ICU' || bedType === 'CCU' || bedType === 'PICU') return 500;
      return 0;
    };

    const now = Date.now();
    enriched.sort((A, B) => {
      const a = A.r;
      const b = B.r;
      const aTime = now - A.createdAtMs;
      const bTime = now - B.createdAtMs;

      const aTimeScore = Math.floor(aTime / 60000) * 10;
      const bTimeScore = Math.floor(bTime / 60000) * 10;

      const aScore = getPriorityWeight(a.priority) + getSeverityWeight(a.requiredBedType) + (a.status === 'pending' ? aTimeScore : 0);
      const bScore = getPriorityWeight(b.priority) + getSeverityWeight(b.requiredBedType) + (b.status === 'pending' ? bTimeScore : 0);

      if (aScore !== bScore) return bScore - aScore;
      return B.createdAtMs - A.createdAtMs;
    });
  } else {
    // Sort by latest first (pre-parsed)
    enriched.sort((A, B) => B.createdAtMs - A.createdAtMs);
  }

  // Restore filtered array to original referral objects, now sorted
  filtered = enriched.map(e => e.r);

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  if (filtered.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        No referrals found.
      </Card>
    );
  }

  const getPriorityBadge = (priority: Referral['priority']) => {
    switch (priority) {
      case 'emergency': return <Badge variant="danger">Emergency</Badge>;
      case 'urgent': return <Badge variant="warning">Urgent</Badge>;
      default: return <Badge variant="default">Routine</Badge>;
    }
  };

  const getStatusBadge = (status: Referral['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">Pending</Badge>;
      case 'accepted': return <Badge variant="info">Accepted</Badge>;
      case 'patient_consented': return <Badge variant="info">Patient Consented</Badge>;
      case 'rejected': return <Badge variant="danger">Rejected</Badge>;
      case 'in_transit': return <Badge variant="info">In Transit</Badge>;
      case 'arrived': return <Badge variant="info">Arrived</Badge>;
      case 'admitted': return <Badge variant="success">Admitted</Badge>;
      case 'discharged': return <Badge variant="default">Discharged</Badge>;
      case 'cancelled': return <Badge variant="danger">Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="w-full">
      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
        {filtered.map(referral => {
          const fromFacility = facilityMap.get(referral.referringFacilityId);
          return (
            <Card key={referral.id} className="p-4 cursor-pointer hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors" onClick={() => navigate(`/referrals/${referral.id}`)}>
              <div className="flex justify-between items-start gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{referral.patientData.name || 'Unknown Patient'}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">HID: {referral.patientData.hospitalId}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {referral.priority === 'emergency' && <span className="px-2 py-0.5 bg-critical-700 text-white dark:bg-critical-600 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">EMERGENCY</span>}
                  {referral.priority === 'urgent' && <span className="px-2 py-0.5 bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300 border border-warning-300 dark:border-warning-700 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">URGENT</span>}
                  {referral.priority === 'routine' && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">ROUTINE</span>}
                  <div className="mt-1">
                    <UrgencyTimer referral={referral} now={now} />
                  </div>
                  <div className="flex items-center gap-1 font-medium text-xs uppercase text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {['in_transit', 'accepted', 'patient_consented', 'arrived', 'manager_approved', 'dept_approved'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-info-500 rounded-full shrink-0"></div>}
                    {['pending'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-warning-500 rounded-full shrink-0"></div>}
                    {['admitted', 'discharged'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-success-500 rounded-full shrink-0"></div>}
                    {['rejected', 'cancelled'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-critical-500 rounded-full shrink-0"></div>}
                    <span className="capitalize">{referral.status?.replace(/_/g, ' ') || 'UNKNOWN'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-400 uppercase">From</span>
                  <span className="block truncate">{fromFacility?.name || '—'}</span>
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-400 uppercase">Target</span>
                  <span className="block uppercase truncate">{referral.receivingDepartments?.join(', ') || 'N/A'}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <Link
                  to={`/referrals/${referral.id}`}
                  className="inline-flex items-center justify-center gap-1 min-h-[40px] px-3 rounded text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  View Card
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">
            <tr>
              <th className="px-6 py-3">Patient Identity</th>
              <th className="px-6 py-3">Origin Facility</th>
              <th className="px-6 py-3">Target Specialty</th>
              <th className="px-6 py-3">Clinical Priority</th>
              <th className="px-6 py-3">Current Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {filtered.map((referral) => {
              const fromFacility = facilityMap.get(referral.referringFacilityId);
              const toFacility = facilityMap.get(referral.receivingFacilityId);
              
              return (
                <tr key={referral.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-800 cursor-pointer transition-colors" onClick={() => navigate(`/referrals/${referral.id}`)}>
                  <td className="px-6 py-4 max-w-[220px]">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{referral.patientData.name || 'Unknown Patient'}</div>
                    <div className="text-xs text-slate-400 font-mono mt-1 truncate">HID: {referral.patientData.hospitalId}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium max-w-[200px] truncate">{fromFacility?.name || '—'}</td>
                  <td className="px-6 py-4 uppercase text-slate-700 dark:text-slate-300 max-w-[180px] truncate">{referral.receivingDepartments?.join(', ') || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {referral.priority === 'emergency' && <span className="px-2 py-0.5 bg-critical-700 text-white dark:bg-critical-600 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">EMERGENCY</span>}
                    {referral.priority === 'urgent' && <span className="px-2 py-0.5 bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300 border border-warning-300 dark:border-warning-700 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">URGENT</span>}
                    {referral.priority === 'routine' && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded text-xs font-sans font-bold uppercase whitespace-nowrap">ROUTINE</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 font-medium text-xs uppercase text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {['in_transit', 'accepted', 'patient_consented', 'arrived', 'manager_approved', 'dept_approved'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-info-500 rounded-full shrink-0"></div>}
                        {['pending'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-warning-500 rounded-full shrink-0"></div>}
                        {['admitted', 'discharged'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-success-500 rounded-full shrink-0"></div>}
                        {['rejected', 'cancelled'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-critical-500 rounded-full shrink-0"></div>}
                        {['postponed'].includes(referral.status) && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shrink-0"></div>}
                        <span className="capitalize">{referral.status?.replace(/_/g, ' ') || 'UNKNOWN'}</span>
                      </div>
                      {referral.isEscalated && (
                        <span className="px-2 py-0.5 bg-critical-700 text-white rounded text-xs font-sans font-bold uppercase tracking-wider motion-safe:animate-pulse whitespace-nowrap">
                          ESCALATED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/referrals/${referral.id}`} className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-bold uppercase text-xs border border-blue-200 dark:border-blue-800 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap">
                      View Card
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
