import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BedType } from '../types';

const PRIORITY_LABEL: Record<string, string> = { emergency: 'E', urgent: 'U', routine: 'R' };
const PRIORITY_DOT: Record<string, string> = { emergency: 'bg-red-500', urgent: 'bg-amber-500', routine: 'bg-blue-500' };

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { referrals, facilities } = useData();

  if (!user || (user.role !== 'system_admin' && user.role !== 'owner')) {
    return <div className="p-8">Access Denied. Admin privileges required.</div>;
  }

  // A referral counts against a facility once it is claimed *or* while it is still
  // auto-routing and this facility is one of the notified candidates -- auto-route is
  // the default, so matching only on receivingFacilityId showed an empty waitlist
  // even with unclaimed emergencies pending.
  const isAwaitingAt = (r: (typeof referrals)[number], facilityId: string) =>
    (r.receivingFacilityId === facilityId ||
      (r.receivingFacilityId === 'auto' && r.candidateFacilityIds?.includes(facilityId))) &&
    !['admitted', 'discharged', 'rejected', 'cancelled'].includes(r.status);

  // Calculate waitlists (pending/approved but not admitted/rejected) for each bed type in each facility
  const getWaitlist = (facilityId: string, bedType: BedType) => {
    return referrals.filter(r => isAwaitingAt(r, facilityId) && r.requiredBedType === bedType);
  };

  const calculateTotalCapacity = () => {
    const totals: Record<BedType, { total: number; occupied: number; available: number }> = {
      ICU: { total: 0, occupied: 0, available: 0 },
      CCU: { total: 0, occupied: 0, available: 0 },
      PICU: { total: 0, occupied: 0, available: 0 },
      Ward: { total: 0, occupied: 0, available: 0 }
    };

    facilities.filter(f => f.type !== 'primary_care').forEach(facility => {
      (['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).forEach(bed => {
        const cap = facility.capacity[bed];
        if (cap) {
          totals[bed].total += cap.total;
          totals[bed].occupied += cap.occupied;
          totals[bed].available += (cap.total - cap.occupied);
        }
      });
    });

    return totals;
  };

  const globalTotals = calculateTotalCapacity();

  return (
    <div className="space-y-6 pb-16 h-full overflow-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">System Administrator Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Global view of all facilities, bed capacities, and active waitlists.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => (
          <Card key={bed} className="border border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">{bed} Total Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${globalTotals[bed].available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {globalTotals[bed].available}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">/ {globalTotals[bed].total}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {facilities.filter(f => f.type !== 'primary_care').map(facility => (
            <Card key={facility.id} className="overflow-hidden">
              <CardHeader className="bg-slate-900 text-white pb-4">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="text-white text-sm min-w-0 truncate">{facility.name}</CardTitle>
                  <span className="text-xs bg-blue-800 px-2 py-0.5 rounded uppercase shrink-0 whitespace-nowrap">{facility.type.replace('_', ' ')}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Bed Type</th>
                        <th className="px-4 py-3 text-center">Capacity</th>
                        <th className="px-4 py-3 text-center">Occupied</th>
                        <th className="px-4 py-3 text-center">Available</th>
                        <th className="px-4 py-3 text-right">Waitlist (Active)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(['ICU', 'CCU', 'PICU', 'Ward'] as BedType[]).map(bed => {
                        const cap = facility.capacity[bed];
                        if (!cap || cap.total === 0) return null;
                        const available = cap.total - cap.occupied;
                        const waitlist = getWaitlist(facility.id, bed);
                        const isFull = available <= 0;
                        const isCritical = waitlist.length > available;
    
                        return (
                          <tr key={bed} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{bed}</td>
                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{cap.total}</td>
                            <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{cap.occupied}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${isFull ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'}`}>
                                {available}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${isCritical ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                {waitlist.length} Waiting
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Waitlist details for this facility */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Waitlist Details by Department</h4>
                  {(() => {
                    const rows = facility.departments.map(dept => {
                      const deptWaitlist = referrals.filter(r =>
                        isAwaitingAt(r, facility.id) && r.receivingDepartments.includes(dept)
                      );
                      if (deptWaitlist.length === 0) return null;

                      return (
                        <div key={dept} className="flex justify-between items-center py-1 text-xs border-b border-slate-200 dark:border-slate-800 last:border-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{dept}</span>
                          <div className="flex gap-1">
                            {deptWaitlist.map(r => (
                              <Link
                                key={r.id}
                                to={`/referrals/${r.id}`}
                                title={`${r.priority.toUpperCase()} - ${r.requiredBedType}`}
                                aria-label={`${r.priority} priority ${r.requiredBedType} referral — open referral`}
                                className="w-10 h-10 flex items-center justify-center hover:opacity-80 transition-opacity"
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${PRIORITY_DOT[r.priority] || 'bg-blue-500'}`}>
                                  {PRIORITY_LABEL[r.priority] || '?'}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }).filter(Boolean);

                    return rows.length > 0
                      ? rows
                      : <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">No active waitlist for this facility.</p>;
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
};
