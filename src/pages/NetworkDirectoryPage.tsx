import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Phone } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { BedType, Facility } from '../types';

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

export const NetworkDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, shiftAssignments, referrals, users, usersById, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  // Memoized maps for fast HOD and assignment lookups
  const hodByFacilityAndDept = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    users.forEach(u => {
      if (u.role === 'head_of_department' && u.facilityId && u.department) {
        const key = `${u.facilityId}:${u.department}`;
        if (!map.has(u.facilityId)) map.set(u.facilityId, new Map());
        map.get(u.facilityId)!.set(u.department, u);
      }
    });
    return map;
  }, [users]);

  const assignmentsByFacilityAndDept = useMemo(() => {
    const map = new Map<string, Map<string, any>>();
    (shiftAssignments || []).forEach(s => {
      if (!map.has(s.facilityId)) map.set(s.facilityId, new Map());
      map.get(s.facilityId)!.set(s.department, s);
    });
    return map;
  }, [shiftAssignments]);

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
        const referringUser = usersById.get(r.referringUserId);
        if (referringUser && referringUser.department && referringUser.facilityId) {
           const hod = hodByFacilityAndDept.get(referringUser.facilityId)?.get(referringUser.department);
           if (hod) allowedExternalUsers.add(hod.id);
        }
      }

      if (r.receivingFacilityId !== user.facilityId) {
        r.receivingDepartments.forEach(dept => {
           const hod = hodByFacilityAndDept.get(r.receivingFacilityId)?.get(dept);
           if (hod) allowedExternalUsers.add(hod.id);
           const assignment = assignmentsByFacilityAndDept.get(r.receivingFacilityId)?.get(dept);
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
    <div className="space-y-6 h-full overflow-auto">
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
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">On call right now · your hospital</p>
              {onCallNow.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No on-call staff found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {onCallNow.map(u => (
                    <div key={u.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{u.name}</p>
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">On call</span>
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

          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2">Network · {filteredFacilities.length} facilit{filteredFacilities.length === 1 ? 'y' : 'ies'}</p>
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
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold  ${f.isExternal ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                    {(f.type || '').replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
