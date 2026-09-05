import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Role } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Phone, Building2 } from 'lucide-react';
import { toastError } from '../lib/toast';

export const Onboarding: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const { facilities, facilitiesById } = useData();
  
  const [name, setName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [role, setRole] = useState<Role>(user?.role === 'owner' ? 'owner' : 'resident');
  const [facilityId, setFacilityId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Full Name is required.';
    if (!phoneNumber.trim()) errors.phoneNumber = 'Phone Number is required.';
    if (role !== 'system_admin' && role !== 'owner' && !facilityId) {
      errors.facilityId = 'Please select a hospital.';
    }
    if ((role === 'consultant' || role === 'specialist' || role === 'resident' || role === 'head_of_department' || role === 'nurse' || role === 'nursing_supervisor') && selectedFacility && !department) {
      errors.department = 'Please select a department.';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      // Submit the role as a *request* only. Writing `role` directly used to let
      // anyone hand themselves owner/system_admin straight from this dropdown; the
      // security rules now reject any self-write that changes it.
      const profile: { name: string; phoneNumber: string; requestedRole: Role; facilityId?: string; department?: string } =
        { name, phoneNumber, requestedRole: role };
      if (facilityId) profile.facilityId = facilityId;
      if (department) profile.department = department;
      await updateUserProfile(profile);
    } catch (err: any) {
      toastError(err, "Could not save your profile.");
      setSubmitting(false);
    }
  };

  const selectedFacility = facilitiesById.get(facilityId || '');

  // Owners don't need onboarding if their profile is already complete, but if they land here they can just save.
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-light text-slate-900 dark:text-slate-100 tracking-tight">
          Complete Your Profile
        </h2>
        <p className="mt-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          Required for Verification
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-t-4 border-t-blue-900 shadow-xl">
          <CardHeader className="bg-white dark:bg-slate-900">
            <CardTitle>Welcome! Please provide your details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="onboardName" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="onboardName"
                    type="text"
                    required
                    className="pl-10"
                    placeholder="Dr. Ahmed Ali"
                    value={name}
                    error={!!formErrors.name}
                    onChange={e => {
                      setName(e.target.value);
                      if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                    }}
                  />
                </div>
                {formErrors.name && <p className="mt-1 text-xs text-critical-500 font-medium">{formErrors.name}</p>}
              </div>

              <div>
                <label htmlFor="onboardPhone" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="onboardPhone"
                    type="tel"
                    required
                    className="pl-10"
                    placeholder="+20 100 000 0000"
                    value={phoneNumber}
                    error={!!formErrors.phoneNumber}
                    onChange={e => {
                      setPhoneNumber(e.target.value);
                      if (formErrors.phoneNumber) setFormErrors(prev => ({ ...prev, phoneNumber: '' }));
                    }}
                  />
                </div>
                {formErrors.phoneNumber && <p className="mt-1 text-xs text-critical-500 font-medium">{formErrors.phoneNumber}</p>}
              </div>

              <div>
                <label htmlFor="onboardRole" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Requested Role <span className="font-normal normal-case tracking-normal text-slate-400">— confirmed by your facility during verification</span>
                </label>
                <select
                  id="onboardRole"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                  disabled={user?.role === 'owner'}
                >
                  {user?.role === 'owner' && <option value="owner">Owner</option>}
                  <option value="hospital_manager">Hospital Manager</option>
                  <option value="medical_director">Medical Director</option>
                  <option value="deputy_manager">Deputy Manager</option>
                  <option value="head_of_department">Head of Department</option>
                  <option value="consultant">Consultant</option>
                  <option value="specialist">Specialist</option>
                  <option value="resident">Resident</option>
                  <option value="nursing_supervisor">Nursing Supervisor</option>
                  <option value="nurse">Nurse</option>
                  <option value="er_official">ER Room Official</option>
                </select>
              </div>

              {role !== 'system_admin' && role !== 'owner' && (
                <div>
                  <label htmlFor="onboardFacility" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Hospital</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select
                      id="onboardFacility"
                      required
                      value={facilityId}
                      onChange={(e) => { 
                        setFacilityId(e.target.value); 
                        setDepartment(''); 
                        if (formErrors.facilityId) setFormErrors(prev => ({ ...prev, facilityId: '' }));
                      }}
                      className={`w-full min-h-[48px] pl-10 rounded-xl border ${formErrors.facilityId ? 'border-critical-500' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900`}
                    >
                      <option value="">Select a Hospital</option>
                      {facilities.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.facilityId && <p className="mt-1 text-xs text-critical-500 font-medium">{formErrors.facilityId}</p>}
                </div>
              )}

              {(role === 'consultant' || role === 'specialist' || role === 'resident' || role === 'head_of_department' || role === 'nurse' || role === 'nursing_supervisor') && selectedFacility && (
                <div>
                  <label htmlFor="onboardDepartment" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Department</label>
                  <select
                    id="onboardDepartment"
                    required
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (formErrors.department) setFormErrors(prev => ({ ...prev, department: '' }));
                    }}
                    className={`w-full min-h-[48px] rounded-xl border ${formErrors.department ? 'border-critical-500' : 'border-slate-200 dark:border-slate-800'} bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900`}
                  >
                    <option value="">Select a Department</option>
                    {selectedFacility.departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {formErrors.department && <p className="mt-1 text-xs text-critical-500 font-medium">{formErrors.department}</p>}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full min-h-[56px] text-lg font-bold bg-blue-900 hover:bg-blue-800 disabled:opacity-60 shadow-md">
                {submitting ? 'Saving...' : 'Complete Onboarding'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
