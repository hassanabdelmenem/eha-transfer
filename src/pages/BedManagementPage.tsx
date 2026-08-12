import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bed, Save, CheckCircle, Map, Table } from 'lucide-react';
import { InteractiveFloorPlan } from '../components/bed-management/InteractiveFloorPlan';

export const BedManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, facilitiesById, updateFacilityCapacity } = useData();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(user?.facilityId || '');
  const isAdmin = user?.role === 'owner' || user?.role === 'system_admin';

  const facility = facilitiesById.get(selectedFacilityId || '');
  const [capacities, setCapacities] = useState<Record<BedType, { total: number; occupied: number }>>({} as Record<BedType, { total: number; occupied: number }>);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');

  // Seed the editor only when the selected facility actually changes. Use facilitiesById
  // lookup (O(1)) instead of scanning the array.
  useEffect(() => {
    const selected = facilitiesById.get(selectedFacilityId || '');
    if (selected) {
      setCapacities(selected.capacity as any);
    }
  }, [selectedFacilityId, facilitiesById]);

  if (!user || (!['nurse', 'nursing_supervisor', 'head_of_department', 'er_room'].includes(user.role) && !isAdmin)) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Nursing staff privileges required.</div>;
  }

  if (!user.facilityId && !isAdmin) {
    return <div className="p-8 text-center text-slate-500">Facility configuration missing.</div>;
  }

  const handleCapacityChange = (bedType: string, field: 'total' | 'occupied', value: number) => {
    setCapacities(prev => ({
      ...prev,
      [bedType]: {
        // InteractiveFloorPlan's onCapacityChange is typed `BedType | string`,
        // so the key arrives widened and has to be narrowed to index the record.
        ...prev[bedType as BedType],
        [field]: Math.max(0, value)
      }
    }));
  };

  const handleSave = () => {
    if (!facility) return;
    updateFacilityCapacity(facility.id, capacities);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 h-full overflow-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bulk Bed Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quickly update bed availability across {facility?.name || 'the facility'}.</p>
        </div>
        {facility && (
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            {saved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saved ? 'Saved' : 'Save Changes'}
          </Button>
        )}
      </div>

      {isAdmin && (
        <Card className="mb-6 border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label htmlFor="bedMgmtFacility" className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">Admin View:</label>
            <select
              id="bedMgmtFacility"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="flex-1 rounded border border-slate-300 dark:border-slate-700 p-2 text-sm focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-[40px]"
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
          <div className="flex items-center gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-max">
        <button
          onClick={() => setViewMode('visual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'visual' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Map className="w-4 h-4" />
          Floor Plan
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          <Table className="w-4 h-4" />
          Table View
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{viewMode === 'table' ? 'Unit Capacities (Table)' : 'Interactive Floor Plan'}</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'visual' ? (
            <InteractiveFloorPlan capacities={capacities as Record<string, { total: number; occupied: number }>} onCapacityChange={handleCapacityChange} />
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Bed Type</th>
                  <th className="px-4 py-3">Total Beds</th>
                  <th className="px-4 py-3">Occupied</th>
                  <th className="px-4 py-3">Available</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(capacities).map(([bedType, cap]: [string, any]) => {
                  const available = cap.total - cap.occupied;
                  const ratio = cap.total > 0 ? cap.occupied / cap.total : 0;
                  
                  let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
                  let statusText = 'Available';
                  if (cap.total <= 0) {
                    statusColor = 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800';
                    statusText = 'Not Configured';
                  } else if (available <= 0) {
                    statusColor = 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
                    statusText = 'Full';
                  } else if (ratio > 0.8) {
                    statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
                    statusText = 'Critical';
                  }

                  return (
                    <tr key={bedType} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-slate-400" />
                          {bedType}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          value={cap.total}
                          onChange={(e) => handleCapacityChange(bedType, 'total', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          value={cap.occupied}
                          onChange={(e) => handleCapacityChange(bedType, 'occupied', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100">
                        {available}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase whitespace-nowrap ${statusColor}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </CardContent>
      </Card>
        </>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
          Please select a facility above to manage beds.
        </Card>
      )}
    </div>
  );
};
