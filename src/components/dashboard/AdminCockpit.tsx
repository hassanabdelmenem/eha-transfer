import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { BedType, Referral } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldAlert, Globe, Server, Check, ArrowRight } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { toastError } from '../../lib/toast';
import { BedOccupancyHeatmap } from './BedOccupancyHeatmap';

const ESCALATION_LABEL: Record<string, string> = {
  no_beds_available: 'No beds available',
  no_matching_facility: 'No matching facility',
  sla_breach: 'No response (SLA breach)',
  requirements_needed: 'Requirements needed',
  manual: 'Manual escalation',
};

const ESCALATION_DESC: Record<string, string> = {
  no_beds_available:
    'Every matching facility is at full capacity for the required bed type. Chasing the receiving facilities will not help.',
  no_matching_facility:
    'No facility in the network provides the required departments and bed type. This referral cannot route itself.',
  sla_breach: 'No facility responded within 30 minutes of this referral being raised.',
  requirements_needed: 'Sent back to the referring facility with requirements before it can proceed.',
  manual: 'A human judged this referral needs administrative attention.',
};

const ESCALATION_PRIMARY: Record<string, string> = {
  no_beds_available: 'Place at a contracted facility',
  no_matching_facility: 'Override the destination',
};

export const AdminCockpit: React.FC = () => {
  const { user } = useAuth();
  const {
    referrals,
    facilities,
    updateReferralStatus,
    toggleReferralEscalation,
    overrideReferralDestination,
    facilitiesById,
  } = useData();
  const navigate = useNavigate();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [placementFacilityId, setPlacementFacilityId] = useState('');

  if (!user || (user.role !== 'system_admin' && user.role !== 'owner')) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admin privileges required.</div>;
  }

  const calculateTotalCapacity = () => {
    const totals: Record<BedType, { total: number; occupied: number; available: number }> = {
      ICU: { total: 0, occupied: 0, available: 0 },
      CCU: { total: 0, occupied: 0, available: 0 },
      PICU: { total: 0, occupied: 0, available: 0 },
      Ward: { total: 0, occupied: 0, available: 0 },
    };

    facilities
      .filter(f => f.type !== 'primary_care')
      .forEach(facility => {
        (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).forEach(bed => {
          const cap = facility.capacity[bed];
          if (cap) {
            totals[bed].total += cap.total;
            totals[bed].occupied += cap.occupied;
            totals[bed].available += cap.total - cap.occupied;
          }
        });
      });

    return totals;
  };

  const globalTotals = calculateTotalCapacity();

  const systemEscalations = sortByWorkflow(
    referrals.filter(
      r =>
        r.isEscalated &&
        r.escalationLevel === 'system' &&
        !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status)
    )
  );

  const escalationAge = (r: Referral) => {
    const mins = Math.max(
      0,
      Math.round((Date.now() - Date.parse(r.escalatedAt || r.createdAt)) / 60000)
    );
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

  const waitlistByFacility = (() => {
    const active = referrals.filter(
      r => !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status)
    );
    const counts = new Map<string, { emergency: number; urgent: number; routine: number }>();
    for (const r of active) {
      const facilityId = r.receivingFacilityId === 'auto' ? null : r.receivingFacilityId;
      const ids = facilityId ? [facilityId] : r.candidateFacilityIds || [];
      for (const fid of ids) {
        const entry = counts.get(fid) || { emergency: 0, urgent: 0, routine: 0 };
        entry[r.priority] += 1;
        counts.set(fid, entry);
      }
    }
    return [...counts.entries()]
      .map(([facilityId, tally]) => ({
        facilityId,
        name: facilitiesById.get(facilityId)?.name || facilityId,
        ...tally,
      }))
      .filter(f => f.emergency + f.urgent + f.routine > 0)
      .sort(
        (a, b) =>
          b.emergency - a.emergency || b.urgent - a.urgent || b.routine - a.routine
      );
  })();

  return (
    <div className="space-y-6">
      {/* Admin Escalation Console Header Card */}
      <div className="rounded-2xl bg-slate-950 text-white p-5 sm:p-6 shadow-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading">
              System Escalation Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              System Administrator · Network-wide unplaced referrals and contracted hospital allocations.
            </p>
          </div>
          <Badge variant="default" className="bg-white/10 text-white border-white/20 self-start sm:self-center">
            {systemEscalations.length} Unplaced Transfers
          </Badge>
        </div>

        {/* Global Bed Capacity Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => (
            <div
              key={bed}
              className="rounded-xl bg-white/5 border border-white/10 p-3 text-center space-y-1"
            >
              <p className="text-[11px] font-bold text-white/60">{bed}</p>
              <p className="text-2xl font-bold tabular-nums text-white">
                {globalTotals[bed].available}
              </p>
              <p className="text-[10px] text-white/50">of {globalTotals[bed].total} network total</p>
            </div>
          ))}
        </div>

        {/* System Escalations Grid */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-white/90">
            Active System-Level Escalations ({systemEscalations.length})
          </h3>

          {systemEscalations.length === 0 ? (
            <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
              Nothing needs administrative placement right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {systemEscalations.map(r => {
                const reason = r.escalationReason || 'manual';
                const fromFacility =
                  facilitiesById.get(r.referringFacilityId)?.name || 'referring facility';

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border-2 border-critical-700 bg-critical-950/40 overflow-hidden shadow-xs"
                  >
                    <div className="bg-critical-700 px-3.5 py-1.5 text-xs font-bold flex items-center justify-between text-white">
                      <span>System · {ESCALATION_LABEL[reason] || reason}</span>
                      <span className="font-mono text-[11px] opacity-90">{escalationAge(r)}</span>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-base font-bold text-white truncate">
                          {r.patientData.name}, {r.patientData.age}y
                        </p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {r.requiredBedType} Bed · {r.priority} · From {fromFacility}
                        </p>
                      </div>
                      <p className="text-xs text-white/80 bg-white/5 rounded-xl p-3 leading-relaxed">
                        {ESCALATION_DESC[reason] || 'Requires administrative override or de-escalation.'}
                      </p>

                      {placingId === r.id ? (
                        <div className="space-y-2 pt-1">
                          <select
                            value={placementFacilityId}
                            onChange={e => setPlacementFacilityId(e.target.value)}
                            className="w-full min-h-[48px] rounded-xl border border-white/25 bg-white/10 text-white text-xs px-3 focus:outline-none"
                          >
                            <option value="" className="text-slate-900">
                              Select target facility…
                            </option>
                            {facilities
                              .filter(f => f.id !== r.referringFacilityId)
                              .map(f => (
                                <option key={f.id} value={f.id} className="text-slate-900">
                                  {f.name} ({f.capacity?.[r.requiredBedType]?.occupied ?? 0}/
                                  {f.capacity?.[r.requiredBedType]?.total ?? 0} {r.requiredBedType})
                                </option>
                              ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPlacingId(null);
                                setPlacementFacilityId('');
                              }}
                              className="min-h-[44px] rounded-xl border border-white/30 text-white text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmPlacement(r.id)}
                              disabled={!placementFacilityId || busyId === r.id}
                              className="min-h-[44px] rounded-xl bg-white text-slate-950 text-xs font-bold disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (ESCALATION_PRIMARY[reason]) {
                              setPlacingId(r.id);
                              setPlacementFacilityId('');
                            } else {
                              navigate(`/referrals/${r.id}`);
                            }
                          }}
                          className="w-full min-h-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold transition-colors"
                        >
                          {ESCALATION_PRIMARY[reason] || 'Review now'}
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePostpone(r.id)}
                          disabled={busyId === r.id}
                          className="min-h-[44px] rounded-xl border border-warning-500 text-warning-400 hover:bg-warning-500/10 text-xs font-bold disabled:opacity-50"
                        >
                          Postpone
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeEscalate(r.id)}
                          disabled={busyId === r.id}
                          className="min-h-[44px] rounded-xl border border-white/30 text-white hover:bg-white/10 text-xs font-bold disabled:opacity-50"
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

        {/* Waitlist Pressure Table */}
        {waitlistByFacility.length > 0 && (
          <div className="pt-3">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wider mb-2.5">
              Network Waitlist Pressure by Facility
            </h3>
            <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10 overflow-hidden">
              {waitlistByFacility.map(f => (
                <div
                  key={f.facilityId}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-semibold text-white/90 truncate">
                    {f.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.emergency > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-critical-700 text-white text-[10px] font-bold"
                        title={`${f.emergency} emergency`}
                      >
                        E {f.emergency}
                      </span>
                    )}
                    {f.urgent > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-warning-700 text-white text-[10px] font-bold"
                        title={`${f.urgent} urgent`}
                      >
                        U {f.urgent}
                      </span>
                    )}
                    {f.routine > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full bg-info-600 text-white text-[10px] font-bold"
                        title={`${f.routine} routine`}
                      >
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

      {/* Network Bed Heatmap */}
      <BedOccupancyHeatmap facilities={facilities} />
    </div>
  );
};
