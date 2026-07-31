import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, Clock, ArrowRightLeft, UserCircle, X } from 'lucide-react';
import { formatDateTime } from '../lib/utils';

export const DepartmentPage: React.FC = () => {
  const { user } = useAuth();
  const { shiftAssignments, assignShift, users, directAdmissions, referrals, facilities, quickTransfer } = useData();
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

  const currentAssignment = shiftAssignments?.find(s => s.facilityId === facilityId && s.department === department);

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
      admittedAt: r.statusHistory.find(h => h.status === 'admitted')?.timestamp || r.updatedAt
    }))
  ].sort((a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime());

  const myFacility = facilities.find(f => f.id === facilityId);
  const otherDepartments = myFacility?.departments.filter(d => d !== department) || [];

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
      <Card>
        <CardHeader>
          <CardTitle>Admitted Patients & Internal Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patientsInDept.length === 0 ? (
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
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">{patient.hospitalId}</span>
                        <span className="text-[10px] text-slate-500">Admitted: {formatDateTime(patient.admittedAt)}</span>
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
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
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
                className="text-red-600 border-red-200 hover:bg-red-50"
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
                <div key={doctor.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded hover:bg-slate-50 dark:bg-slate-950 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{doctor.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{doctor.email}</p>
                  </div>
                  
                  {currentAssignment?.assignedUserId === doctor.id ? (
                    <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
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
