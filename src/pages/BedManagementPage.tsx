import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { toastError, showToast } from '../lib/toast';
import { BedCapacityGrid } from '../components/beds/BedCapacityGrid';
import { ArrivedTransfersQueue } from '../components/beds/ArrivedTransfersQueue';
import { ActiveInpatientCensus } from '../components/beds/ActiveInpatientCensus';
import { DirectAdmissionModal } from '../components/beds/DirectAdmissionModal';
import { UserPlus, Settings } from 'lucide-react';

export const BedManagementPage: React.FC = () => {
  // 1. All hooks called unconditionally at the top
  const { user } = useAuth();
  const {
    facilities,
    facilitiesById,
    updateFacilityCapacity,
    referrals,
    updateReferralStatus,
    directAdmissions,
    dischargeDirectAdmission,
    loading,
  } = useData();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>(
    {} as Record<BedType, { total: number; occupied: number }>
  );
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [dischargingId, setDischargingId] = useState<string | null>(null);
  const [isDirectAdmitOpen, setIsDirectAdmitOpen] = useState<boolean>(false);

  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';
  const isLeadership =
    isAdmin ||
    user?.role === 'hospital_manager' ||
    user?.role === 'medical_director' ||
    user?.role === 'deputy_manager';

  const facility = facilitiesById.get(selectedFacilityId || '');

  // Facility name mapping for arrived referrals display
  const facilityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    facilities.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [facilities]);

  // Timers and pending writes refs to prevent race conditions and clobbering
  const writeTimersRef = useRef<Partial<Record<BedType, ReturnType<typeof setTimeout>>>>({});
  const pendingUpdatesRef = useRef<Partial<Record<BedType, { total: number; occupied: number }>>>({});
  const currentFacilityIdRef = useRef<string>(selectedFacilityId);
  currentFacilityIdRef.current = selectedFacilityId;

  // Flush any pending debounced writes immediately on unmount or before facility switch
  const flushPendingWrites = useCallback(() => {
    const facilityId = currentFacilityIdRef.current;
    if (!facilityId) return;

    const pendingKeys = Object.keys(pendingUpdatesRef.current) as BedType[];
    if (pendingKeys.length > 0) {
      const payload: Record<string, { total: number; occupied: number }> = {};
      pendingKeys.forEach((bt) => {
        const item = pendingUpdatesRef.current[bt];
        if (item) {
          payload[bt] = item;
        }
        if (writeTimersRef.current[bt]) {
          clearTimeout(writeTimersRef.current[bt]);
          delete writeTimersRef.current[bt];
        }
      });
      pendingUpdatesRef.current = {};
      updateFacilityCapacity(facilityId, payload);
    }
  }, [updateFacilityCapacity]);

  // Unmount flush effect
  useEffect(() => {
    return () => {
      flushPendingWrites();
    };
  }, [flushPendingWrites]);

  // Sync state when selected facility changes
  useEffect(() => {
    if (!selectedFacilityId && user?.facilityId) {
      setSelectedFacilityId(user.facilityId);
    }
  }, [user?.facilityId, selectedFacilityId]);

  useEffect(() => {
    const selected = facilitiesById.get(selectedFacilityId || '');
    if (selected && selected.capacity) {
      setCapacities((prev) => {
        const serverCapacities = (selected.capacity as Record<BedType, { total: number; occupied: number }>) || {};
        const next: Record<BedType, { total: number; occupied: number }> = {
          ...serverCapacities,
          ...pendingUpdatesRef.current,
        };
        // Check if values actually changed to avoid re-rendering loops
        const hasChanged = (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).some(
          (bt) =>
            prev[bt]?.total !== next[bt]?.total ||
            prev[bt]?.occupied !== next[bt]?.occupied
        );
        return hasChanged ? next : prev;
      });
    }
  }, [selectedFacilityId, facilitiesById]);

  // Stepper change handler with debounce and atomic unit write
  const handleStepperChange = (bedType: BedType, occupied: number) => {
    if (!facility) return;
    const total = capacities[bedType]?.total ?? 0;
    const updateItem = { total, occupied };

    // Update local UI immediately (0ms feedback)
    setCapacities((prev) => ({ ...prev, [bedType]: updateItem }));

    // Record pending update
    pendingUpdatesRef.current[bedType] = updateItem;
    const facilityId = facility.id;

    // Clear existing debounce timer for this bed type
    if (writeTimersRef.current[bedType]) {
      clearTimeout(writeTimersRef.current[bedType]);
    }

    // Set 500ms debounce timer
    writeTimersRef.current[bedType] = setTimeout(() => {
      updateFacilityCapacity(facilityId, { [bedType]: updateItem });
      delete writeTimersRef.current[bedType];
      delete pendingUpdatesRef.current[bedType];
    }, 500);
  };

  // Filter arrived referrals destined for this facility
  const arrivedReferrals = useMemo(() => {
    if (!facility) return [];
    return referrals.filter(
      (r) => r.status === 'arrived' && r.receivingFacilityId === facility.id
    );
  }, [referrals, facility]);

  // Filter active direct admissions for this facility
  const activeDirectAdmissions = useMemo(() => {
    if (!facility) return [];
    return directAdmissions.filter(
      (a) => a.facilityId === facility.id && a.status !== 'discharged'
    );
  }, [directAdmissions, facility]);

  // Handle admit arrived referral
  const handleAdmitReferral = async (referralId: string) => {
    setAdmittingId(referralId);
    try {
      await updateReferralStatus(referralId, 'admitted');
      showToast('Patient admitted successfully to bed.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not admit this patient.');
    } finally {
      setAdmittingId(null);
    }
  };

  // Handle discharge direct admission
  const handleDischargeAdmission = async (admissionId: string) => {
    setDischargingId(admissionId);
    try {
      await dischargeDirectAdmission(admissionId);
      showToast('Patient discharged successfully.', 'success');
    } catch (e: any) {
      toastError(e, 'Could not discharge this patient.');
    } finally {
      setDischargingId(null);
    }
  };

  // 2. Early return guards after all hooks
  if (!user || (!['nurse', 'nursing_supervisor', 'head_of_department', 'er_room', 'hospital_manager', 'medical_director', 'deputy_manager'].includes(user.role) && !isAdmin)) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Nursing staff privileges required.</div>;
  }

  if (!user.facilityId && !isAdmin) {
    return <div className="p-8 text-center text-slate-500">Facility configuration missing.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-full overflow-auto pb-12">
      {/* Page Header (No duplicate RoleHomeHeader) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Bulk Bed Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1 mb-3">
            Quickly update bed occupancy across {facility?.name || 'the facility'}. Total bed counts are configured under Facility Settings.
          </p>
          {isAdmin && (
            <select
              value={selectedFacilityId || ''}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full sm:w-72 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Facility --</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {facility && isLeadership && (
            <Link
              to="/facility-settings"
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Edit total capacity
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsDirectAdmitOpen(true)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Direct admit a walk-in
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading facility data…</span>
          <Skeleton className="h-10 w-64 rounded-xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      ) : facility ? (
        <div className="space-y-8">
          {/* Real-time Bed Capacity Steppers & Aggregate Summary Grid */}
          <BedCapacityGrid
            facility={facility}
            capacities={capacities}
            onCapacityChange={handleStepperChange}
            isAdmin={isAdmin}
            selectedFacilityId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
            facilities={facilities}
            canEditTotal={isLeadership}
          />

          {/* Arrived Transfers Waiting Queue (if any) */}
          {arrivedReferrals.length > 0 && (
            <div className="pt-2">
              <ArrivedTransfersQueue
                referrals={arrivedReferrals}
                onAdmit={handleAdmitReferral}
                admittingId={admittingId}
                facilityNameMap={facilityNameMap}
              />
            </div>
          )}

          {/* Active Direct Inpatient Census */}
          <div className="pt-2">
            <ActiveInpatientCensus
              admissions={activeDirectAdmissions}
              onDischarge={handleDischargeAdmission}
              dischargingId={dischargingId}
            />
          </div>

          {/* Embedded Direct Admission Modal */}
          <DirectAdmissionModal
            isOpen={isDirectAdmitOpen}
            onClose={() => setIsDirectAdmitOpen(false)}
            facility={facility}
            isAdmin={isAdmin}
            facilities={facilities}
            selectedFacilityId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
          />
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          Please select a facility above to manage beds.
        </Card>
      )}
    </div>
  );
};
