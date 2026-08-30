import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Referral } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldAlert, ArrowRightLeft, UserCircle, X } from 'lucide-react';
import { sortByWorkflow } from '../../lib/referralPriority';
import { toastError } from '../../lib/toast';
import { ReferralSummarySheet } from '../referrals/ReferralSummarySheet';
import { EscalationAlertBanner } from './EscalationAlertBanner';
import { ReferralCockpitCard } from './ReferralCockpitCard';

interface HodCockpitProps {
  isDepartmentRoute?: boolean;
}

export const HodCockpit: React.FC<HodCockpitProps> = ({ isDepartmentRoute = false }) => {
  const { user } = useAuth();
  const {
    shiftAssignmentsByFacility,
    assignShift,
    users,
    usersById,
    directAdmissions,
    referrals,
    facilities,
    facilitiesById,
    quickTransfer,
    addDeptComment,
  } = useData();
  const navigate = useNavigate();

  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  type PatientListItem = {
    id: string;
    name: string;
    hospitalId: string;
    type: 'admission' | 'referral';
    admittedAt: string;
    bedType?: string;
  };
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(user?.department || '');

  const [assignedDoctorId, setAssignedDoctorId] = useState('');
  const [shiftSaving, setShiftSaving] = useState(false);

  if (!user || (user.role !== 'head_of_department' && !isAdmin)) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Access Denied. Head of Department privileges required.
      </div>
    );
  }

  const facilityId = selectedFacilityId;
  const department = selectedDepartment;

  const currentAssignment = (shiftAssignmentsByFacility.get(facilityId || '') || []).find(
    s => s.department === department
  );

  const onDutyDoctorName = currentAssignment?.assignedUserId
    ? usersById.get(currentAssignment.assignedUserId)?.name || 'Assigned'
    : 'None assigned (Default: HoD)';

  const deptAdmissions = directAdmissions.filter(
    a => a.facilityId === facilityId && a.department === department && a.status !== 'discharged'
  );
  const deptReferrals = referrals.filter(
    r =>
      r.receivingFacilityId === facilityId &&
      r.receivingDepartments?.includes(department) &&
      r.status === 'admitted'
  );

  const patientsInDept: PatientListItem[] = [
    ...deptAdmissions.map(a => ({
      id: a.id,
      name: a.patientName,
      hospitalId: a.hospitalId,
      type: 'admission' as const,
      admittedAt: a.admittedAt,
      bedType: a.bedType,
    })),
    ...deptReferrals.map(r => ({
      id: r.id,
      name: r.patientData.name,
      hospitalId: r.patientData.hospitalId,
      type: 'referral' as const,
      admittedAt:
        (Array.isArray(r.statusHistory) ? r.statusHistory : []).find(h => h.status === 'admitted')
          ?.timestamp || r.updatedAt,
      bedType: r.requiredBedType,
    })),
  ].sort((a, b) => (b.admittedAt || '').localeCompare(a.admittedAt || ''));

  const myFacility = facilitiesById.get(facilityId || '');
  const otherDepartments = myFacility?.departments?.filter(d => d !== department) || [];

  // Cases pending this department's review
  const pendingReview = sortByWorkflow(
    referrals.filter(
      r =>
        r.status === 'pending' &&
        r.receivingDepartments?.includes(department) &&
        (r.receivingFacilityId === facilityId ||
          (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId)))
    )
  );

  const escalatedReview = pendingReview.filter(r => r.isEscalated);

  const handleQuickApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await addDeptComment(id, 'direct_approval', '');
    } catch (e: any) {
      toastError(e, 'Could not approve this referral.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenTransfer = (patient: PatientListItem) => {
    setSelectedPatient(patient);
    setTargetDepartment(otherDepartments[0] || '');
    setTransferNotes('');
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = () => {
    if (!selectedPatient || !targetDepartment) return;
    quickTransfer(selectedPatient.type, selectedPatient.id, targetDepartment, transferNotes);
    setTransferModalOpen(false);
    setSelectedPatient(null);
  };

  // Doctors in the same facility and department
  const availableDoctors = users.filter(
    u =>
      u.facilityId === facilityId &&
      u.department === department &&
      ['consultant', 'specialist'].includes(u.role)
  );

  const handleAssignShift = async () => {
    if (!assignedDoctorId) return;
    setShiftSaving(true);
    try {
      await assignShift(facilityId, department, assignedDoctorId);
      setAssignedDoctorId('');
    } catch (e: any) {
      toastError(e, 'Could not assign shift.');
    } finally {
      setShiftSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin view facility/department selectors */}
      {isAdmin && (
        <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Admin View:
            </span>
            <select
              value={selectedFacilityId}
              onChange={e => {
                setSelectedFacilityId(e.target.value);
                setSelectedDepartment('');
              }}
              className="w-full sm:flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select Facility...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {selectedFacilityId && (
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="w-full sm:flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select Department...</option>
                {facilities
                  .find(f => f.id === selectedFacilityId)
                  ?.departments?.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
              </select>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pinned Critical Escalations */}
      {escalatedReview.length > 0 && (
        <div className="space-y-3">
          {escalatedReview.map(r => (
            <EscalationAlertBanner
              key={r.id}
              referral={r}
              actionLabel="Review now"
              onAction={() => navigate(`/referrals/${r.id}`)}
              referrerPhone={usersById.get(r.referringUserId)?.phoneNumber}
              referringFacilityName={facilitiesById.get(r.referringFacilityId)?.name}
            />
          ))}
        </div>
      )}

      {/* Unit Review Queue Card */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4 px-5 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-warning-500" />
                Department Review Queue ({department || 'All'})
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Inbound transfers requesting admission to your unit. Fast-track with direct approval.
              </p>
            </div>
            <Badge variant="warning" className="text-xs">
              {pendingReview.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {pendingReview.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
              Your department review queue is completely clear.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {pendingReview.map(r => (
                <ReferralCockpitCard
                  key={r.id}
                  referral={r}
                  variant="hod"
                  getFacilityName={id => facilitiesById.get(id)?.name || id}
                  onApprove={handleQuickApprove}
                  onSummary={() => setSummaryReferral(r)}
                  onAction={() => navigate(`/referrals/${r.id}`)}
                  busy={approvingId === r.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Section: Shift Delegation & Active Inpatient Census */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shift Delegation Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-blue-500" />
              On-Call Shift Delegation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 flex-1">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Currently On-Duty:</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {onDutyDoctorName}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="shiftDoctorSelect" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Delegate On-Call to Doctor:
              </label>
              <div className="flex gap-2">
                <select
                  id="shiftDoctorSelect"
                  value={assignedDoctorId}
                  onChange={e => setAssignedDoctorId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  <option value="">Select Department Doctor...</option>
                  {availableDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.role})
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  onClick={handleAssignShift}
                  disabled={!assignedDoctorId || shiftSaving}
                  className="rounded-xl text-xs font-bold px-4"
                >
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Department Inpatients & Internal Transfer */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3.5 px-5 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                Active Unit Inpatients ({department || 'Department'})
              </CardTitle>
              <Badge variant="info" className="text-[11px]">
                {patientsInDept.length} Inpatients
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto max-h-[320px] flex-1">
            {patientsInDept.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                No inpatients currently admitted to this department.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {patientsInDept.map(patient => (
                  <div
                    key={patient.id}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {patient.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {patient.bedType || 'General'} Bed · MRN: {patient.hospitalId}
                      </p>
                    </div>
                    {otherDepartments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenTransfer(patient)}
                        className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Transfer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Internal Transfer Modal */}
      {transferModalOpen && selectedPatient && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transferModalTitle"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 id="transferModalTitle" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Transfer Patient to Another Unit
              </h3>
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200">{selectedPatient.name}</p>
              <p className="text-slate-500 dark:text-slate-400">MRN: {selectedPatient.hospitalId}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Target Department:
                </label>
                <select
                  value={targetDepartment}
                  onChange={e => setTargetDepartment(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                >
                  {otherDepartments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Transfer Clinical Notes:
                </label>
                <textarea
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="Reason for internal departmental transfer..."
                  className="w-full h-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2.5 text-xs focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setTransferModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleTransferSubmit}
                disabled={!targetDepartment}
                className="rounded-xl text-xs font-bold"
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </div>
      )}

      {summaryReferral && (
        <ReferralSummarySheet
          referral={summaryReferral}
          onClose={() => setSummaryReferral(null)}
        />
      )}
    </div>
  );
};
