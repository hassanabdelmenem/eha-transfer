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
  const { referrals, facilities, updateReferralStatus, toggleReferralEscalation, overrideReferralDestination, facilitiesById } = useData();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [placementFacilityId, setPlacementFacilityId] = useState('');

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
  const handleConfirmPlacement = async (id: string) => {
    if (!placementFacilityId) return;
    setBusyId(id);
    try {
      await overrideReferralDestination(id, placementFacilityId);
      setPlacingId(null);
      setPlacementFacilityId('');
    } catch (e: any) {
      toastError(e, 'Could not place this referral at that facility.');
    } finally {
      setBusyId(null);
    }
  };

  // Waitlist pressure: how many emergency/urgent/routine referrals are
  // currently stalled waiting on each facility, network-wide. Dot fills use
  // warning-700, not warning-500 -- white text on warning-500 (#f59e0b) is
  // 2.15:1, below AA; the letter (E/U/R) is the colourblind-safe channel
  // either way.
  const waitlistByFacility = (() => {
    const active = referrals.filter(r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status));
    const counts = new Map<string, { emergency: number; urgent: number; routine: number }>();
    for (const r of active) {
      const facilityId = r.receivingFacilityId === 'auto' ? null : r.receivingFacilityId;
      const ids = facilityId ? [facilityId] : (r.candidateFacilityIds || []);
      for (const fid of ids) {
        const entry = counts.get(fid) || { emergency: 0, urgent: 0, routine: 0 };
        entry[r.priority] += 1;
        counts.set(fid, entry);
      }
    }
    return [...counts.entries()]
      .map(([facilityId, tally]) => ({ facilityId, name: facilitiesById.get(facilityId)?.name || facilityId, ...tally }))
      .filter(f => f.emergency + f.urgent + f.routine > 0)
      .sort((a, b) => (b.emergency - a.emergency) || (b.urgent - a.urgent) || (b.routine - a.routine));
  })();

  return (
    <div className="space-y-6 h-full overflow-auto">
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
                <p className="text-[10px] font-bold text-white/50">{bed}</p>
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
                    <div className="bg-critical-700 px-3 py-1.5 text-xs font-semibold flex items-center justify-between">
                      <span>System level · {ESCALATION_LABEL[reason]}</span>
                      <span className="font-mono normal-case">{escalationAge(r)}</span>
                    </div>
                    <div className="p-3.5 space-y-3">
                      <div>
                        <p className="text-[17px] font-semibold">{r.patientData.name}, {r.patientData.age}</p>
                        <p className="text-sm text-white/60 mt-0.5">{r.requiredBedType} · {r.priority} · from {fromFacility}</p>
                      </div>
                      <p className="text-sm text-white/80 bg-white/5 rounded-lg p-2.5">{ESCALATION_DESC[reason]}</p>

                      {placingId === r.id ? (
                        <div className="space-y-2">
                          <select
                            value={placementFacilityId}
                            onChange={e => setPlacementFacilityId(e.target.value)}
                            className="w-full min-h-[48px] rounded-lg border border-white/25 bg-white/10 text-white text-sm px-3"
                          >
                            <option value="" className="text-slate-900">Select a facility…</option>
                            {facilities.filter(f => f.id !== r.referringFacilityId).map(f => (
                              <option key={f.id} value={f.id} className="text-slate-900">
                                {f.name} ({f.capacity?.[r.requiredBedType]?.occupied ?? 0}/{f.capacity?.[r.requiredBedType]?.total ?? 0} {r.requiredBedType})
                              </option>
                            ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => { setPlacingId(null); setPlacementFacilityId(''); }}
                              className="min-h-[48px] rounded-lg border border-white/30 text-white text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleConfirmPlacement(r.id)}
                              disabled={!placementFacilityId || busyId === r.id}
                              className="min-h-[48px] rounded-lg bg-white text-slate-950 text-xs font-semibold disabled:opacity-50"
                            >
                              Confirm placement
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (ESCALATION_PRIMARY[reason]) {
                              setPlacingId(r.id);
                              setPlacementFacilityId('');
                            } else {
                              navigate(`/referrals/${r.id}`);
                            }
                          }}
                          className="w-full min-h-[52px] rounded-lg bg-white text-slate-950 text-sm font-semibold"
                        >
                          {ESCALATION_PRIMARY[reason] || 'Review now'}
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePostpone(r.id)}
                          disabled={busyId === r.id}
                          className="min-h-[48px] rounded-lg border border-warning-500 text-warning-400 text-xs font-semibold disabled:opacity-50"
                        >
                          Postpone
                        </button>
                        <button
                          onClick={() => handleDeEscalate(r.id)}
                          disabled={busyId === r.id}
                          className="min-h-[48px] rounded-lg border border-white/30 text-white text-xs font-semibold disabled:opacity-50"
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

          {waitlistByFacility.length > 0 && (
            <div className="pt-2">
              <h2 className="text-xs font-semibold text-white/50 mb-2">Waitlist pressure by facility</h2>
              <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10">
                {waitlistByFacility.map(f => (
                  <div key={f.facilityId} className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-sm text-white/90 truncate">{f.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.emergency > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-critical-700 text-white text-[10px] font-bold flex items-center justify-center" title={`${f.emergency} emergency`}>
                          E {f.emergency}
                        </span>
                      )}
                      {f.urgent > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-warning-700 text-white text-[10px] font-bold flex items-center justify-center" title={`${f.urgent} urgent`}>
                          U {f.urgent}
                        </span>
                      )}
                      {f.routine > 0 && (
                        <span className="h-5 min-w-5 px-1 rounded-full bg-info-500 text-white text-[10px] font-bold flex items-center justify-center" title={`${f.routine} routine`}>
                          R {f.routine}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
