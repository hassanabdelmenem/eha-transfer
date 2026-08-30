import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card } from '../components/ui/Card';
import { DirectAdmissionForm, DirectAdmissionFormData } from '../components/beds/DirectAdmissionForm';
import { ActiveInpatientCensus } from '../components/beds/ActiveInpatientCensus';
import { showToast, toastError } from '../lib/toast';
import { ArrowLeft, BedDouble } from 'lucide-react';

export const AdmitPatientPage: React.FC = () => {
  // 1. All hooks called unconditionally at top
  const { user } = useAuth();
  const {
    facilities,
    facilitiesById,
    addDirectAdmission,
    directAdmissions,
    dischargeDirectAdmission,
  } = useData();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const [dischargingId, setDischargingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';

  useEffect(() => {
    if (!selectedFacilityId && user?.facilityId) {
      setSelectedFacilityId(user.facilityId);
    }
  }, [user?.facilityId, selectedFacilityId]);

  const facility = facilitiesById.get(selectedFacilityId || '');

  const activeAdmissions = useMemo(() => {
    if (!selectedFacilityId) return [];
    return directAdmissions.filter(
      (a) => a.facilityId === selectedFacilityId && a.status !== 'discharged'
    );
  }, [directAdmissions, selectedFacilityId]);

  const handleSubmit = async (data: DirectAdmissionFormData) => {
    if (!user) return;
    try {
      addDirectAdmission({
        facilityId: data.facilityId,
        department: data.department,
        bedType: data.bedType,
        patientName: data.patientName,
        hospitalId: data.hospitalId,
        admittedBy: user.id,
      });
      showToast(`Admitted ${data.patientName} directly to ${data.department} (${data.bedType})`, 'success');
    } catch (err: any) {
      toastError(err, 'Could not record admission.');
    }
  };

  const handleDischarge = async (id: string) => {
    setDischargingId(id);
    try {
      await dischargeDirectAdmission(id);
      showToast('Patient discharged successfully.', 'success');
    } catch (err: any) {
      toastError(err, 'Could not discharge patient.');
    } finally {
      setDischargingId(null);
    }
  };

  // 2. Early return guards after all hooks
  if (!user || (!user.facilityId && !isAdmin)) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Facility ID not found.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Navigation Breadcrumb / Header */}
      <div className="flex flex-col gap-2">
        <Link
          to="/bed-management"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Bed Management & Capacity Hub
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Direct Patient Admission
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Record already admitted patients (walk-ins or ER admissions) to update bed capacity tracking across the network.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/bed-management"
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <BedDouble className="w-4 h-4" />
              View Bed Census
            </Link>
          </div>
        </div>
      </div>

      {facility ? (
        <div className="space-y-8">
          {/* Direct Admission Form */}
          <DirectAdmissionForm
            facility={facility}
            onSubmit={handleSubmit}
            isAdmin={isAdmin}
            facilities={facilities}
            selectedFacilityId={selectedFacilityId}
            onSelectFacility={setSelectedFacilityId}
          />

          {/* Active Direct Admissions Census */}
          <div className="mt-8">
            <ActiveInpatientCensus
              admissions={activeAdmissions}
              onDischarge={handleDischarge}
              dischargingId={dischargingId}
            />
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          Please select a facility above to manage direct admissions.
        </Card>
      )}
    </div>
  );
};
