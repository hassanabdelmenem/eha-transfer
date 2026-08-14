import React from 'react';
import { Facility, BedType } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface BedOccupancyHeatmapProps {
  facilities: Facility[];
}

const BED_TYPES: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];

export const BedOccupancyHeatmap: React.FC<BedOccupancyHeatmapProps> = ({ facilities }) => {
  const getOccupancyColor = (total: number, occupied: number) => {
    if (total === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-400';
    const pct = occupied / total;
    // Three occupancy tiers need three distinct colors — red and amber used
    // to render as the same brand orange, so a 95%-full facility and a
    // 75%-full one looked identical on this heatmap.
    if (pct >= 0.9) return 'bg-critical-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border-critical-600';
    if (pct >= 0.7) return 'bg-warning-400 text-warning-950 border-warning-500';
    return 'bg-success-400 text-success-950 border-success-500';
  };

  // Filter facilities that actually have some capacity defined
  const displayFacilities = facilities.filter(f => 
    f.type !== 'primary_care' && 
    BED_TYPES.some(bed => f.capacity[bed] && f.capacity[bed].total > 0)
  );

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col mt-6">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4">
        <CardTitle className="text-sm font-bold uppercase text-slate-700 dark:text-slate-300">
          Network Bed Occupancy Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-auto">
        {displayFacilities.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400 dark:text-slate-500 italic">
            No facilities have bed capacity configured yet.
          </p>
        ) : (
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs">
            <tr>
              <th className="p-3 border-b border-slate-100 dark:border-slate-800">Facility</th>
              {BED_TYPES.map(bed => (
                <th key={bed} className="p-3 border-b border-slate-100 dark:border-slate-800 text-center">{bed}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {displayFacilities.map(facility => (
              <tr key={facility.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <td className="p-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {facility.name}
                  <div className="text-xs text-slate-400 font-normal capitalize">{facility.type.replace('_', ' ')}</div>
                </td>
                {BED_TYPES.map(bed => {
                  const cap = facility.capacity[bed];
                  if (!cap || cap.total === 0) {
                    return (
                      <td key={bed} className="p-2 text-center">
                        <div className="w-full h-full min-h-[32px] rounded flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-slate-300 dark:text-slate-600 text-xs">
                          -
                        </div>
                      </td>
                    );
                  }
                  
                  const pct = Math.round((cap.occupied / cap.total) * 100);
                  const colorClass = getOccupancyColor(cap.total, cap.occupied);
                  
                  return (
                    <td key={bed} className="p-2 text-center">
                      <div className={`w-full h-full min-h-[36px] rounded border flex flex-col items-center justify-center p-1 transition-all ${colorClass}`}>
                        <span className="font-bold">{pct}%</span>
                        <span className="text-xs opacity-80">{cap.occupied}/{cap.total}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </CardContent>
    </Card>
  );
};
