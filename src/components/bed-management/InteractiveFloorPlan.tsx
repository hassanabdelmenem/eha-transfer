import React from 'react';
import { Bed } from 'lucide-react';

interface InteractiveFloorPlanProps {
  capacities: Record<string, { total: number; occupied: number }>;
  onCapacityChange: (bedType: string, field: 'total' | 'occupied', value: number) => void;
}

export const InteractiveFloorPlan: React.FC<InteractiveFloorPlanProps> = ({ capacities, onCapacityChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {Object.entries(capacities).map(([bedType, cap]: [string, { total: number; occupied: number }]) => {
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
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{bedType} Ward</h3>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                <span className="text-emerald-600 dark:text-emerald-400">{cap.total - cap.occupied} Free</span> / {cap.total} Total
              </div>
            </div>
            
            {cap.total === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[120px]">
                <p className="text-sm">No beds configured</p>
                <button 
                  onClick={() => onCapacityChange(bedType, 'total', 1)}
                  className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Add Bed
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
