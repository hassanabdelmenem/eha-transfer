import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { BedType } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Bed, Save, CheckCircle, Map, Table } from 'lucide-react';
import { InteractiveFloorPlan } from '../components/bed-management/InteractiveFloorPlan';

export const BedManagementPage: React.FC = () => {
  const { user } = useAuth();
  const { facilities, updateFacilityCapacity } = useData();

  if (!user || !['nurse', 'nursing_supervisor', 'head_of_department', 'er_room'].includes(user.role)) {
    return <div className="p-8 text-center text-slate-500">Access Denied. Nursing staff privileges required.</div>;
  }

  const facility = facilities.find(f => f.id === user.facilityId);
  const [capacities, setCapacities] = useState<Record<string, { total: number; occupied: number }>>({});
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');

  useEffect(() => {
    if (facility) {
      setCapacities(facility.capacity as any);
    }
  }, [facility]);

  if (!facility) {
    return <div className="p-8 text-center text-slate-500">Facility configuration missing.</div>;
  }

  const handleCapacityChange = (bedType: string, field: 'total' | 'occupied', value: number) => {
    setCapacities(prev => ({
      ...prev,
      [bedType]: {
        ...prev[bedType],
        [field]: Math.max(0, value)
      }
    }));
  };

  const handleSave = () => {
    updateFacilityCapacity(facility.id, capacities);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 h-full overflow-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Bulk Bed Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quickly update bed availability across {facility.name}.</p>
        </div>
        <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
          {saved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

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
                  
                  let statusColor = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
                  let statusText = 'Available';
                  if (available <= 0) {
                    statusColor = 'text-red-600 bg-red-50 dark:bg-red-900/20';
                    statusText = 'Full';
                  } else if (ratio > 0.8) {
                    statusColor = 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
                    statusText = 'Critical';
                  }

                  return (
                    <tr key={bedType} className="hover:bg-slate-50 dark:bg-slate-900/50">
                      <td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-slate-400" />
                          {bedType}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
                          value={cap.total}
                          onChange={(e) => handleCapacityChange(bedType, 'total', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-20 border border-slate-300 dark:border-slate-700 rounded p-1.5 text-center focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
                          value={cap.occupied}
                          onChange={(e) => handleCapacityChange(bedType, 'occupied', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-2 font-bold text-slate-900 dark:text-slate-100">
                        {available}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${statusColor}`}>
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
    </div>
  );
};
