import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BedType } from '../types';
import { UserPlus, UserMinus, Clock } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const AdmitPatientPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, addDirectAdmission, directAdmissions, dischargeDirectAdmission } = useData();
  const navigate = useNavigate();

  const [patientName, setPatientName] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [department, setDepartment] = useState('');
  const [bedType, setBedType] = useState<BedType>('Ward');

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');

  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';

  if (!user || (!user.facilityId && !isAdmin)) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Facility ID not found.</div>;
  }

  const facility = facilities.find(f => f.id === selectedFacilityId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospitalId || !department || !bedType || !selectedFacilityId) return;

    addDirectAdmission({
      facilityId: selectedFacilityId,
      department,
      bedType,
      patientName,
      hospitalId,
      admittedBy: user.id
    });

    // Provide feedback and reset form
    setPatientName('');
    setHospitalId('');
    setDepartment('');
    setBedType('Ward');
  };

  const activeAdmissions = directAdmissions.filter(a => a.facilityId === selectedFacilityId && a.status !== 'discharged');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Direct Patient Admission</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Record already admitted patients (walk-ins or ER admissions) to update bed capacity tracking across the network.
        </p>
      </div>

      {isAdmin && (
        <Card className="mb-6 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex items-center gap-4">
            <label htmlFor="admitFacility" className="text-sm font-bold text-slate-700 dark:text-slate-300">Admin View:</label>
            <select
              id="admitFacility"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="flex-1 rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              <option value="">Select Facility to Manage...</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {facility ? (
        <>
          <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admission Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="admitPatientName" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Patient Name</label>
                <input
                  id="admitPatientName"
                  type="text"
                  required
                  placeholder="Full Name"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="admitHospitalId" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Hospital ID (HID)</label>
                <input
                  id="admitHospitalId"
                  type="text"
                  required
                  placeholder="e.g. H-12345"
                  className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500"
                  value={hospitalId}
                  onChange={e => setHospitalId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="admitDepartment" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Admitting Department</label>
                <select
                  id="admitDepartment"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                >
                  <option value="">Select Department...</option>
                  {facility.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="admitBedType" className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Bed Type</label>
                <select
                  id="admitBedType"
                  required
                  className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  value={bedType}
                  onChange={e => setBedType(e.target.value as BedType)}
                >
                  <option value="Ward">General Ward</option>
                  <option value="ICU">ICU (Intensive Care)</option>
                  <option value="CCU">CCU (Cardiac Care)</option>
                  <option value="PICU">PICU (Pediatric ICU)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="w-4 h-4 mr-2" />
                Admit Patient & Update Capacity
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-4">Currently Admitted (Direct)</h2>
        {activeAdmissions.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border-dashed shadow-none">
            No direct admissions currently active.
          </Card>
        ) : (
          <div className="space-y-4">
            {activeAdmissions.map(admission => (
              <Card key={admission.id} className="border border-slate-200 dark:border-slate-800">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{admission.patientName}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded whitespace-nowrap">HID: {admission.hospitalId}</span>
                      <span className="whitespace-nowrap">{admission.department}</span>
                      <span className="whitespace-nowrap">{new Date(admission.admittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <Badge variant="info">{admission.bedType}</Badge>
                    </div>
                    <Button
                      variant="outline"
                      className="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[40px]"
                      onClick={() => dischargeDirectAdmission(admission.id)}
                    >
                      <UserMinus className="w-4 h-4 mr-2" /> Discharge
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
        </>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          Please select a facility above to manage direct admissions.
        </Card>
      )}
    </div>
  );
};
