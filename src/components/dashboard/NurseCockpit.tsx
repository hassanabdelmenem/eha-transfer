import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { BedType } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Bed, Minus, Plus, Settings, UserPlus, Users, Check } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { toastError } from '../../lib/toast';
import { ReferralCockpitCard } from './ReferralCockpitCard';

// Bed Stepper with instant UI update and debounced Firestore sync
const BedStepperWidget: React.FC<{
  bedType: BedType;
  total: number;
  occupied: number;
  onChange: (occupied: number) => void;
}> = ({ bedType, total, occupied, onChange }) => {
  const free = total - occupied;
  const ratio = total > 0 ? free / total : 0;
  const label = free <= 0 ? 'Full' : ratio < 0.2 ? 'Low' : 'Available';
  const labelColor =
    free <= 0
      ? 'text-critical-600 dark:text-critical-400'
      : ratio < 0.2
      ? 'text-warning-600 dark:text-warning-400'
      : 'text-success-600 dark:text-success-400';
  const barColor =
    free <= 0
      ? 'bg-critical-500'
      : ratio < 0.2
      ? 'bg-warning-500'
      : 'bg-success-500';

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bed className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{bedType}</span>
        </div>
        <span className={`text-xs font-bold ${labelColor}`}>{label}</span>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3.5">
        <button
          type="button"
          onClick={() => onChange(Math.min(total, occupied + 1))}
          disabled={occupied >= total}
          aria-label={`One more ${bedType} bed occupied`}
          className="h-[48px] w-[48px] shrink-0 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{free}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">free of {total}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.max(0, occupied - 1))}
          disabled={occupied <= 0}
          aria-label={`One fewer ${bedType} bed occupied`}
          className="h-[48px] w-[48px] shrink-0 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3.5">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${total > 0 ? (occupied / total) * 100 : 0}%` }}
        />
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
    directAdmissions,
    updateReferralStatus,
    loading,
  } = useData();
  const navigate = useNavigate();

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

  const arrivedReferrals = facility
    ? referrals.filter(r => r.status === 'arrived' && r.receivingFacilityId === facility.id)
    : [];

  const handleAdmit = async (referralId: string) => {
    setAdmittingId(referralId);
    try {
      await updateReferralStatus(referralId, 'admitted');
    } catch (e: any) {
      toastError(e, 'Could not admit this patient.');
    } finally {
      setAdmittingId(null);
    }
  };

  const activeReferralsAdmitted = referrals.filter(
    r => r.status === 'admitted' && r.receivingFacilityId === user.facilityId
  );
  const activeDirectAdmissions = directAdmissions.filter(
    a => a.facilityId === user.facilityId && a.status !== 'discharged'
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Nursing Bed Command Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bed className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Ward Capacity & Bed Management Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {facility?.name || 'Facility'} · Instant bed occupancy adjustments and arrived patient admissions.
            </p>
          </div>
          <Link
            to="/admissions/new"
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-[0.98] shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Direct Admit Walk-In
          </Link>
        </div>

        {/* Arrived Transfers Awaiting Admission */}
        {arrivedReferrals.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="px-4 py-2 rounded-xl bg-success-50 dark:bg-success-950/40 border border-success-200 dark:border-success-900/50 flex items-center justify-between">
              <span className="text-xs font-bold text-success-800 dark:text-success-300 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Arrived Transfers · Waiting for Bed Assignment
              </span>
              <Badge variant="success" className="text-[10px]">
                {arrivedReferrals.length} Arrived
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {arrivedReferrals.map(r => (
                <ReferralCockpitCard
                  key={r.id}
                  referral={r}
                  variant="nurse"
                  onAdmit={() => handleAdmit(r.id)}
                  busy={admittingId === r.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Real-time Bed Steppers */}
        <div className="mt-6">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
            Active Unit Bed Occupancy
          </h3>
          {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).some(
            bt => (capacities[bt]?.total ?? 0) > 0
          ) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[])
                .filter(bt => (capacities[bt]?.total ?? 0) > 0)
                .map(bt => (
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
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              No bed capacity configured for this facility yet.
            </div>
          )}
        </div>
      </div>

      {/* Ward Active Census Table */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Active Ward Inpatient Census
            </CardTitle>
            <Badge variant="info" className="text-[11px]">
              {activeDirectAdmissions.length + activeReferralsAdmitted.length} Admitted Patients
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[350px]">
          {activeDirectAdmissions.length === 0 && activeReferralsAdmitted.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No patients currently admitted in the ward.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeReferralsAdmitted.map(r => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/referrals/${r.id}`)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {r.patientData.name}, {r.patientData.age}y
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          MRN: {r.patientData.hospitalId}
                        </span>
                        <span>{r.requiredBedType} Bed</span>
                        {r.receivingDepartments && (
                          <span>· {r.receivingDepartments.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px] shrink-0">
                      Referral
                    </Badge>
                  </div>
                </div>
              ))}
              {activeDirectAdmissions.map(a => (
                <div
                  key={a.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {a.patientName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                          HID: {a.hospitalId}
                        </span>
                        <span>{a.bedType} Bed</span>
                        {a.department && <span>· {a.department}</span>}
                      </div>
                    </div>
                    <Badge variant="default" className="text-[10px] shrink-0">
                      Direct
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
