import React from 'react';
import { Facility, BedType } from '../../types';
import { capacityTone } from '../../lib/capacityTone';
import { cn } from '../../lib/utils';

interface BedOccupancyHeatmapProps {
  facilities: Facility[];
}

const BED_TYPES: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];

const LEGEND = [
  { label: 'Full', swatch: 'bg-critical-100 border-critical-300 dark:bg-critical-900/70 dark:border-critical-700' },
  { label: 'Under 20% free', swatch: 'bg-warning-100 border-warning-300 dark:bg-warning-900/70 dark:border-warning-700' },
  { label: 'Beds free', swatch: 'bg-success-100 border-success-300 dark:bg-success-800/80 dark:border-success-600' },
];

/**
 * Free beds per unit across the network. Each cell states "free / total" and
 * is tinted on the same thresholds as the free-bed bars (lib/capacityTone),
 * so the tint repeats what the number already says.
 */
export const BedOccupancyHeatmap: React.FC<BedOccupancyHeatmapProps> = ({ facilities }) => {
  const displayFacilities = facilities.filter(
    f => f.type !== 'primary_care' && BED_TYPES.some(bed => f.capacity[bed] && f.capacity[bed].total > 0)
  );

  return (
    <section aria-labelledby="network-free-beds" className="rounded-xl border border-slate-200 bg-white dark:border-white/12 dark:bg-white/[0.05]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 px-[14px] pt-[14px]">
        <div>
          <h3 id="network-free-beds" className="font-heading text-[17px] font-semibold tracking-[-0.01em] text-ink dark:text-paper">
            Free beds across the network
          </h3>
          <p className="mt-0.5 text-[13px] text-slate-700 dark:text-white/65">Free of total, per unit · tertiary and district hospitals</p>
        </div>
        {displayFacilities.length > 0 && (
          <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-slate-700 dark:text-white/70" aria-label="Legend">
            {LEGEND.map(l => (
              <li key={l.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('h-3 w-3 rounded-[3px] border', l.swatch)} />
                {l.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {displayFacilities.length === 0 ? (
        <p className="px-[14px] pt-3 pb-[14px] text-[14px] text-slate-700 dark:text-white/65">
          No facilities have bed capacity configured yet.
        </p>
      ) : (
        <div className="overflow-x-auto px-[14px] pt-3 pb-[14px]">
          <table className="w-full border-separate border-spacing-[3px] text-left">
            <thead>
              <tr>
                <th scope="col" className="pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60">
                  <span className="sr-only">Facility</span>
                </th>
                {BED_TYPES.map(bed => (
                  <th key={bed} scope="col" className="w-[46px] pb-1 text-center min-[420px]:w-[54px] text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60">
                    {bed}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayFacilities.map(facility => (
                <tr key={facility.id}>
                  <th scope="row" className="pr-2 align-middle font-normal">
                    <span className="block text-[13.5px] font-semibold leading-tight break-words text-ink dark:text-paper">{facility.name}</span>
                    <span className="block text-[12px] capitalize leading-tight text-slate-500 dark:text-white/60">{(facility.type || '').replace('_', ' ')}</span>
                  </th>
                  {BED_TYPES.map(bed => {
                    const cap = facility.capacity[bed];
                    if (!cap || cap.total === 0) {
                      return (
                        <td key={bed} className="h-11 rounded-md text-center text-[13px] text-slate-400 dark:text-white/30">
                          <span aria-hidden="true">·</span>
                          <span className="sr-only">No {bed} unit</span>
                        </td>
                      );
                    }
                    const free = Math.max(0, cap.total - cap.occupied);
                    const tone = capacityTone(free, cap.total);
                    return (
                      <td
                        key={bed}
                        title={`${facility.name} ${bed}: ${free} of ${cap.total} free, ${cap.occupied} occupied`}
                        className={cn('h-11 rounded-md text-center text-[13.5px] font-semibold tabular-nums', tone.tint)}
                      >
                        {free}<span className="font-normal opacity-75">/{cap.total}</span>
                        <span className="sr-only"> free{tone.level === 'full' ? ', full' : tone.level === 'low' ? ', under 20% free' : ''}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
