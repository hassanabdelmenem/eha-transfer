import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Bed, Minus, Plus, Settings, UserPlus } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { toastError } from '../lib/toast';
import { RoleHomeHeader } from '../components/layout/RoleHomeHeader';

// 2b bed stepper: writes immediately on every tap, no Save button.
const BedStepper: React.FC<{
  bedType: BedType;
  total: number;
  occupied: number;
  onChange: (occupied: number) => void;
}> = ({ bedType, total, occupied, onChange }) => {
  const free = total - occupied;
  const ratio = total > 0 ? free / total : 0;
  const label = free <= 0 ? 'Full' : ratio < 0.2 ? 'Low' : 'Available';
  const labelColor = free <= 0 ? 'text-critical-600 dark:text-critical-400' : ratio < 0.2 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400';
  const barColor = free <= 0 ? 'bg-critical-500' : ratio < 0.2 ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bed className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{bedType}</span>
        </div>
        <span className={`text-xs font-bold uppercase ${labelColor}`}>{label}</span>
      </div>

      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          onClick={() => onChange(Math.min(total, occupied + 1))}
          disabled={occupied >= total}
          aria-label={`One more ${bedType} bed occupied`}
          className="h-[52px] w-[52px] shrink-0 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40"
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{free}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">free of {total}</p>
        </div>
        <button
          onClick={() => onChange(Math.max(0, occupied - 1))}
          disabled={occupied <= 0}
          aria-label={`One fewer ${bedType} bed occupied`}
          className="h-[52px] w-[52px] shrink-0 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center disabled:opacity-40"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${total > 0 ? (occupied / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
};

// 2b: "Arrived · waiting to be admitted" -- referrals that have physically
// reached this facility but haven't been admitted to a bed yet. One tap
// admits and frees up the bed count via the same updateReferralStatus path
// ReferralDetailPage's "Admit Patient" action uses.
const ArrivedReferralRow: React.FC<{ patientName: string; age: number; bedType: BedType; onAdmit: () => void; busy: boolean }> = ({ patientName, age, bedType, onAdmit, busy }) => (
  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{patientName}, {age}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Arrived · waiting to be admitted</p>
    </div>
    <button
      onClick={onAdmit}
      disabled={busy}
      className="shrink-0 min-h-[48px] px-4 rounded-lg bg-success-700 hover:bg-success-800 text-white text-xs font-bold uppercase tracking-wide disabled:opacity-50"
    >
      Admit to {bedType} bed
    </button>
  </div>
);

export const BedManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, facilitiesById, updateFacilityCapacity, referrals, updateReferralStatus, loading } = useData();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';

  const facility = facilitiesById.get(selectedFacilityId || '');
  const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>({} as Record<BedType, { total: number; occupied: number }>);
  const [admittingId, setAdmittingId] = useState<string | null>(null);

  // Debounce the Firestore write, not the local UI: the stepper still updates
  // `capacities` (and therefore the free count/bar) on every tap, but rapid
  // taps collapse into a single updateFacilityCapacity call 500ms after the
  // last one, per the design spec's "debounced" requirement.
  const writeTimers = useRef<Partial<Record<BedType, ReturnType<typeof setTimeout>>>>({});
  useEffect(() => () => {
    Object.values(writeTimers.current).forEach(t => t && clearTimeout(t));
  }, []);

  // Seed the editor only when the selected facility actually changes. Use facilitiesById
  // lookup (O(1)) instead of scanning the array.
  useEffect(() => {
    const selected = facilitiesById.get(selectedFacilityId || '');
    if (selected) {
      setCapacities(selected.capacity as any);
    }
  }, [selectedFacilityId, facilitiesById]);

  if (!user || (!['nurse', 'nursing_supervisor', 'head_of_department', 'er_room'].includes(user.role) && !isAdmin)) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Nursing staff privileges required.</div>;
  }

  if (!user.facilityId && !isAdmin) {
    return <div className="p-8 text-center text-slate-500">Facility configuration missing.</div>;
  }

  // 2b stepper: the free count updates instantly (no Save button), but the
  // write itself is debounced -- see writeTimers above.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 h-full overflow-auto">
      <RoleHomeHeader identity={`${user.name} · ${facility?.name || 'Facility'}`} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bulk Bed Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quickly update bed occupancy across {facility?.name || 'the facility'}. Total bed counts are configured under Facility Settings.</p>
        </div>
        {facility && (isAdmin || user.role === 'hospital_manager' || user.role === 'medical_director') && (
          <Link
            to="/facility-settings"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
          >
            <Settings className="w-4 h-4" />
            Edit total capacity
          </Link>
        )}
      </div>

      {isAdmin && (
        <Card className="mb-6 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label htmlFor="bedMgmtFacility" className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">Admin View:</label>
            <select
              id="bedMgmtFacility"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="flex-1 rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-[40px]"
            >
              <option value="">Select Facility to Manage...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading facility data…</span>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      ) : facility ? (
        <>
          {arrivedReferrals.length > 0 && (
            <div className="space-y-2 mb-4">
              <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Arrived · waiting to be admitted ({arrivedReferrals.length})
              </h2>
              {arrivedReferrals.map(r => (
                <ArrivedReferralRow
                  key={r.id}
                  patientName={r.patientData.name || 'Unknown patient'}
                  age={r.patientData.age}
                  bedType={r.requiredBedType}
                  busy={admittingId === r.id}
                  onAdmit={() => handleAdmit(r.id)}
                />
              ))}
            </div>
          )}

          <Link
            to="/admissions/new"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 mb-4 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <UserPlus className="w-4 h-4" />
            Direct admit a walk-in
          </Link>

          {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).some(bt => (capacities[bt]?.total ?? 0) > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[])
              .filter(bt => (capacities[bt]?.total ?? 0) > 0)
              .map(bt => (
                <BedStepper
                  key={bt}
                  bedType={bt}
                  total={capacities[bt]?.total ?? 0}
                  occupied={capacities[bt]?.occupied ?? 0}
                  onChange={(occupied) => handleStepperChange(bt, occupied)}
                />
              ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
            <Bed className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p>No bed capacity configured for {facility.name} yet.</p>
            {(isAdmin || user.role === 'hospital_manager' || user.role === 'medical_director') && (
              <Link to="/facility-settings" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Set up bed capacity in Facility Settings &rarr;
              </Link>
            )}
          </Card>
        )}
        </>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          Please select a facility above to manage beds.
        </Card>
      )}
    </div>
  );
};
