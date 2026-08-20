import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType, Referral } from '../types';
import { SkeletonStatCard, Skeleton } from '../components/ui/Skeleton';
import { sortByWorkflow } from '../lib/referralPriority';
import { toastError } from '../lib/toast';
import { ReferralDetail } from '../components/referrals/ReferralDetail';
import { ReferralQueueRow } from '../components/referrals/ReferralQueueRow';
import { QueueDetailSplit, EmptyDetailPane } from '../components/layout/QueueDetailSplit';

const PRIORITY_LABEL: Record<string, string> = { emergency: 'E', urgent: 'U', routine: 'R' };
// Status scale, not raw red-/amber-/blue-: emergency and urgent used to both
// resolve to the same brand orange, so the "E" and "U" waitlist dots were the
// same color and only the letter told them apart.
const PRIORITY_DOT: Record<string, string> = { emergency: 'bg-critical-600', urgent: 'bg-warning-500', routine: 'bg-info-500' };

const ESCALATION_LABEL: Record<string, string> = {
  no_beds_available: 'No beds available',
  no_matching_facility: 'No matching facility',
  sla_breach: 'No response',
  requirements_needed: 'Requirements needed',
  manual: 'Escalated',
};
const ESCALATION_DESC: Record<string, string> = {
  no_beds_available: 'Every matching facility is at full capacity for the required bed type. Chasing the receiving facilities will not help.',
  no_matching_facility: 'No facility in the network provides the required departments and bed type. This referral cannot route itself.',
  sla_breach: 'No facility responded within 30 minutes of this referral being raised.',
  requirements_needed: 'Sent back to the referring facility with requirements before it can proceed.',
  manual: 'A human judged this referral needs administrative attention.',
};
const ESCALATION_PRIMARY: Record<string, string> = {
  no_beds_available: 'Place at a contracted facility',
  no_matching_facility: 'Override the destination',
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities, loading, updateReferralStatus, toggleReferralEscalation, facilitiesById } = useData();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  // Desktop master-detail selection (lg+ only), mirrors Dashboard.tsx's pattern.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!user || (user.role !== 'system_admin' && user.role !== 'owner')) {
    return <div className="p-8">Access Denied. Admin privileges required.</div>;
  }

  // A referral counts against a facility once it is claimed *or* while it is still
  // auto-routing and this facility is one of the notified candidates -- auto-route is
  // the default, so matching only on receivingFacilityId showed an empty waitlist
  // even with unclaimed emergencies pending.
  const isAwaitingAt = (r: (typeof referrals)[number], facilityId: string) =>
    (r.receivingFacilityId === facilityId ||
      (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId))) &&
    !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status);

  // Calculate waitlists (pending/approved but not admitted/rejected) for each bed type in each facility
  const getWaitlist = (facilityId: string, bedType: BedType) => {
    return referrals.filter(r => isAwaitingAt(r, facilityId) && r.requiredBedType === bedType);
  };

  const calculateTotalCapacity = () => {
    const totals: Record<BedType, { total: number; occupied: number; available: number }> = {
      ICU: { total: 0, occupied: 0, available: 0 },
      CCU: { total: 0, occupied: 0, available: 0 },
      PICU: { total: 0, occupied: 0, available: 0 },
      Ward: { total: 0, occupied: 0, available: 0 }
    };

    facilities.filter(f => f.type !== 'primary_care').forEach(facility => {
      (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).forEach(bed => {
        const cap = facility.capacity[bed];
        if (cap) {
          totals[bed].total += cap.total;
          totals[bed].occupied += cap.occupied;
          totals[bed].available += (cap.total - cap.occupied);
        }
      });
    });

    return totals;
  };

  const globalTotals = calculateTotalCapacity();

  // 3a: escalations only a system admin can act on -- top-level, not just
  // facility-level, so chasing a receiving facility never helps here.
  const systemEscalations = sortByWorkflow(
    referrals.filter(r => r.isEscalated && r.escalationLevel === 'system' && !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status))
  );
  const escalationAge = (r: Referral) => {
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(r.escalatedAt || r.createdAt)) / 60000));
    return `${mins} min`;
  };
  const handlePostpone = async (id: string) => {
    setBusyId(id);
    try {
      await updateReferralStatus(id, 'postponed', 'Postponed by system administrator.');
    } catch (e: any) {
      toastError(e, 'Could not postpone this referral.');
    } finally {
      setBusyId(null);
    }
  };
  const handleDeEscalate = async (id: string) => {
    setBusyId(id);
    try {
      await toggleReferralEscalation(id, false);
    } catch (e: any) {
      toastError(e, 'Could not de-escalate this referral.');
    } finally {
      setBusyId(null);
    }
  };

  // Desktop master-detail: keep a valid selection as systemEscalations changes.
  useEffect(() => {
    if (systemEscalations.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (!systemEscalations.some(r => r.id === selectedId)) {
      setSelectedId(systemEscalations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemEscalations.map(r => r.id).join(',')]);

  return (
    <div className="space-y-6 pb-16 h-full overflow-auto">
      {/* 3a/3d: unified escalation console -- edge-to-edge on phones,
          contained in a rounded card once there's room, escalation cards
          reflow into a responsive grid at wider widths. */}
      <div className="-mt-4 -mx-4 sm:mt-0 sm:mx-0 sm:rounded-xl sm:overflow-hidden bg-slate-950 text-white">
        <div className="px-4 pt-4 pb-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl font-heading font-semibold">Escalation console</h1>
              <p className="text-xs text-white/60">System administrator · whole network</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-semibold">{systemEscalations.length} only you can fix</h2>
            <p className="text-sm text-white/60 mt-1">System-level means chasing the hospitals will not help — the capacity does not exist.</p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 xl:grid-cols-4 gap-2">
            {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => (
              <div key={bed} className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-center">
                <p className="text-[10px] font-bold uppercase text-white/50">{bed}</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{globalTotals[bed].available}</p>
                <p className="text-[10px] text-white/50">of {globalTotals[bed].total}</p>
              </div>
            ))}
          </div>

          <div className="lg:hidden">
            {systemEscalations.length === 0 ? (
              <p className="text-sm text-white/60 py-6 text-center">Nothing needs administrative placement right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {systemEscalations.map(r => {
                  const reason = r.escalationReason || 'manual';
                  const fromFacility = facilitiesById.get(r.referringFacilityId)?.name || 'referring facility';
                  return (
                    <div key={r.id} className="rounded-xl border-2 border-critical-700 bg-critical-950/40 overflow-hidden">
                      <div className="bg-critical-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center justify-between">
                        <span>System level · {ESCALATION_LABEL[reason]}</span>
                        <span className="font-mono normal-case">{escalationAge(r)}</span>
                      </div>
                      <div className="p-3.5 space-y-3">
                        <div>
                          <p className="text-[17px] font-bold">{r.patientData.name}, {r.patientData.age}</p>
                          <p className="text-sm text-white/60 mt-0.5">{r.requiredBedType} · {r.priority} · from {fromFacility}</p>
                        </div>
                        <p className="text-sm text-white/80 bg-white/5 rounded-lg p-2.5">{ESCALATION_DESC[reason]}</p>
                        <button
                          onClick={() => navigate(`/referrals/${r.id}`)}
                          className="w-full min-h-[52px] rounded-lg bg-white text-slate-950 text-sm font-bold uppercase tracking-wide"
                        >
                          {ESCALATION_PRIMARY[reason] || 'Review now'}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handlePostpone(r.id)}
                            disabled={busyId === r.id}
                            className="min-h-[48px] rounded-lg border border-warning-500 text-warning-400 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                          >
                            Postpone
                          </button>
                          <button
                            onClick={() => handleDeEscalate(r.id)}
                            disabled={busyId === r.id}
                            className="min-h-[48px] rounded-lg border border-white/30 text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50"
                          >
                            De-escalate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <QueueDetailSplit
              list={
                systemEscalations.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center px-3">Nothing needs administrative placement right now.</p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {systemEscalations.map(r => (
                      <ReferralQueueRow
                        key={r.id}
                        referral={r}
                        escalated
                        subtitle={`${r.requiredBedType} · ${ESCALATION_LABEL[r.escalationReason || 'manual']} · ${escalationAge(r)}`}
                        selected={selectedId === r.id}
                        onSelect={() => setSelectedId(r.id)}
                      />
                    ))}
                  </div>
                )
              }
              detail={selectedId ? <ReferralDetail referralId={selectedId} variant="pane" /> : <EmptyDetailPane label="Select a case from the list to see its full details." />}
            />
          </div>
        </div>
      </div>

      {/* Per-hospital stats: global bed totals and each facility's capacity
          and active waitlist, restored after being mistaken for a duplicate
          of the escalation console above -- it is not: the console covers
          system-level escalations, this covers every facility's numbers. */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Network capacity</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Global view of all facilities, bed capacities, and active waitlists.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
          ) : (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => (
            <div key={bed} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{bed} available</p>
              <div className="flex items-end gap-2 mt-1">
                <span className={`text-2xl font-bold ${globalTotals[bed].available > 0 ? 'text-success-600' : 'text-critical-600'}`}>
                  {globalTotals[bed].available}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mb-0.5">/ {globalTotals[bed].total}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)
          ) : facilities.filter(f => f.type !== 'primary_care').map(facility => (
            <div key={facility.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="bg-slate-950 text-white px-4 py-3 flex justify-between items-center gap-2">
                <h3 className="text-sm font-bold min-w-0 truncate">{facility.name}</h3>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded uppercase shrink-0 whitespace-nowrap">{(facility.type || '').replace('_', ' ')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">Bed Type</th>
                      <th className="px-4 py-2.5 text-center">Capacity</th>
                      <th className="px-4 py-2.5 text-center">Occupied</th>
                      <th className="px-4 py-2.5 text-center">Available</th>
                      <th className="px-4 py-2.5 text-right">Waitlist</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => {
                      const cap = facility.capacity[bed];
                      if (!cap || cap.total === 0) return null;
                      const available = cap.total - cap.occupied;
                      const waitlist = getWaitlist(facility.id, bed);
                      const isFull = available <= 0;
                      const isCritical = waitlist.length > available;

                      return (
                        <tr key={bed} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                          <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">{bed}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-400">{cap.total}</td>
                          <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-400">{cap.occupied}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isFull ? 'bg-critical-100 text-critical-700 dark:bg-critical-900/40 dark:text-critical-300' : 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300'}`}>
                              {available}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isCritical ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {waitlist.length} waiting
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Waitlist details for this facility */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Waitlist by department</h4>
                {(() => {
                  const rows = facility.departments.map(dept => {
                    const deptWaitlist = referrals.filter(r =>
                      isAwaitingAt(r, facility.id) && r.receivingDepartments.includes(dept)
                    );
                    if (deptWaitlist.length === 0) return null;

                    return (
                      <div key={dept} className="flex justify-between items-center py-1 text-xs border-b border-slate-200 dark:border-slate-800 last:border-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                        <div className="flex gap-1">
                          {deptWaitlist.map(r => (
                            <Link
                              key={r.id}
                              to={`/referrals/${r.id}`}
                              title={`${r.priority.toUpperCase()} - ${r.requiredBedType}`}
                              aria-label={`${r.priority} priority ${r.requiredBedType} referral — open referral`}
                              className="w-10 h-10 flex items-center justify-center hover:opacity-80 transition-opacity"
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white ${PRIORITY_DOT[r.priority] || 'bg-info-500'}`}>
                                {PRIORITY_LABEL[r.priority] || '?'}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }).filter(Boolean);

                  return rows.length > 0
                    ? rows
                    : <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No active waitlist for this facility.</p>;
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
