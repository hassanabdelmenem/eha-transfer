import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Role, FacilityType, BedType } from '../types';
import { XCircle, Plus, Trash2, Building, Edit2 } from 'lucide-react';
import { showToast } from '../lib/toast';

export const FacilitySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    facilities, 
    facilitiesById,
    users, 
    updateUserVerified, 
    updateUserRole, 
    updateUserFacility,
    removeUser,
    addFacility,
    updateFacility,
    removeFacility,
    addFacilityDepartment, 
    removeFacilityDepartment 
  } = useData();
  
  const [newDepartment, setNewDepartment] = useState('');
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);

  // New facility form state
  const [facName, setFacName] = useState('');
  const [facType, setFacType] = useState<FacilityType>('district_hospital');
  const [facLocation, setFacLocation] = useState('');
  const [facIsExternal, setFacIsExternal] = useState(false);
  const [facContractedServices, setFacContractedServices] = useState('');
  const [facDepts, setFacDepts] = useState('Emergency, ICU, Surgery, Internal Medicine');
  const [icuTotal, setIcuTotal] = useState(10);
  const [ccuTotal, setCcuTotal] = useState(5);
  const [picuTotal, setPicuTotal] = useState(5);
  const [wardTotal, setWardTotal] = useState(50);

  const hasAccess = user && ['hospital_manager', 'deputy_manager', 'medical_director', 'owner', 'system_admin', 'head_of_department'].includes(user.role);
  if (!hasAccess) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Access Denied. Leadership privileges required.</div>;
  }

  const isGlobalAdmin = user?.role === 'owner' || user?.role === 'system_admin';
  const facility = facilitiesById.get(user.facilityId || '');
  
  if (!facility && !isGlobalAdmin) return null;

  let facilityUsers = isGlobalAdmin ? users : users.filter(u => u.facilityId === facility?.id);
  if (user.role === 'head_of_department') {
    facilityUsers = facilityUsers.filter(u => u.department === user.department);
  }
  
  const unverifiedUsers = facilityUsers.filter(u => !u.verified);
  const verifiedUsers = facilityUsers.filter(u => u.verified && u.id !== user.id);

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (facility && newDepartment.trim() && !facility.departments.includes(newDepartment.trim())) {
      addFacilityDepartment(facility.id, newDepartment.trim());
      setNewDepartment('');
    }
  };

  // Onboarding records what the user asked to be as `requestedRole`; it carries no
  // authority until an approver grants it here. Approvers can't hand out a role
  // above their own station.
  const canGrantRole = (role: Role) => {
    if (role === 'owner') return user.role === 'owner';
    if (role === 'system_admin') return isGlobalAdmin;
    if (['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department'].includes(role)) {
      return user.role !== 'head_of_department';
    }
    return true;
  };

  const handleVerifyUser = (targetUser: User) => {
    const requested = targetUser.requestedRole;
    if (requested && requested !== targetUser.role) {
      if (!canGrantRole(requested)) {
        showToast(`You cannot grant the role "${requested.replace(/_/g, ' ')}". Ask a system administrator to approve this account.`, 'error');
        return;
      }
      updateUserRole(targetUser.id, requested, targetUser.department);
    }
    updateUserVerified(targetUser.id, true);
  };

  const handleRemoveUser = (targetUser: User) => {
    if (window.confirm(`Are you sure you want to completely remove user "${targetUser.name}" (${targetUser.email}) from the system?`)) {
      removeUser(targetUser.id);
    }
  };

  const handleRemoveFacility = (targetFacilityId: string, facilityName: string) => {
    if (window.confirm(`Are you sure you want to remove facility "${facilityName}"? All staff assigned to this facility will need to be reassigned.`)) {
      removeFacility(targetFacilityId);
    }
  };

  const handleEditFacilityClick = (f: any) => {
    setEditingFacilityId(f.id);
    setFacName(f.name);
    setFacType(f.type);
    setFacLocation(f.location);
    setFacIsExternal(f.isExternal);
    setFacContractedServices(f.contractedServices?.join(', ') || '');
    setFacDepts(f.departments.join(', '));
    setIcuTotal(f.capacity.ICU.total);
    setCcuTotal(f.capacity.CCU.total);
    setPicuTotal(f.capacity.PICU.total);
    setWardTotal(f.capacity.Ward.total);
    setShowAddFacility(true);
  };

  const handleAddFacilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName.trim() || !facLocation.trim()) return;

    const departmentsArray = facDepts.split(',').map(d => d.trim()).filter(Boolean);
    const contractedServicesArray = facContractedServices.split(',').map(s => s.trim()).filter(Boolean);

    // Editing an existing facility must not reset how many of its beds are currently
    // occupied — this form only edits totals, occupancy is managed in Bed Management.
    const existingCapacity = editingFacilityId ? facilitiesById.get(editingFacilityId)?.capacity : undefined;
    const capacityFor = (bed: BedType, total: number) => ({
      total: Number(total) || 0,
      occupied: existingCapacity?.[bed]?.occupied ?? 0
    });

    const facilityPayload = {
      name: facName.trim(),
      type: facType,
      location: facLocation.trim(),
      isExternal: facIsExternal,
      contractedServices: facContractedServices ? contractedServicesArray : [],
      departments: departmentsArray.length > 0 ? departmentsArray : ['Emergency', 'General'],
      capacity: {
        ICU: capacityFor('ICU', icuTotal),
        CCU: capacityFor('CCU', ccuTotal),
        PICU: capacityFor('PICU', picuTotal),
        Ward: capacityFor('Ward', wardTotal)
      }
    };

    if (editingFacilityId) {
      updateFacility(editingFacilityId, facilityPayload);
    } else {
      addFacility(facilityPayload);
    }

    // Reset form
    setEditingFacilityId(null);
    setFacName('');
    setFacLocation('');
    setFacIsExternal(false);
    setFacContractedServices('');
    setShowAddFacility(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* 3c/3d: unified facility settings -- edge-to-edge on phones,
          contained in a rounded header card once there's room. */}
      <div className="-mt-4 -mx-4 sm:mt-0 sm:mx-0 sm:rounded-xl sm:overflow-hidden space-y-0">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 sm:px-6">
          <h1 className="text-lg sm:text-xl font-heading font-semibold">{facility?.name || 'Global Admin'}</h1>
          <p className="text-sm text-white/60 mt-0.5">Facility settings · {user.role.replace(/_/g, ' ')}</p>
        </div>
        <div className="p-4 sm:p-6 sm:bg-slate-50 sm:dark:bg-slate-950/40 space-y-5">
          {unverifiedUsers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{unverifiedUsers.length} account{unverifiedUsers.length === 1 ? '' : 's'} to verify</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {unverifiedUsers.map(u => (
                  <div key={u.id} className="rounded-xl border border-warning-300 dark:border-warning-800 bg-warning-50 dark:bg-warning-950/30 p-3.5">
                    <p className="text-[15.5px] font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs bg-slate-900 dark:bg-slate-700 text-white px-1.5 py-0.5 rounded uppercase font-bold">{(u.requestedRole || u.role).replace(/_/g, ' ')}</span>
                      {u.department && <span className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{u.department}</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleVerifyUser(u)} className="flex-1 min-h-[46px] rounded-lg bg-success-700 text-white text-sm font-bold uppercase tracking-wide">
                        Verify as {(u.requestedRole || u.role).replace(/_/g, ' ')}
                      </button>
                      <button onClick={() => handleRemoveUser(u)} aria-label={`Decline ${u.name}`} className="min-h-[46px] min-w-[46px] rounded-lg border border-critical-300 dark:border-critical-800 text-critical-600 dark:text-critical-400 flex items-center justify-center">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {facility && !['head_of_department'].includes(user.role) && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Departments · {facility.departments.length}</p>
                <div className="flex flex-wrap gap-2">
                  {facility.departments.map(dept => (
                    <span key={dept} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-3 pr-1.5 py-1 text-sm text-slate-700 dark:text-slate-300">
                      {dept}
                      <button onClick={() => removeFacilityDepartment(facility.id, dept)} aria-label={`Remove ${dept}`} className="rounded-full p-1 text-slate-400 hover:text-critical-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <form onSubmit={handleAddDepartment} className="inline-flex items-center">
                    <input
                      value={newDepartment}
                      onChange={e => setNewDepartment(e.target.value)}
                      placeholder="+ Add"
                      className="w-24 rounded-full border border-dashed border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1 text-sm text-slate-600 dark:text-slate-300 outline-none"
                    />
                  </form>
                </div>
              </div>
            )}

            {facility && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Configured capacity</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                  {(Object.keys(facility.capacity) as BedType[]).map(bed => (
                    <div key={bed} className="px-3.5 py-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{bed}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{facility.capacity[bed].total} beds · {facility.capacity[bed].occupied} occupied</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1">
        {isGlobalAdmin ? 'Network & staff management' : 'Staff roles & transfers'}
      </h2>

      {/* Network Facilities Management Section */}
      {(isGlobalAdmin || ['hospital_manager', 'medical_director', 'owner'].includes(user.role)) && (
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              Network Facilities
            </CardTitle>
            <Button size="sm" onClick={() => {
              if (showAddFacility) {
                setShowAddFacility(false);
                setEditingFacilityId(null);
              } else {
                setFacName(''); setFacLocation(''); setFacIsExternal(false); setFacContractedServices(''); setFacDepts('Emergency, ICU, Surgery, Internal Medicine'); setIcuTotal(10); setCcuTotal(5); setPicuTotal(5); setWardTotal(50);
                setShowAddFacility(true);
              }
            }}>
              <Plus className="w-4 h-4 mr-1.5" />
              {showAddFacility ? 'Cancel' : 'Add Facility'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showAddFacility && (
              <form onSubmit={handleAddFacilitySubmit} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4 mb-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{editingFacilityId ? 'Edit Facility' : 'Add New Facility'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="facName" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Facility Name *</label>
                    <input
                      id="facName"
                      type="text"
                      required
                      value={facName}
                      onChange={e => setFacName(e.target.value)}
                      placeholder="e.g. Al-Amal Specialized Hospital"
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="facType" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Facility Type</label>
                    <select
                      id="facType"
                      value={facType}
                      onChange={e => setFacType(e.target.value as FacilityType)}
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      <option value="tertiary_care">Tertiary Care Hospital</option>
                      <option value="district_hospital">District Hospital</option>
                      <option value="primary_care">Primary Care Unit</option>
                      <option value="external_contracted">External Contracted Facility</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="facLocation" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Location / Address *</label>
                    <input
                      id="facLocation"
                      type="text"
                      required
                      value={facLocation}
                      onChange={e => setFacLocation(e.target.value)}
                      placeholder="e.g. Ismailia City Center"
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="facDepts" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Departments (comma separated)</label>
                    <input
                      id="facDepts"
                      type="text"
                      value={facDepts}
                      onChange={e => setFacDepts(e.target.value)}
                      placeholder="Emergency, ICU, CCU, Surgery"
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="facIsExternal"
                    checked={facIsExternal || facType === 'external_contracted'}
                    onChange={e => setFacIsExternal(e.target.checked)} 
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="facIsExternal" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Is External / Contracted Facility
                  </label>
                </div>

                {(facIsExternal || facType === 'external_contracted') && (
                  <div>
                    <label htmlFor="facContractedServices" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Contracted Services (comma separated)</label>
                    <input
                      id="facContractedServices"
                      type="text"
                      value={facContractedServices}
                      onChange={e => setFacContractedServices(e.target.value)}
                      placeholder="e.g. Specialized ICU, Cardiac Surgery, Oncology, Dialysis"
                      className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Initial Bed Capacity</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label htmlFor="icuTotal" className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400">ICU Beds</label>
                      <input id="icuTotal" type="number" min="0" value={icuTotal} onChange={e => setIcuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="ccuTotal" className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400">CCU Beds</label>
                      <input id="ccuTotal" type="number" min="0" value={ccuTotal} onChange={e => setCcuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="picuTotal" className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400">PICU Beds</label>
                      <input id="picuTotal" type="number" min="0" value={picuTotal} onChange={e => setPicuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="wardTotal" className="block text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Ward Beds</label>
                      <input id="wardTotal" type="number" min="0" value={wardTotal} onChange={e => setWardTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => { setShowAddFacility(false); setEditingFacilityId(null); }}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingFacilityId ? 'Update Facility' : 'Create Facility'}</Button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {facilities.map(f => (
                <div key={f.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{f.name}</h4>
                      {f.isExternal && (
                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">Contracted</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {f.location} • <span className="uppercase">{(f.type || "").replace('_', ' ')}</span></p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.departments.map(d => (
                        <span key={d} className="text-xs bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{d}</span>
                      ))}
                    </div>
                    {f.contractedServices && f.contractedServices.length > 0 && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                        Services: {f.contractedServices.join(', ')}
                      </p>
                    )}
                  </div>
                  {isGlobalAdmin && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 min-h-[40px] min-w-[40px] p-0 shrink-0" 
                        title="Edit Facility"
                        onClick={() => handleEditFacilityClick(f)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="text-critical-500 hover:text-critical-700 hover:bg-critical-50 min-h-[40px] min-w-[40px] p-0 shrink-0" 
                        title="Remove Facility"
                        onClick={() => handleRemoveFacility(f.id, f.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Role & Facility Transfer Management */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Staff Roles & Facility Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Name / Email</th>
                  <th className="px-4 py-3">Facility Location</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifiedUsers.map(u => {
                  const userFac = facilitiesById.get(u.facilityId || '');
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{u.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none max-w-[180px]"
                          value={u.facilityId || ''}
                          onChange={(e) => {
                            const newFacId = e.target.value;
                            updateUserFacility(u.id, newFacId, '');
                          }}
                        >
                          <option value="">Unassigned Facility</option>
                          {facilities.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                         <select 
                           className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none"
                           value={u.role}
                           disabled={user.role !== 'owner' && u.role === 'owner'}
                           onChange={(e) => updateUserRole(u.id, e.target.value as Role, u.department)}
                         >
                           <option value="consultant">Consultant</option>
                           <option value="specialist">Specialist</option>
                           <option value="resident">Resident</option>
                           <option value="nurse">Nurse</option>
                           <option value="nursing_supervisor">Nursing Supervisor</option>
                           <option value="er_official">ER Room Official</option>
                           {!['head_of_department'].includes(user.role) && (
                             <>
                               <option value="head_of_department">Head of Department</option>
                               <option value="hospital_manager">Hospital Manager</option>
                               <option value="deputy_manager">Deputy Manager</option>
                               <option value="medical_director">Medical Director</option>
                             </>
                           )}
                           {(user.role === 'owner' || user.role === 'system_admin') && (
                             <option value="system_admin">System Admin</option>
                           )}
                           {user.role === 'owner' && (
                             <option value="owner">Owner</option>
                           )}
                         </select>
                      </td>
                      <td className="px-4 py-3">
                         {['consultant', 'specialist', 'resident', 'head_of_department', 'nurse', 'nursing_supervisor'].includes(u.role) ? (
                           <select 
                             className="text-xs border border-slate-300 rounded p-1 bg-white dark:bg-slate-900 outline-none"
                             value={u.department || ''}
                             onChange={(e) => updateUserRole(u.id, u.role, e.target.value)}
                           >
                             <option value="">No Department</option>
                             {(userFac?.departments || facility?.departments || []).map(d => (
                               <option key={d} value={d}>{d}</option>
                             ))}
                           </select>
                         ) : (
                           <span className="text-slate-400 text-xs italic">N/A</span>
                         )}
                      </td>
                      <td className="px-4 py-3 text-right">
                         <Button 
                           variant="ghost" 
                           className="text-critical-500 hover:text-critical-700 hover:bg-critical-50 min-h-[40px] min-w-[40px] p-0"
                           title="Remove User Completely"
                           onClick={() => handleRemoveUser(u)}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </td>
                    </tr>
                  );
                })}
                {verifiedUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No other staff members found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
