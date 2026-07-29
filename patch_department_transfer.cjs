const fs = require('fs');
let content = fs.readFileSync('src/pages/DepartmentPage.tsx', 'utf8');

const importTarget = "import { CheckCircle, Clock } from 'lucide-react';";
const importNew = "import { CheckCircle, Clock, ArrowRightLeft, UserCircle, X } from 'lucide-react';";
content = content.replace(importTarget, importNew);

const dataContextTarget = "const { shiftAssignments, assignShift, users } = useData();";
const dataContextNew = "const { shiftAssignments, assignShift, users, directAdmissions, referrals, facilities, quickTransfer } = useData();\n  const [transferModalOpen, setTransferModalOpen] = useState(false);\n  const [selectedPatient, setSelectedPatient] = useState<any>(null);\n  const [targetDepartment, setTargetDepartment] = useState('');\n  const [transferNotes, setTransferNotes] = useState('');";
content = content.replace(dataContextTarget, dataContextNew);

const availableDoctorsTarget = `  // Doctors in the same facility and department
  const availableDoctors = users.filter(u => `;
const availableDoctorsNew = `  const deptAdmissions = directAdmissions.filter(a => a.facilityId === facilityId && a.department === department && a.status !== 'discharged');
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
  const availableDoctors = users.filter(u => `;
content = content.replace(availableDoctorsTarget, availableDoctorsNew);

const cardTarget = `      <Card>
        <CardHeader>
          <CardTitle>Current Shift Assignment</CardTitle>`;
const cardNew = `      <Card>
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
          <CardTitle>Current Shift Assignment</CardTitle>`;
content = content.replace(cardTarget, cardNew);

const modalTarget = `    </div>
  );
};`;
const modalNew = `      {transferModalOpen && selectedPatient && (
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
    </div>
  );
};`;
content = content.replace(modalTarget, modalNew);

fs.writeFileSync('src/pages/DepartmentPage.tsx', content);
