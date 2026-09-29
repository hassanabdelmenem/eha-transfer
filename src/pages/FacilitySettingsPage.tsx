import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Role, FacilityType, BedType } from '../types';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { RoleHomeHeadline, MicroLabel } from '../components/dashboard/RoleHome';
import { ROLE_CONFIGS } from '../components/layout/RoleBadge';
import { cn } from '../lib/utils';
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

  const roleLabel = (r: Role | string) => ROLE_CONFIGS[r as Role]?.label ?? String(r).replace(/_/g, ' ');

  return (
    <div className="max-w-[760px]">
      <ScreenHeader
        title={facility?.name || 'Network settings'}
        subtitle={`Facility settings · ${roleLabel(user.role).toLowerCase()}`}
      />

      {/* 3c: pending verifications first — the only thing here that blocks a person from working. */}
      {unverifiedUsers.length > 0 && (
        <section aria-labelledby="to-verify" className="flex flex-col gap-3">
          <RoleHomeHeadline
            title={`${unverifiedUsers.length} account${unverifiedUsers.length === 1 ? '' : 's'} to verify`}
            rationale="A verified account gets the role it asked for. Nothing else here blocks anyone from working."
          />
          <ul className="mt-1 flex flex-col gap-3">
            {unverifiedUsers.map(u => {
              const asked = u.requestedRole || u.role;
              return (
                <li key={u.id} className="rounded-xl border border-warning-700 bg-warning-100 p-[14px] dark:border-warning-600/60 dark:bg-warning-900/35">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-semibold text-ink dark:text-paper">{u.name}</p>
                      <p className="truncate text-[13.5px] text-warning-900 dark:text-warning-100/80">{u.email}</p>
                    </div>
                    <span className="shrink-0 rounded-[6px] bg-ink px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-paper dark:bg-paper dark:text-ink">
                      {roleLabel(asked)}{u.department ? ` · ${u.department}` : ''}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2.5">
                    <button type="button" onClick={() => handleVerifyUser(u)} className="min-h-[52px] flex-1 rounded-[10px] bg-success-700 px-3 text-[15px] font-semibold text-white hover:bg-success-800">
                      Verify as {roleLabel(asked).toLowerCase()}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(u)}
                      aria-label={`Decline and remove ${u.name}'s account`}
                      className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border border-critical-700 bg-white text-critical-700 hover:bg-critical-50 dark:border-critical-400 dark:bg-transparent dark:text-critical-300 dark:hover:bg-critical-950/40"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className={cn('grid grid-cols-1 gap-6 sm:grid-cols-2', unverifiedUsers.length > 0 && 'mt-7')}>
        {facility && user.role !== 'head_of_department' && (
          <section aria-labelledby="departments" className="flex flex-col gap-2.5">
            <MicroLabel id="departments">Departments · {facility.departments.length}</MicroLabel>
            <ul className="flex flex-wrap gap-2">
              {facility.departments.map(dept => (
                <li key={dept} className="inline-flex min-h-[48px] items-center rounded-full border border-slate-300 bg-white ps-4 text-[14px] font-medium text-ink dark:border-white/25 dark:bg-white/5 dark:text-paper">
                  {dept}
                  <button
                    type="button"
                    onClick={() => removeFacilityDepartment(facility.id, dept)}
                    aria-label={`Remove ${dept}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-slate-500 hover:text-critical-700 dark:text-white/55 dark:hover:text-critical-300"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li>
                <form onSubmit={handleAddDepartment} className="inline-flex">
                  <label htmlFor="new-department" className="sr-only">Add a department</label>
                  <input
                    id="new-department"
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    placeholder="+ Add"
                    className="min-h-[48px] w-32 rounded-full border border-dashed border-slate-400 bg-transparent px-4 text-[14px] text-ink placeholder:text-slate-700 focus:w-48 focus:border-solid focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/35 dark:text-paper dark:placeholder:text-white/65"
                  />
                </form>
              </li>
            </ul>
          </section>
        )}

        {facility && (
          <section aria-labelledby="configured-capacity" className="flex flex-col gap-2.5">
            <MicroLabel id="configured-capacity">Configured capacity</MicroLabel>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.05]">
              {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).filter(bed => facility.capacity[bed]).map(bed => (
                <li key={bed} className="flex min-h-[48px] items-center justify-between px-[14px]">
                  <span className="text-[15px] font-semibold text-ink dark:text-paper">{bed}</span>
                  <span className="text-[14px] tabular-nums text-slate-700 dark:text-white/65">
                    {facility.capacity[bed].total} beds · {facility.capacity[bed].occupied} occupied
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-8 space-y-6">

      {/* 3c: facilities are a flat list under one label, with one full-width way to add one. */}
      {(isGlobalAdmin || ['hospital_manager', 'medical_director', 'owner'].includes(user.role)) && (
        <section aria-labelledby="facilities-label" className="flex flex-col gap-2.5">
          <p id="facilities-label" className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">
            Network and contracted facilities · {facilities.length}
          </p>
          <button
            type="button"
            onClick={() => {
              if (showAddFacility) {
                setShowAddFacility(false);
                setEditingFacilityId(null);
              } else {
                setFacName(''); setFacLocation(''); setFacIsExternal(false); setFacContractedServices(''); setFacDepts('Emergency, ICU, Surgery, Internal Medicine'); setIcuTotal(10); setCcuTotal(5); setPicuTotal(5); setWardTotal(50);
                setShowAddFacility(true);
              }
            }}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-[10px] bg-ink px-3.5 text-[15px] font-semibold text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200"
          >
            {!showAddFacility && <Plus className="w-4 h-4" aria-hidden="true" />}
            {showAddFacility ? 'Cancel' : 'Add a contracted facility'}
          </button>
            {showAddFacility && (
              <form onSubmit={handleAddFacilitySubmit} className="space-y-4 rounded-xl border border-slate-200 bg-paper p-4 dark:border-white/12 dark:bg-white/[0.03]">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{editingFacilityId ? 'Edit Facility' : 'Add New Facility'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="facName" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Facility Name *</label>
                    <input
                      id="facName"
                      type="text"
                      required
                      value={facName}
                      onChange={e => setFacName(e.target.value)}
                      placeholder="e.g. Al-Amal Specialized Hospital"
                      className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                    />
                  </div>
                  <div>
                    <label htmlFor="facType" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Facility Type</label>
                    <select
                      id="facType"
                      value={facType}
                      onChange={e => setFacType(e.target.value as FacilityType)}
                      className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                    >
                      <option value="tertiary_care">Tertiary Care Hospital</option>
                      <option value="district_hospital">District Hospital</option>
                      <option value="primary_care">Primary Care Unit</option>
                      <option value="external_contracted">External Contracted Facility</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="facLocation" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Location / Address *</label>
                    <input
                      id="facLocation"
                      type="text"
                      required
                      value={facLocation}
                      onChange={e => setFacLocation(e.target.value)}
                      placeholder="e.g. Ismailia City Center"
                      className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                    />
                  </div>
                  <div>
                    <label htmlFor="facDepts" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Departments (comma separated)</label>
                    <input
                      id="facDepts"
                      type="text"
                      value={facDepts}
                      onChange={e => setFacDepts(e.target.value)}
                      placeholder="Emergency, ICU, CCU, Surgery"
                      className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                    />
                  </div>
                </div>

                <label htmlFor="facIsExternal" className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="facIsExternal"
                    checked={facIsExternal || facType === 'external_contracted'}
                    onChange={e => setFacIsExternal(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300"
                  />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Is External / Contracted Facility
                  </span>
                </label>

                {(facIsExternal || facType === 'external_contracted') && (
                  <div>
                    <label htmlFor="facContractedServices" className="mb-1.5 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Contracted Services (comma separated)</label>
                    <input
                      id="facContractedServices"
                      type="text"
                      value={facContractedServices}
                      onChange={e => setFacContractedServices(e.target.value)}
                      placeholder="e.g. Specialized ICU, Cardiac Surgery, Oncology, Dialysis"
                      className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                    />
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <p className="mb-2 text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Bed capacity (total beds per type)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label htmlFor="icuTotal" className="mb-1 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">ICU Beds</label>
                      <input id="icuTotal" type="number" min="0" value={icuTotal} onChange={e => setIcuTotal(Math.max(0, Number(e.target.value) || 0))} className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper tabular-nums" />
                    </div>
                    <div>
                      <label htmlFor="ccuTotal" className="mb-1 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">CCU Beds</label>
                      <input id="ccuTotal" type="number" min="0" value={ccuTotal} onChange={e => setCcuTotal(Math.max(0, Number(e.target.value) || 0))} className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper tabular-nums" />
                    </div>
                    <div>
                      <label htmlFor="picuTotal" className="mb-1 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">PICU Beds</label>
                      <input id="picuTotal" type="number" min="0" value={picuTotal} onChange={e => setPicuTotal(Math.max(0, Number(e.target.value) || 0))} className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper tabular-nums" />
                    </div>
                    <div>
                      <label htmlFor="wardTotal" className="mb-1 block text-[12.5px] font-semibold text-slate-700 dark:text-white/70">Ward Beds</label>
                      <input id="wardTotal" type="number" min="0" value={wardTotal} onChange={e => setWardTotal(Math.max(0, Number(e.target.value) || 0))} className="min-h-[48px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[15px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper tabular-nums" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowAddFacility(false); setEditingFacilityId(null); }} className="min-h-[48px] rounded-[10px] px-4 text-[15px] font-semibold text-slate-700 hover:bg-slate-100 dark:text-white/75 dark:hover:bg-white/10">Cancel</button>
                  <button type="submit" className="min-h-[48px] rounded-[10px] bg-ink px-4 text-[15px] font-semibold text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200">{editingFacilityId ? 'Update Facility' : 'Create Facility'}</button>
                </div>
              </form>
            )}

            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/12 dark:bg-white/[0.05]">
              {facilities.map(f => (
                <li key={f.id} className="flex items-start justify-between gap-2 px-[14px] py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{f.name}</h4>
                      {f.isExternal && (
                        <span className="shrink-0 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">Contracted</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{f.location} · <span className="">{(f.type || "").replace('_', ' ')}</span></p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.departments.map(d => (
                        <span key={d} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{d}</span>
                      ))}
                    </div>
                    {f.contractedServices && f.contractedServices.length > 0 && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1.5 font-semibold">
                        Services: {f.contractedServices.join(', ')}
                      </p>
                    )}
                  </div>
                  {isGlobalAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        aria-label={`Edit ${f.name}`}
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-info-700 hover:bg-info-50 dark:text-info-300 dark:hover:bg-white/10"
                        onClick={() => handleEditFacilityClick(f)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        aria-label={`Remove ${f.name}`}
                        className="h-12 w-12 rounded-lg flex items-center justify-center text-critical-700 hover:bg-critical-50 dark:text-critical-300 dark:hover:bg-critical-950/40"
                        onClick={() => handleRemoveFacility(f.id, f.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
        </section>
      )}

      {/* Staff Roles & Facility Transfer -- restyled wrapper, same table
          (genuinely dense/tabular data, kept as a table on purpose), larger
          touch targets on every control. */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-500 dark:text-white/60">Staff roles &amp; facility transfer · {verifiedUsers.length}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Name / Email</th>
                <th className="px-4 py-3">Facility Location</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                        className="min-h-[48px] rounded-[10px] border border-slate-300 bg-white px-2 text-[13.5px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper max-w-[180px]"
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
                         className="min-h-[48px] rounded-[10px] border border-slate-300 bg-white px-2 text-[13.5px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
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
                           className="min-h-[48px] rounded-[10px] border border-slate-300 bg-white px-2 text-[13.5px] text-ink focus:border-info-700 focus:outline-none focus:ring-2 focus:ring-info-700/30 dark:border-white/25 dark:bg-white/5 dark:text-paper"
                           value={u.department || ''}
                           onChange={(e) => updateUserRole(u.id, u.role, e.target.value)}
                         >
                           <option value="">No Department</option>
                           {(userFac?.departments || facility?.departments || []).map(d => (
                             <option key={d} value={d}>{d}</option>
                           ))}
                         </select>
                       ) : (
                         <span className="text-slate-500 dark:text-slate-400 text-xs italic">N/A</span>
                       )}
                    </td>
                    <td className="px-4 py-3 text-end">
                       <button
                         aria-label={`Remove ${u.name}`}
                         title="Remove User Completely"
                         className="h-12 w-12 rounded-lg inline-flex items-center justify-center text-critical-700 hover:bg-critical-50 dark:text-critical-300 dark:hover:bg-critical-950/40"
                         onClick={() => handleRemoveUser(u)}
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
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
      </div>
      </div>
    </div>
  );
};
