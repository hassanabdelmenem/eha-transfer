import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Search, Phone } from 'lucide-react';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MicroLabel } from '../components/dashboard/RoleHome';
import { ROLE_CONFIGS } from '../components/layout/RoleBadge';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { BedType, Facility } from '../types';
import { isAdmin as checkIsAdmin } from '../lib/permissions';

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

/** "TERTIARY", "DISTRICT", "PRIMARY"… — or "CONTRACTED" for an external partner. */
const facilityKind = (f: Facility) => (f.isExternal ? 'Contracted' : (f.type || '').split('_')[0] || 'Facility');

export const NetworkDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, shiftAssignments, referrals, users, usersById, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

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

  // After every hook: returning earlier changed the hook order once the user loaded.
  if (!user) return null;

  const isAdmin = checkIsAdmin(user);
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

  const FIRST_PAGE = 12;
  const shownFacilities = showAll ? filteredFacilities : filteredFacilities.slice(0, FIRST_PAGE);

  return (
    <div className="max-w-[640px]">
      <ScreenHeader title="Directory">
        <label htmlFor="directory-search" className="sr-only">Search the directory</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-paper/60 lg:text-slate-500 dark:lg:text-white/55" aria-hidden="true" />
          <input
            id="directory-search"
            type="search"
            autoComplete="off"
            placeholder="Name, department or hospital"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowAll(false); }}
            className="min-h-[52px] w-full rounded-[10px] border border-paper/20 bg-paper/10 pl-11 pr-3 text-[16px] text-paper placeholder:text-paper/55 focus:border-paper/50 focus:outline-none focus:ring-2 focus:ring-paper/30 lg:border-slate-300 lg:bg-white lg:text-ink lg:placeholder:text-slate-500 lg:focus:border-info-700 lg:focus:ring-info-700/30 dark:lg:border-white/25 dark:lg:bg-white/5 dark:lg:text-paper"
          />
        </div>
      </ScreenHeader>

      {ownFacilityId && (
        <section aria-labelledby="on-call-now" className="flex flex-col gap-2.5">
          <MicroLabel id="on-call-now">On call right now · your hospital</MicroLabel>
          {onCallNow.length === 0 ? (
            <p className="text-[14.5px] text-slate-700 dark:text-white/65">{q ? 'Nobody on call matches that search.' : 'No on-call staff found.'}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {onCallNow.map(u => (
                <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white py-3 pr-3 pl-[14px] dark:border-white/12 dark:bg-white/[0.05]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-[16px] font-semibold text-ink dark:text-paper">{u.name}</span>
                      <span className="shrink-0 rounded-[5px] bg-success-100 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-success-800 dark:bg-success-900/60 dark:text-success-200">On call</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13.5px] text-slate-700 dark:text-white/65">
                      {ROLE_CONFIGS[u.role]?.label ?? (u.role || '').replace(/_/g, ' ')}{u.department ? ` · ${u.department}` : ''}
                    </p>
                  </div>
                  {u.phoneNumber ? (
                    <a href={`tel:${u.phoneNumber}`} aria-label={`Call ${u.name}`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200">
                      <Phone className="h-5 w-5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="shrink-0 text-[12.5px] text-slate-500 dark:text-white/55">No number</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="network-list" className="mt-6 flex flex-col gap-2.5">
        <MicroLabel id="network-list">Network · {filteredFacilities.length} {filteredFacilities.length === 1 ? 'facility' : 'facilities'}</MicroLabel>
        {loading ? (
          <div className="flex flex-col gap-2.5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : filteredFacilities.length === 0 ? (
          <p className="text-[14.5px] text-slate-700 dark:text-white/65">No facility matches that search.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {shownFacilities.map(f => (
                <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-[14px] py-3 dark:border-white/12 dark:bg-white/[0.05]">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold text-ink dark:text-paper">{f.name}</p>
                    <p className="mt-0.5 truncate text-[13.5px] text-slate-700 dark:text-white/65">{f.location} · {capacityHint(f)}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-[5px] px-2 py-1 text-[10.5px] font-bold uppercase leading-none tracking-[0.06em]',
                    f.isExternal ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' : 'bg-info-100 text-info-800 dark:bg-info-900/60 dark:text-info-200'
                  )}>
                    {facilityKind(f)}
                  </span>
                </li>
              ))}
            </ul>
            {filteredFacilities.length > shownFacilities.length && (
              <button type="button" onClick={() => setShowAll(true)} className="min-h-[48px] rounded-[10px] border border-slate-300 bg-white text-[15px] font-semibold text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10">
                Show all {filteredFacilities.length} facilities
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
};
