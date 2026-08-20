import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Phone } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { BedType, Facility, User } from '../types';
import { QueueDetailSplit, EmptyDetailPane } from '../components/layout/QueueDetailSplit';

const BED_TYPES: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];
// 2e network list: a capacity hint per facility -- the first configured bed
// type, ICU preferred since that's what most referrals in this network need.
// Falls back to a department count for a facility with no capacity configured.
const capacityHint = (f: Facility): string => {
  const bt = BED_TYPES.find(b => (f.capacity?.[b]?.total ?? 0) > 0);
  if (!bt) return `${f.departments.length} department${f.departments.length === 1 ? '' : 's'}`;
  const cap = f.capacity[bt];
  const free = cap.total - cap.occupied;
  return free > 0 ? `${free} ${bt} free` : `${bt} full`;
};

const BED_TYPES_ALL: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];

// Desktop master-detail: the selected facility's location, capacity and
// visible staff -- there is no existing "facility detail" view to reuse
// (the mobile/tablet cards are summary-only), so this pane is new.
const FacilityDetailPane: React.FC<{ facility: Facility; staff: User[] }> = ({ facility, staff }) => (
  <div className="space-y-4">
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-heading font-semibold truncate">{facility.name}</h2>
          <p className="text-xs text-white/60 mt-0.5">{facility.location}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${facility.isExternal ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
          {(facility.type || '').replace('_', ' ')}
        </span>
      </div>

      <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Bed capacity</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BED_TYPES_ALL.filter(bt => (facility.capacity?.[bt]?.total ?? 0) > 0).map(bt => {
              const cap = facility.capacity[bt];
              const available = cap.total - cap.occupied;
              return (
                <div key={bt} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{bt}</p>
                  <p className={`text-lg font-bold tabular-nums mt-0.5 ${available > 0 ? 'text-success-600' : 'text-critical-600'}`}>{available}</p>
                  <p className="text-[10px] text-slate-400">of {cap.total}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Departments</p>
          <div className="flex flex-wrap gap-1.5">
            {facility.departments.map(d => (
              <span key={d} className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Visible staff · {staff.length}</p>
      </div>
      {staff.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No staff visible to you at this facility.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {staff.map(u => (
            <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{(u.role || '').replace(/_/g, ' ')}{u.department ? ` · ${u.department}` : ''}</p>
              </div>
              {u.phoneNumber ? (
                <a href={`tel:${u.phoneNumber}`} aria-label={`Call ${u.name}`} className="h-9 w-9 shrink-0 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-xs text-slate-400 shrink-0">No number</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export const NetworkDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, shiftAssignments, referrals, users, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  // Desktop master-detail selection (lg+ only), mirrors Dashboard.tsx's pattern.
  const [selectedFacilityDetailId, setSelectedFacilityDetailId] = useState<string | null>(null);

  if (!user) return null;

  const isAdmin = user.role === 'owner' || user.role === 'system_admin';
  const isLeadership = ['hospital_manager', 'deputy_manager', 'medical_director', 'owner'].includes(user.role);
  const canViewNetwork = isAdmin || isLeadership;

  const allowedExternalUsers = new Set<string>();
  
  referrals.forEach(r => {
    const isLeadershipInvolved = isLeadership && (r.receivingFacilityId === user.facilityId || r.referringFacilityId === user.facilityId);
    const isReceiving = r.receivingFacilityId === user.facilityId && user.department && r.receivingDepartments.includes(user.department);
    const isInitiating = r.referringUserId === user.id;

    if (isReceiving || isInitiating || isLeadershipInvolved) {
      if (r.referringFacilityId !== user.facilityId) {
        allowedExternalUsers.add(r.referringUserId);
        const referringUser = users.find(u => u.id === r.referringUserId);
        if (referringUser && referringUser.department) {
           const hod = users.find(u => u.facilityId === referringUser.facilityId && u.department === referringUser.department && u.role === 'head_of_department');
           if (hod) allowedExternalUsers.add(hod.id);
        }
      }

      if (r.receivingFacilityId !== user.facilityId) {
        r.receivingDepartments.forEach(dept => {
           const hod = users.find(u => u.facilityId === r.receivingFacilityId && u.department === dept && u.role === 'head_of_department');
           if (hod) allowedExternalUsers.add(hod.id);
           const assignment = (shiftAssignments || []).find(s => s.facilityId === r.receivingFacilityId && s.department === dept);
           if (assignment?.assignedUserId) allowedExternalUsers.add(assignment.assignedUserId);
        });
      }
    }
  });

  const visibleFacilities = facilities.filter(f => {
    if (canViewNetwork) return true;
    if (f.id === user.facilityId) return true;
    return users.some(u => u.facilityId === f.id && allowedExternalUsers.has(u.id));
  });

  const isUserAllowed = (u: any, facilityId: string) => {
    if (u.facilityId !== facilityId) return false;
    const isOwnFacility = u.facilityId === user.facilityId || isAdmin;
    
    if (isAdmin) {
       return ['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident'].includes(u.role);
    }
    
    if (canViewNetwork) {
       const allowedRoles = isOwnFacility 
           ? ['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident']
           : ['hospital_manager', 'deputy_manager', 'medical_director'];
       if (allowedRoles.includes(u.role)) return true;
       return allowedExternalUsers.has(u.id);
    } else {
       if (isOwnFacility) {
          return ['hospital_manager', 'deputy_manager', 'medical_director', 'head_of_department', 'consultant', 'specialist', 'resident'].includes(u.role);
       } else {
          return allowedExternalUsers.has(u.id);
       }
    }
  };

  const q = searchQuery.toLowerCase().trim();
  const filteredFacilities = visibleFacilities.filter(f => {
    if (!q) return true;
    const matchFacility = f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q) || f.type.toLowerCase().includes(q);
    const facilityUsers = users.filter(u => isUserAllowed(u, f.id));
    const matchUsers = facilityUsers.some(u => 
      u.name.toLowerCase().includes(q) || 
      (u.department || '').toLowerCase().includes(q) || 
      (u.role || "").toLowerCase().replace(/_/g, ' ').includes(q)
    );
    return matchFacility || matchUsers;
  });

  // Desktop master-detail: keep a valid selection as the filtered list changes.
  useEffect(() => {
    if (filteredFacilities.length === 0) {
      if (selectedFacilityDetailId !== null) setSelectedFacilityDetailId(null);
    } else if (!filteredFacilities.some(f => f.id === selectedFacilityDetailId)) {
      setSelectedFacilityDetailId(filteredFacilities[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredFacilities.map(f => f.id).join(',')]);

  const selectedFacility = filteredFacilities.find(f => f.id === selectedFacilityDetailId) || null;
  const selectedFacilityStaff = selectedFacility ? users.filter(u => isUserAllowed(u, selectedFacility.id)) : [];

  // 2e "On call right now": own facility's staff, filtered to whoever is
  // actually responsible right now -- same isResponsibleNow rule the desktop
  // table below uses per row.
  const ownFacilityId = user.facilityId || '';
  const onCallNow = users.filter(u => {
    if (!isUserAllowed(u, ownFacilityId)) return false;
    if (u.role === 'head_of_department') {
      const assignment = (shiftAssignments || []).find(s => s.facilityId === ownFacilityId && s.department === u.department);
      return !assignment || !assignment.assignedUserId;
    }
    if (['consultant', 'specialist', 'resident'].includes(u.role)) {
      const assignment = (shiftAssignments || []).find(s => s.facilityId === ownFacilityId && s.department === u.department);
      return assignment?.assignedUserId === u.id;
    }
    return true;
  }).filter(u => {
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().replace(/_/g, ' ').includes(q);
  });

  return (
    <div className="space-y-6 pb-16 h-full overflow-auto">
      {/* 2e/3d: unified directory header + on-call + facility list, same
          cards at every width -- edge-to-edge on phones, contained in a
          rounded header card once there's room. */}
      <div className="-mt-4 -mx-4 sm:mt-0 sm:mx-0 sm:rounded-xl sm:overflow-hidden space-y-0">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 sm:px-6 space-y-3">
          <div>
            <h1 className="text-lg sm:text-xl font-heading font-semibold">{canViewNetwork ? 'Network Directory' : 'Hospital Directory'}</h1>
            <p className="text-sm text-white/60 mt-0.5 hidden sm:block">{canViewNetwork ? 'Global view of facilities and staff.' : 'View departments and on-call staff for your hospital.'}</p>
          </div>
          <div className="relative sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              className="w-full min-h-[48px] rounded-lg bg-white/10 border border-white/15 pl-10 pr-3 text-sm text-white placeholder:text-white/50 outline-none"
              placeholder="Name, department or hospital"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 sm:bg-slate-50 sm:dark:bg-slate-950/40 space-y-3">
          {ownFacilityId && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">On call right now · your hospital</p>
              {onCallNow.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No on-call staff found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {onCallNow.map(u => (
                    <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">On call</span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate capitalize">{(u.role || '').replace(/_/g, ' ')}{u.department ? ` · ${u.department}` : ''}</p>
                      </div>
                      {u.phoneNumber ? (
                        <a href={`tel:${u.phoneNumber}`} aria-label={`Call ${u.name}`} className="h-14 w-14 shrink-0 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                          <Phone className="w-5 h-5" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 shrink-0">No number</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 pt-2">Network · {filteredFacilities.length} facilit{filteredFacilities.length === 1 ? 'y' : 'ies'}</p>

          <div className="lg:hidden">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredFacilities.map(f => (
                  <div key={f.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{f.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{f.location} · {capacityHint(f)}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${f.isExternal ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                      {(f.type || '').replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            {loading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <QueueDetailSplit
                list={
                  filteredFacilities.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center px-3">No facilities match.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredFacilities.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSelectedFacilityDetailId(f.id)}
                          className={`w-full text-left p-3.5 ${selectedFacilityDetailId === f.id ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{f.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{f.location} · {capacityHint(f)}</p>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase ${f.isExternal ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                              {(f.type || '').replace('_', ' ')}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                }
                detail={selectedFacility ? <FacilityDetailPane facility={selectedFacility} staff={selectedFacilityStaff} /> : <EmptyDetailPane label="Select a facility from the list to see its details." />}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
