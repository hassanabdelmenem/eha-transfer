import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { BedType } from '../../types';
import { Minus, Plus, UserPlus } from 'lucide-react';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton';
import { showToast, toastError } from '../../lib/toast';
import { ReferralCockpitCard } from './ReferralCockpitCard';
import { useReportQueue } from '../layout/Workspace';
import { RoleHomeHeadline, MicroLabel, EmptyQueue } from './RoleHome';
import { capacityTone } from '../../lib/capacityTone';
import { cn } from '../../lib/utils';

const BED_TYPES: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];

// One bed type: what is free, and a stepper that writes immediately (the
// parent debounces the Firestore write). The count shown is FREE beds, so
// "−" means one more bed taken and "+" one bed released.
const BedStepperWidget: React.FC<{
  bedType: BedType;
  total: number;
  occupied: number;
  onChange: (occupied: number) => void;
}> = ({ bedType, total, occupied, onChange }) => {
  const free = Math.max(0, total - occupied);
  const tone = capacityTone(free, total);
  const stepBtn = 'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border border-slate-300 bg-white text-ink transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10';

  return (
    <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-[14px] dark:border-white/12 dark:bg-white/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold leading-tight text-ink dark:text-paper">{bedType}</p>
          <p className={cn('mt-1 text-[13px] font-semibold leading-snug', tone.text)}>
            {free} of {total} free · {occupied} occupied
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.min(total, occupied + 1))}
            disabled={occupied >= total}
            aria-label={`One more ${bedType} bed occupied`}
            className={stepBtn}
          >
            <Minus className="h-5 w-5" aria-hidden="true" />
          </button>
          <output aria-live="polite" aria-label={`${bedType} beds free`} className="w-10 text-center text-[20px] font-semibold tabular-nums text-ink dark:text-paper">
            {free}
          </output>
          <button
            type="button"
            onClick={() => onChange(Math.max(0, occupied - 1))}
            disabled={occupied <= 0}
            aria-label={`One fewer ${bedType} bed occupied`}
            className={stepBtn}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" aria-hidden="true">
        <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${total > 0 ? (free / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
};

export const NurseCockpit: React.FC = () => {
  const { user } = useAuth();
  const {
    facilitiesById,
    updateFacilityCapacity,
    referrals,
    updateReferralStatus,
    loading,
  } = useData();

  const facility = facilitiesById.get(user?.facilityId || '');
  const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>(
    {} as Record<BedType, { total: number; occupied: number }>
  );
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  const writeTimers = useRef<Partial<Record<BedType, ReturnType<typeof setTimeout>>>>({});
  useEffect(() => () => {
    Object.values(writeTimers.current).forEach(t => t && clearTimeout(t));
  }, []);

  useEffect(() => {
    if (facility) {
      setCapacities(facility.capacity as any);
    }
  }, [facility]);

  // Memoized like the equivalent derivations in ManagerCockpit/ClinicianCockpit --
  // these re-ran on every re-render regardless of whether referrals/admissions
  // actually changed.
  const arrivedReferrals = useMemo(
    () => (facility ? referrals.filter(r => r.status === 'arrived' && r.receivingFacilityId === facility.id) : []),
    [referrals, facility]
  );

  useReportQueue(arrivedReferrals.map(r => r.id));

  if (!user) return null;

  const handleStepperChange = (bedType: BedType, occupied: number) => {
    if (!facility) return;
    const total = capacities[bedType]?.total ?? 0;
    setCapacities(prev => ({ ...prev, [bedType]: { total, occupied } }));

    const facilityId = facility.id;
    const existing = writeTimers.current[bedType];
    if (existing) clearTimeout(existing);
    writeTimers.current[bedType] = setTimeout(() => {
      updateFacilityCapacity(facilityId, { [bedType]: { total, occupied } });
      delete writeTimers.current[bedType];
    }, 500);
  };

  const handleAdmit = async (referralId: string) => {
    setAdmittingId(referralId);
    try {
      await updateReferralStatus(referralId, 'admitted');
      showToast('Patient admitted.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not admit this patient.');
    } finally {
      setAdmittingId(null);
    }
  };

  const configured = BED_TYPES.filter(bt => (capacities[bt]?.total ?? 0) > 0);
  // The headline names the scarcest configured unit: that is the number that
  // decides whether the next referral can be routed here.
  const scarcest = [...configured].sort((x, y) => {
    const fx = (capacities[x].total - capacities[x].occupied) / capacities[x].total;
    const fy = (capacities[y].total - capacities[y].occupied) / capacities[y].total;
    return fx - fy;
  })[0];
  const scarcestFree = scarcest ? Math.max(0, capacities[scarcest].total - capacities[scarcest].occupied) : 0;

  return (
    <div className="flex flex-col gap-3">
      <RoleHomeHeadline
        title={scarcest ? `${scarcestFree} ${scarcest} bed${scarcestFree === 1 ? '' : 's'} free` : 'Beds'}
        rationale="Every change publishes to the network immediately — that is what stops referrals being routed to a full unit."
      />

      {configured.length > 0 ? (
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {configured.map(bt => (
            <BedStepperWidget
              key={bt}
              bedType={bt}
              total={capacities[bt]?.total ?? 0}
              occupied={capacities[bt]?.occupied ?? 0}
              onChange={occupied => handleStepperChange(bt, occupied)}
            />
          ))}
        </div>
      ) : (
        <EmptyQueue>No bed capacity configured for this facility yet.</EmptyQueue>
      )}

      <section aria-labelledby="nurse-arrived" className="mt-4 flex flex-col gap-3">
        <MicroLabel id="nurse-arrived">Arrived · waiting to be admitted</MicroLabel>
        {loading ? (
          <SkeletonGroup label="Loading arrivals…"><Skeleton className="h-32 w-full rounded-xl" /></SkeletonGroup>
        ) : arrivedReferrals.length === 0 ? (
          <p className="text-[14.5px] text-slate-700 dark:text-white/65">No transferred patients waiting for a bed.</p>
        ) : (
          arrivedReferrals.map(r => (
            <ReferralCockpitCard
              key={r.id}
              referral={r}
              variant="nurse"
              getFacilityName={id => facilitiesById.get(id)?.name || id}
              onAdmit={() => handleAdmit(r.id)}
              busy={admittingId === r.id}
            />
          ))
        )}
        <Link
          to="/admissions/new"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[15px] font-semibold text-ink transition-colors hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10"
        >
          <UserPlus className="h-5 w-5" aria-hidden="true" /> Direct admit a walk-in
        </Link>
        <Link
          to="/bed-management"
          className="self-center py-2 text-[14px] font-semibold text-slate-700 underline underline-offset-4 hover:text-ink dark:text-white/70 dark:hover:text-paper"
        >
          Inpatient census and discharges
        </Link>
      </section>
    </div>
  );
};
