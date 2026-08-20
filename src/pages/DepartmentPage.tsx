import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, Clock, ArrowRightLeft, UserCircle, X, ShieldAlert, Phone } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { sortByWorkflow, priorityRailClass, priorityChipClasses } from '../lib/referralPriority';
import { ReferralSummarySheet } from '../components/referrals/ReferralSummarySheet';
import { Referral } from '../types';
import { toastError } from '../lib/toast';

export const DepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const { shiftAssignments, shiftAssignmentsByFacility, assignShift, users, usersById, directAdmissions, referrals, facilities, facilitiesById, quickTransfer, addDeptComment, loading } = useData();
  const navigate = useNavigate();
  const [summaryReferral, setSummaryReferral] = useState<Referral | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  type PatientListItem = { id: string; name: string; hospitalId: string; type: 'admission' | 'referral'; admittedAt: string };
  const [selectedPatient, setSelectedPatient] = useState<PatientListItem | null>(null);
  const [targetDepartment, setTargetDepartment] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(user?.department || '');

  if (!user || (user.role !== 'head_of_department' && !isAdmin)) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Access Denied. Head of Department privileges required.</div>;
  }

  if ((!user.facilityId || !user.department) && !isAdmin) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Facility or Department configuration missing.</div>;
  }

  const facilityId = selectedFacilityId;
  const department = selectedDepartment;

  const currentAssignment = (shiftAssignmentsByFacility.get(facilityId || '') || []).find(s => s.department === department);

  const deptAdmissions = directAdmissions.filter(a => a.facilityId === facilityId && a.department === department && a.status !== 'discharged');
  const deptReferrals = referrals.filter(r => 
    r.receivingFacilityId === facilityId && 
    r.receivingDepartments.includes(department) && 
    r.status === 'admitted'
  );

  const patientsInDept = [
    ...deptAdmissions.map(a => ({
      id: a.id,
      name: a.patientName,
      hospitalId: a.hospitalId,
      type: 'admission',
      admittedAt: a.admittedAt
    })),
    ...deptReferrals.map(r => ({
      id: r.id,
      name: r.patientData.name,
      hospitalId: r.patientData.hospitalId,
      type: 'referral',
      admittedAt: (Array.isArray(r.statusHistory) ? r.statusHistory : []).find(h => h.status === 'admitted')?.timestamp || r.updatedAt
    }))
  ].sort((a, b) => (b.admittedAt || '').localeCompare(a.admittedAt || ''));

  const myFacility = facilitiesById.get(facilityId || '');
  const otherDepartments = myFacility?.departments.filter(d => d !== department) || [];

  // 1b: cases pending this department's review, matching the same gate
  // ReferralDetailPage uses for isTargetDeptHead && status === 'pending'.
  const pendingReview = sortByWorkflow(referrals.filter(r =>
    r.status === 'pending' &&
    r.receivingDepartments?.includes(department) &&
    (r.receivingFacilityId === facilityId || (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId)))
  ));
  const escalatedReview = pendingReview.filter(r => r.isEscalated);
  const queueReview = pendingReview.filter(r => !r.isEscalated);

  const escalatedAgeLabel = (r: Referral) => {
    const since = r.escalatedAt || r.createdAt;
    const mins = Math.max(0, Math.round((Date.now() - Date.parse(since)) / 60000));
    return `Escalated · no response ${mins} min`;
  };

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

  const handleOpenTransfer = (patient: any) => {
    setSelectedPatient(patient);
    setTargetDepartment(otherDepartments[0] || '');
    setTransferNotes('');
    setTransferModalOpen(true);
  };

  const handleTransferSubmit = () => {
    if (!selectedPatient || !targetDepartment) return;
    quickTransfer(selectedPatient.type as any, selectedPatient.id, targetDepartment, transferNotes);
    setTransferModalOpen(false);
    setSelectedPatient(null);
  };

  // Doctors in the same facility and department
  const availableDoctors = users.filter(u => 
    u.facilityId === facilityId && 
    u.department === department && 
    ['consultant', 'specialist'].includes(u.role)
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">{department || 'Department'} </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage shift assignments and delegation.</p>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Admin View:</span>
            <select
              value={selectedFacilityId}
              onChange={(e) => { setSelectedFacilityId(e.target.value); setSelectedDepartment(''); }}
              className="w-full sm:flex-1 rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900"
            >
              <option value="">Select Facility...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {selectedFacilityId && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full sm:flex-1 rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900"
              >
                <option value="">Select Department...</option>
                {facilities.find(f => f.id === selectedFacilityId)?.departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>
      )}

      {(!facilityId || !department) ? (
         <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
           Please select a facility and department above to view.
         </Card>
      ) : (
        <>
      {/* 1b/3d: approval queue -- escalated case pinned on top, then the
          rest of what's waiting on this department. Reflows into a wider
          grid on tablet/desktop instead of being mobile-only. */}
      <div className="space-y-3">
        <div>
          <h2 className="text-[26px] font-heading font-semibold text-slate-900 dark:text-slate-100">
            {pendingReview.length} waiting on you
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Escalated cases stay pinned on top. Everything else ordered emergency → urgent → routine.</p>
        </div>

        {escalatedReview.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {escalatedReview.map(r => (
              <div key={r.id} className="rounded-xl border-2 border-critical-700 bg-critical-50 dark:bg-critical-950/30 overflow-hidden">
                <div className="bg-critical-700 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> {escalatedAgeLabel(r)}
                </div>
                <div className="p-3.5">
                  <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100">{r.patientData.name}, {r.patientData.age}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{r.requiredBedType} bed · from {facilitiesById.get(r.referringFacilityId)?.name || 'referring facility'}</p>
                  <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/referrals/${r.id}`)}
                      className="min-h-[48px] rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-900 text-sm font-bold uppercase tracking-wide"
                    >
                      Review now
                    </button>
                    <a
                      href={`tel:${usersById.get(r.referringUserId)?.phoneNumber || ''}`}
                      aria-label="Call referring clinician"
                      className="h-[48px] w-[48px] flex items-center justify-center rounded-lg border-2 border-critical-700 text-critical-700 dark:text-critical-400"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {queueReview.length === 0 && escalatedReview.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Nothing waiting on your department right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {queueReview.map(r => (
              <div key={r.id} className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 ${priorityRailClass(r.priority)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[17px] font-bold text-slate-900 dark:text-slate-100 truncate">{r.patientData.name}, {r.patientData.age}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.requiredBedType} · from {facilitiesById.get(r.referringFacilityId)?.name || 'referring facility'}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${priorityChipClasses(r.priority)}`}>{r.priority}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    onClick={() => setSummaryReferral(r)}
                    className="min-h-[48px] rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold uppercase tracking-wide"
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => handleQuickApprove(r.id)}
                    disabled={approvingId === r.id}
                    className="min-h-[48px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide disabled:opacity-60"
                  >
                    {approvingId === r.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {summaryReferral && <ReferralSummarySheet referral={summaryReferral} onClose={() => setSummaryReferral(null)} />}

      <Card>
        <CardHeader>
          <CardTitle>Admitted Patients & Internal Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3" role="status" aria-busy={loading} aria-live="polite">
            {loading ? (
              <>
                <span className="sr-only">Loading department patients…</span>
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
              </>
            ) : patientsInDept.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No patients currently admitted in this department.</p>
            ) : (
              patientsInDept.map(patient => (
                <div key={patient.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded bg-white dark:bg-slate-900 shadow-sm gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                      <UserCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{patient.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">{patient.hospitalId}</span>
                        <span className="text-xs text-slate-500">Admitted: {formatDateTime(patient.admittedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleOpenTransfer(patient)}>
                    <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                    Quick Transfer
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Shift Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Delegated Doctor</p>
              {currentAssignment?.assignedUserId ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {users.find(u => u.id === currentAssignment.assignedUserId)?.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Assigned at {formatDateTime(currentAssignment.updatedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">None assigned. You are currently receiving all department requests.</p>
              )}
            </div>
            
            {currentAssignment?.assignedUserId && (
              <Button 
                variant="outline" 
                className="text-critical-600 border-critical-200 hover:bg-critical-50"
                onClick={() => assignShift(facilityId, department, null)}
              >
                Revoke Assignment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Doctors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableDoctors.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No available doctors found in this department.</p>
            ) : (
              availableDoctors.map(doctor => (
                <div key={doctor.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{doctor.email}</p>
                  </div>
                  
                  {currentAssignment?.assignedUserId === doctor.id ? (
                    /* variant="success" already supplies the color — the old
                       explicit emerald-* classes were a redundant override
                       of the exact styling the variant already provides. */
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Assigned
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => assignShift(facilityId, department, doctor.id)}
                    >
                      Assign Shift
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {transferModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950 shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                Quick Internal Transfer
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded">
                <p className="text-xs text-blue-800 dark:text-blue-300 font-semibold uppercase mb-1">Patient Info</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedPatient.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-0.5">{selectedPatient.hospitalId}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Target Department</label>
                  <select 
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={targetDepartment}
                    onChange={e => setTargetDepartment(e.target.value)}
                  >
                    {otherDepartments.length === 0 ? (
                      <option value="" disabled>No other departments available</option>
                    ) : (
                      otherDepartments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Transfer Notes / Reason (Optional)</label>
                  <textarea 
                    className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                    placeholder="Clinical reason for transfer..."
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-2 shrink-0">
              <Button variant="outline" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
              <Button onClick={handleTransferSubmit} disabled={!targetDepartment} className="bg-blue-600 hover:bg-blue-700">
                Confirm Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
