import React from 'react';
import { Referral, BedType } from '../../types';
import { Badge } from '../ui/Badge';
import { HeartPulse, ArrowRight, UserCheck, Clock, Hospital } from 'lucide-react';

export interface ArrivedTransfersQueueProps {
  referrals: Referral[];
  onAdmit: (referralId: string) => Promise<void> | void;
  admittingId?: string | null;
  facilityNameMap?: Map<string, string>;
}

export const ArrivedTransfersQueue: React.FC<ArrivedTransfersQueueProps> = ({
  referrals,
  onAdmit,
  admittingId = null,
  facilityNameMap,
}) => {
  if (referrals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-warning-500 animate-pulse" />
          Arrived · waiting to be admitted ({referrals.length})
        </h2>
      </div>

      <div className="space-y-2.5">
        {referrals.map((r) => {
          const patientName = r.patientData?.name || 'Unknown patient';
          const age = r.patientData?.age ?? 0;
          const bedType: BedType = r.requiredBedType || 'Ward';
          const isBusy = admittingId === r.id;
          const originFacility =
            (facilityNameMap && facilityNameMap.get(r.referringFacilityId)) ||
            r.referringFacilityId ||
            'Referring Facility';

          return (
            <div
              key={r.id}
              data-testid={`arrived-referral-${r.id}`}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="min-w-0 space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Exact text format `${patientName}, ${age}` for Playwright E2E assertion */}
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {patientName}, {age}
                  </p>
                  <Badge
                    variant={
                      r.priority === 'emergency'
                        ? 'danger'
                        : r.priority === 'urgent'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {r.priority.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    HID: {r.patientData?.hospitalId || 'N/A'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Arrived · waiting to be admitted
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap pt-1">
                  <span className="flex items-center gap-1">
                    <Hospital className="w-3.5 h-3.5 text-slate-400" />
                    From: <strong className="text-slate-700 dark:text-slate-200">{originFacility}</strong>
                  </span>
                  {r.patientData?.vitalSigns && (
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded text-[11px] font-mono">
                      <HeartPulse className="w-3 h-3 text-critical-500" />
                      HR: {r.patientData.vitalSigns.hr ?? '--'} | BP: {r.patientData.vitalSigns.bp || '--'} | SpO2: {r.patientData.vitalSigns.spo2 ? `${r.patientData.vitalSigns.spo2}%` : '--'}
                    </span>
                  )}
                  {r.patientData?.diagnosis && (
                    <span className="truncate max-w-xs text-slate-500">
                      Dx: {r.patientData.diagnosis}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Allocated Unit
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {bedType}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onAdmit(r.id)}
                  disabled={isBusy}
                  className="min-h-[48px] px-5 rounded-xl bg-success-600 hover:bg-success-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  <UserCheck className="w-4 h-4" />
                  {/* Exact text: "Admit to {bedType} bed" matches /Admit to (ICU|CCU|PICU|Ward) bed/i */}
                  Admit to {bedType} bed
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
