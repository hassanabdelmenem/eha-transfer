import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Search, Phone } from 'lucide-react';
import { Input } from '../components/ui/Input';
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
  const { facilities, shiftAssignments, referrals, users, loading } = useData();
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Mobile: 2e directory */}
      <div className="md:hidden -mt-4 -mx-4 space-y-0">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 space-y-3">
          <h1 className="text-lg font-heading font-semibold">Directory</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              className="w-full min-h-[48px] rounded-lg bg-white/10 border border-white/15 pl-10 pr-3 text-sm text-white placeholder:text-white/50 outline-none"
              placeholder="Name, department or hospital"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {ownFacilityId && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">On call right now · your hospital</p>
              {onCallNow.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No on-call staff found.</p>
              ) : onCallNow.map(u => (
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
            </>
          )}

          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 pt-2">Network · {filteredFacilities.length} facilit{filteredFacilities.length === 1 ? 'y' : 'ies'}</p>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : filteredFacilities.map(f => (
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
      </div>

      <div className="hidden md:block space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{canViewNetwork ? 'Network Directory' : 'Hospital Directory'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{canViewNetwork ? 'Global view of facilities and staff.' : 'View departments and on-call staff for your hospital.'}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            className="pl-9"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-6" role="status" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading directory…</span>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      ) : filteredFacilities.length === 0 ? (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400 border-dashed shadow-none">
          {q ? `No facilities or staff match "${searchQuery}".` : 'No facilities to display.'}
        </Card>
      ) : (
      <div className="space-y-6">
        {filteredFacilities.map(facility => (
          <Card key={facility.id} className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50 dark:bg-slate-950 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-slate-900 dark:text-slate-100 text-base truncate">{facility.name}</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{facility.location}</p>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold shrink-0 whitespace-nowrap ${facility.isExternal ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                  {(facility.type || "").replace('_', ' ')}
                </span>

              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Role / Department</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {users.filter(u => {
                      if (!isUserAllowed(u, facility.id)) return false;
                      if (!q) return true;
                      return (
                        u.name.toLowerCase().includes(q) || 
                        (u.department || '').toLowerCase().includes(q) || 
                        (u.role || "").toLowerCase().replace(/_/g, ' ').includes(q)
                      );
                    }).map(u => {
                      let roleDisplay = (u.role || "").replace(/_/g, ' ');
                      if (u.role === 'head_of_department' || ['consultant', 'specialist', 'resident'].includes(u.role)) {
                         roleDisplay += ` (${u.department})`;
                      }
                      
                      let isResponsibleNow = false;
                      if (u.role === 'head_of_department') {
                         const assignment = (shiftAssignments || []).find(s => s.facilityId === facility.id && s.department === u.department);
                         isResponsibleNow = !assignment || !assignment.assignedUserId;
                      } else if (['consultant', 'specialist', 'resident'].includes(u.role)) {
                         const assignment = (shiftAssignments || []).find(s => s.facilityId === facility.id && s.department === u.department);
                         isResponsibleNow = assignment?.assignedUserId === u.id;
                      } else {
                         isResponsibleNow = true;
                      }

                      if (['consultant', 'specialist', 'resident'].includes(u.role) && !isResponsibleNow) return null;

                      return (
                        <React.Fragment key={u.id}>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 capitalize">{roleDisplay}</td>
                            <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{u.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-600">{u.phoneNumber || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {isResponsibleNow ? (
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">ACTIVE ON CALL</span>
                              ) : null}
                            </td>
                          </tr>
                          {u.monthlySchedule && (
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                              <td colSpan={4} className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="font-bold text-xs uppercase mr-2 text-slate-500">Monthly Schedule:</span>
                                {u.monthlySchedule}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {users.filter(u => isUserAllowed(u, facility.id)).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500 dark:text-slate-400 italic">No directory information available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
      </div>
    </div>
  );
};
