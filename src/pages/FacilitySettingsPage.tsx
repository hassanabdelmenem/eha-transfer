import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Role, FacilityType, BedType } from '../types';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, XCircle, Plus, Trash2, Building, AlertCircle, Edit2 } from 'lucide-react';

export const FacilitySettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    facilities, 
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
  const facility = facilities.find(f => f.id === user.facilityId);
  
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

    const facilityPayload = {
      name: facName.trim(),
      type: facType,
      location: facLocation.trim(),
      isExternal: facIsExternal,
      contractedServices: facContractedServices ? contractedServicesArray : [],
      departments: departmentsArray.length > 0 ? departmentsArray : ['Emergency', 'General'],
      capacity: {
        ICU: { total: Number(icuTotal) || 0, occupied: 0 },
        CCU: { total: Number(ccuTotal) || 0, occupied: 0 },
        PICU: { total: Number(picuTotal) || 0, occupied: 0 },
        Ward: { total: Number(wardTotal) || 0, occupied: 0 }
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {isGlobalAdmin ? 'Global Facility & User Management' : 'Facility Settings'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {isGlobalAdmin 
            ? 'Manage network facilities, user facility transfers, staff roles, and remove accounts.' 
            : `Manage departments, staff roles, transfers, and verify new users for ${facility?.name}.`}
        </p>
      </div>

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
                      <label htmlFor="icuTotal" className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">ICU Beds</label>
                      <input id="icuTotal" type="number" min="0" value={icuTotal} onChange={e => setIcuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="ccuTotal" className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">CCU Beds</label>
                      <input id="ccuTotal" type="number" min="0" value={ccuTotal} onChange={e => setCcuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="picuTotal" className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">PICU Beds</label>
                      <input id="picuTotal" type="number" min="0" value={picuTotal} onChange={e => setPicuTotal(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded border border-slate-300 dark:border-slate-700 p-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100" />
                    </div>
                    <div>
                      <label htmlFor="wardTotal" className="block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Ward Beds</label>
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
                        <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase">Contracted</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">📍 {f.location} • <span className="uppercase">{f.type.replace('_', ' ')}</span></p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.departments.map(d => (
                        <span key={d} className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">{d}</span>
                      ))}
                    </div>
                    {f.contractedServices && f.contractedServices.length > 0 && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
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
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 min-h-[40px] min-w-[40px] p-0 shrink-0" 
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departments Management for current facility */}
        {facility && !['head_of_department'].includes(user.role) && (
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">Medical Departments ({facility.name})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="New Department Name"
                value={newDepartment}
                onChange={e => setNewDepartment(e.target.value)}
                className="flex-1 rounded border border-slate-300 p-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
              />
              <Button type="submit" disabled={!newDepartment.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add
              </Button>
            </form>
            <div className="space-y-2">
              {facility.departments.map(dept => (
                <div key={dept} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 min-h-[40px] min-w-[40px] p-0"
                    onClick={() => removeFacilityDepartment(facility.id, dept)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {facility.departments.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No departments configured.</p>
              )}
            </div>
          </CardContent>
        </Card>
        )}

        {/* User Verification */}
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Pending Verifications
              {unverifiedUsers.length > 0 && (
                <Badge variant="danger">{unverifiedUsers.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unverifiedUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                All facility users are verified.
              </div>
            ) : (
              <div className="space-y-3">
                {unverifiedUsers.map(u => (
                  <div key={u.id} className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-100 dark:border-amber-900 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      <div className="mt-1 flex gap-2 flex-wrap">
                         <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">{u.role?.replace('_', ' ')}</span>
                         {u.department && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 whitespace-nowrap">{u.department}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button onClick={() => updateUserVerified(u.id, true)} className="bg-green-600 hover:bg-green-700 text-xs py-1 min-h-[40px]">
                         Verify
                      </Button>
                      <Button onClick={() => handleRemoveUser(u)} variant="ghost" aria-label={`Remove ${u.name}`} className="text-red-500 hover:text-red-700 min-h-[40px] min-w-[40px] p-0">
                         <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Role & Facility Transfer Management */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-lg">Staff Roles & Facility Transfer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
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
                  const userFac = facilities.find(f => f.id === u.facilityId);
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
                           className="text-red-500 hover:text-red-700 hover:bg-red-50 min-h-[40px] min-w-[40px] p-0"
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
  );
};
