import React from 'react';
import { Bed, Minus, Plus } from 'lucide-react';

import { BedType } from '../../types';

interface InteractiveFloorPlanProps {
  capacities: Record<BedType, { total: number; occupied: number }>;
  onCapacityChange: (bedType: BedType | string, field: 'total' | 'occupied', value: number) => void;
}

// Above this count, individual bed tiles become too small to use and the card towers
// over its neighbors in the grid, so large wards get a compact occupancy stepper instead.
const MAX_VISUAL_BEDS = 40;

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({ capacities, onCapacityChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {Object.entries(capacities).map(([bedType, cap]: [string, any]) => {
        const beds = [];
        for (let i = 0; i < cap.total; i++) {
          beds.push(i < cap.occupied);
        }

        const handleBedClick = (isOccupied: boolean) => {
          if (isOccupied) {
            onCapacityChange(bedType, 'occupied', Math.max(0, cap.occupied - 1));
          } else {
            onCapacityChange(bedType, 'occupied', Math.min(cap.total, cap.occupied + 1));
          }
        };

        return (
          <div key={bedType} className="bg-white dark:bg-slate-950 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-1 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{bedType === 'Ward' ? 'Ward' : `${bedType} Ward`}</h3>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <span className="text-emerald-600 dark:text-emerald-400">{cap.total - cap.occupied} Free</span> / {cap.total} Total
              </div>
            </div>

            {cap.total === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[120px]">
                <p className="text-sm">No beds configured</p>
                <button
                  onClick={() => onCapacityChange(bedType, 'total', 1)}
                  className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 px-4 min-h-[40px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Add Bed
                </button>
              </div>
            ) : cap.total > MAX_VISUAL_BEDS ? (
              <div className="flex-1 flex flex-col gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cap.total} beds in this unit — too many to show individually. Use the controls below to adjust occupancy, or Table View to edit exact counts.
                </p>
                <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <button
                    onClick={() => handleBedClick(true)}
                    disabled={cap.occupied <= 0}
                    className="w-10 h-10 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-red-400 hover:text-red-500 disabled:opacity-30 disabled:hover:border-slate-300 disabled:hover:text-slate-600 transition-colors"
                    aria-label="Free one bed"
                    title="Free one bed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[120px]">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{cap.occupied}</span>
                    <span className="text-sm text-slate-400"> / {cap.total} occupied</span>
                  </div>
                  <button
                    onClick={() => handleBedClick(false)}
                    disabled={cap.occupied >= cap.total}
                    className="w-10 h-10 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-500 disabled:opacity-30 disabled:hover:border-slate-300 disabled:hover:text-slate-600 transition-colors"
                    aria-label="Occupy one bed"
                    title="Occupy one bed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => onCapacityChange(bedType, 'total', cap.total + 1)}
                  className="self-start text-xs text-slate-400 hover:text-blue-500 transition-colors"
                >
                  + Add another bed to this unit
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {beds.map((isOccupied, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBedClick(isOccupied)}
                    className={`
                      relative aspect-square rounded-md flex flex-col items-center justify-center transition-all duration-200
                      ${isOccupied 
                        ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-400 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}
                    `}
                    title={`Bed ${idx + 1} - ${isOccupied ? 'Occupied (Tap to free)' : 'Free (Tap to occupy)'}`}
                  >
                    <Bed className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                    {isOccupied && (
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-950 animate-pulse"></span>
                    )}
                  </button>
                ))}
                
                {/* Add new bed button */}
                <button
                  onClick={() => onCapacityChange(bedType, 'total', cap.total + 1)}
                  className="aspect-square rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  title="Add another bed to this unit"
                >
                  <span className="text-xl font-bold">+</span>
                  <span className="text-[9px] uppercase tracking-wider mt-1">Add</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
