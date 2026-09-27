import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType, Referral } from '../types';
import { sortByWorkflow } from '../lib/referralPriority';
import { toastError } from '../lib/toast';
import { AlertTriangle } from 'lucide-react';
import { RoleHomeHeadline, MicroLabel, EmptyQueue } from '../components/dashboard/RoleHome';
import { BedOccupancyHeatmap } from '../components/dashboard/BedOccupancyHeatmap';
import { capacityTone } from '../lib/capacityTone';
import { cn } from '../lib/utils';

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

  const free = (bed: BedType) => Math.max(0, globalTotals[bed].available);
  const n = systemEscalations.length;

  return (
    <div className="max-w-[760px] flex flex-col gap-3">
      <RoleHomeHeadline
        title={n === 0 ? 'Nothing only you can fix' : `${n} only you can fix`}
        rationale="System-level means chasing the hospitals will not help — the capacity does not exist."
      />

      {/* Network free beds: tertiary and district hospitals, primary care excluded. */}
      <ul aria-label="Free beds across the network" className="mt-1 grid grid-cols-4 gap-2">
        {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => {
          const tone = capacityTone(free(bed), globalTotals[bed].total);
          return (
            <li key={bed} className="rounded-[10px] border border-slate-200 bg-white px-1 py-2.5 text-center dark:border-white/12 dark:bg-white/[0.05]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60">{bed}</p>
              <p className={cn('mt-0.5 font-heading text-[22px] font-semibold leading-none tabular-nums', tone.text)}>{free(bed)}</p>
              <p className="mt-1 text-[11.5px] text-slate-700 dark:text-white/60">of {globalTotals[bed].total}</p>
            </li>
          );
        })}
      </ul>

      {n === 0 ? (
        <EmptyQueue>Nothing needs administrative placement right now.</EmptyQueue>
      ) : (
        <ul className="mt-1 flex flex-col gap-3">
          {systemEscalations.map(r => {
            const reason = r.escalationReason || 'manual';
            const fromFacility = facilitiesById.get(r.referringFacilityId)?.name || 'referring facility';
            const capacityReason = reason === 'no_beds_available' || reason === 'no_matching_facility';
            const placing = placingId === r.id;
            return (
              <li key={r.id} className="overflow-hidden rounded-xl border-2 border-critical-700 bg-critical-100 dark:border-critical-400/70 dark:bg-critical-950/45">
                <p className="flex items-center justify-between gap-3 bg-critical-700 px-[14px] py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-white dark:bg-transparent dark:pb-0 dark:pt-3 dark:text-critical-300">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />System level · {ESCALATION_LABEL[reason] || reason}</span>
                  <span className="font-mono normal-case tracking-normal">{escalationAge(r)}</span>
                </p>
                <div className="px-[14px] pt-3 pb-[14px]">
                  <p className="text-[17px] font-semibold leading-[1.25] text-ink dark:text-paper">{r.patientData.name}, {r.patientData.age}</p>
                  <p className="mt-[3px] text-[13.5px] text-critical-900 dark:text-white/70">
                    {r.requiredBedType}{r.receivingDepartments?.length ? ` · ${r.receivingDepartments.join(' + ')}` : ''} · {r.priority} · from {fromFacility}
                  </p>
                  <p className="mt-2.5 rounded-[10px] bg-white/70 px-3 py-2.5 text-[14px] leading-[1.45] text-ink dark:bg-white/5 dark:text-white/85">
                    {ESCALATION_DESC[reason] || ESCALATION_DESC.manual}
                  </p>

                  {placing ? (
                    <div className="mt-3 space-y-2">
                      <label htmlFor={`place-${r.id}`} className="block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">
                        {reason === 'no_matching_facility' ? 'New destination' : 'Contracted facility'}
                      </label>
                      <select
                        id={`place-${r.id}`}
                        value={placementFacilityId}
                        onChange={e => setPlacementFacilityId(e.target.value)}
                        className="min-h-[52px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-ink dark:text-paper"
                      >
                        <option value="">Choose a facility</option>
                        {facilities
                          .filter(f => f.id !== r.referringFacilityId)
                          .map(f => ({ f, free: Math.max(0, (f.capacity?.[r.requiredBedType]?.total ?? 0) - (f.capacity?.[r.requiredBedType]?.occupied ?? 0)) }))
                          .sort((x, y) => Number(!!y.f.isExternal) - Number(!!x.f.isExternal) || y.free - x.free)
                          .map(({ f, free }) => (
                            <option key={f.id} value={f.id}>
                              {f.name}{f.isExternal ? ' · contracted' : ''} · {free} {r.requiredBedType} free
                            </option>
                          ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { setPlacingId(null); setPlacementFacilityId(''); }} className={outlineBtn}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => handleConfirmPlacement(r.id)} disabled={!placementFacilityId || busyId === r.id} className={cn(primaryBtn, 'disabled:opacity-50')}>
                          Confirm placement
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (capacityReason) { setPlacingId(r.id); setPlacementFacilityId(''); }
                        else navigate(`/referrals/${r.id}`);
                      }}
                      className={cn(primaryBtn, 'mt-3 w-full min-h-[54px] text-[16px]')}
                    >
                      {ESCALATION_PRIMARY[reason] || 'Review now'}
                    </button>
                  )}

                  <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={() => handlePostpone(r.id)} disabled={busyId === r.id} className={outlineBtn}>
                      Postpone
                    </button>
                    <button type="button" onClick={() => handleDeEscalate(r.id)} disabled={busyId === r.id} className={outlineBtn}>
                      De-escalate
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section aria-labelledby="network-grid" className="mt-5 flex flex-col gap-2.5">
        <MicroLabel id="network-grid">Live capacity by facility</MicroLabel>
        <BedOccupancyHeatmap facilities={facilities} />
      </section>

      {waitlistByFacility.length > 0 && (
        <section aria-labelledby="waitlist" className="mt-5 flex flex-col gap-2.5">
          <MicroLabel id="waitlist">Waitlist pressure by facility</MicroLabel>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.05]">
            {waitlistByFacility.map(f => (
              <li key={f.facilityId} className="flex min-h-[48px] items-center justify-between gap-3 px-[14px] py-2">
                <span className="truncate text-[15px] text-ink dark:text-paper">{f.name}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {f.emergency > 0 && <WaitDot className="bg-critical-700" letter="E" count={f.emergency} label="emergency" />}
                  {f.urgent > 0 && <WaitDot className="bg-warning-700" letter="U" count={f.urgent} label="urgent" />}
                  {f.routine > 0 && <WaitDot className="bg-info-700" letter="R" count={f.routine} label="routine" />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const primaryBtn = 'min-h-[48px] rounded-[10px] bg-ink px-3 text-[15px] font-semibold text-paper transition-colors hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200';
const outlineBtn = 'min-h-[48px] rounded-[10px] border border-critical-700/40 bg-white/60 px-3 text-[14.5px] font-semibold text-ink transition-colors hover:bg-white disabled:opacity-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';

// E/U/R: the letter is the colour-blind-safe channel; fills are the 700 steps
// so white text clears contrast (warning-500 would be 2.15:1).
const WaitDot: React.FC<{ className: string; letter: string; count: number; label: string }> = ({ className, letter, count, label }) => (
  <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums text-white', className)}>
    <span aria-hidden="true">{letter} {count}</span>
    <span className="sr-only">{count} {label}</span>
  </span>
);
