import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType, Referral } from '../types';
import { sortByWorkflow } from '../lib/referralPriority';
import { toastError } from '../lib/toast';

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
  const { referrals, facilities, updateReferralStatus, toggleReferralEscalation, facilitiesById } = useData();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || (user.role !== 'system_admin' && user.role !== 'owner')) {
    return <div className="p-8">Access Denied. Admin privileges required.</div>;
  }

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
      </div>
    </div>
  );
};
