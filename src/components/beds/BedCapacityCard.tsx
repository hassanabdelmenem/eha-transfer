import React from 'react';
import { Bed, Minus, Plus } from 'lucide-react';
import { BedType } from '../../types';

export interface BedCapacityCardProps {
  bedType: BedType;
  total: number;
  occupied: number;
  onChange: (occupied: number) => void;
  disabled?: boolean;
}

export const BedCapacityCard: React.FC<BedCapacityCardProps> = ({
  bedType,
  total,
  occupied,
  onChange,
  disabled = false,
}) => {
  const safeTotal = Math.max(0, total);
  const safeOccupied = Math.min(safeTotal, Math.max(0, occupied));
  const free = Math.max(0, safeTotal - safeOccupied);
  const ratio = safeTotal > 0 ? free / safeTotal : 0;
  const occupancyPercentage = safeTotal > 0 ? (safeOccupied / safeTotal) * 100 : 0;

  const label = free <= 0 ? 'Full' : ratio < 0.2 ? 'Low' : 'Available';
  const labelColor =
    free <= 0
      ? 'text-critical-600 dark:text-critical-400 bg-critical-50 dark:bg-critical-950/40 border-critical-200 dark:border-critical-800'
      : ratio < 0.2
      ? 'text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40 border-warning-200 dark:border-warning-800'
      : 'text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/40 border-success-200 dark:border-success-800';

  const barColor =
    free <= 0
      ? 'bg-critical-500'
      : ratio < 0.2
      ? 'bg-warning-500'
      : 'bg-success-500';

  return (
    <div
      data-testid={`bed-card-${bedType.toLowerCase()}`}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Bed className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">
              {bedType}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {safeOccupied} of {safeTotal} occupied
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${labelColor}`}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 my-4">
        <button
          type="button"
          onClick={() => onChange(Math.min(safeTotal, safeOccupied + 1))}
          disabled={disabled || safeOccupied >= safeTotal}
          aria-label={`One more ${bedType} bed occupied`}
          className="h-12 w-12 shrink-0 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center px-2">
          <p className="text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
            {free}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            free of {safeTotal}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.max(0, safeOccupied - 1))}
          disabled={disabled || safeOccupied <= 0}
          aria-label={`One fewer ${bedType} bed occupied`}
          className="h-12 w-12 shrink-0 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
          <span>Occupancy</span>
          <span className="tabular-nums font-semibold">{Math.round(occupancyPercentage)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${occupancyPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
