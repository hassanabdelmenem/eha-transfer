import React from 'react';
import { Referral } from '../../types';
import { ShieldAlert, Phone, ArrowRight } from 'lucide-react';
import { EscalationAlertBannerProps } from './types';

const ESCALATION_LABELS: Record<string, string> = {
  no_beds_available: 'No beds available',
  no_matching_facility: 'No matching facility',
  sla_breach: 'SLA breach',
  requirements_needed: 'Requirements needed',
  manual: 'Manual escalation',
};

export const EscalationAlertBanner: React.FC<EscalationAlertBannerProps> = ({
  referral,
  onAction,
  actionLabel = 'Review now',
  referrerPhone,
  referringFacilityName,
}) => {
  const since = referral.escalatedAt || referral.createdAt;
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(since)) / 60000));
  const reasonKey = referral.escalationReason || 'manual';
  const reasonText = ESCALATION_LABELS[reasonKey] || reasonKey.replace(/_/g, ' ');

  return (
    <div
      role="region"
      aria-label="Critical Escalation Alert"
      aria-live="polite"
      className="rounded-2xl border-2 border-critical-600 bg-critical-50 dark:bg-critical-950/50 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="bg-critical-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 animate-pulse shrink-0" />
          <span>CRITICAL ESCALATION · {reasonText.toUpperCase()} ({mins} MIN OVERDUE)</span>
        </div>
        <span className="font-mono text-[11px] bg-critical-700 px-2 py-0.5 rounded text-white/90">
          MRN: {referral.patientData.hospitalId}
        </span>
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {referral.patientData.name}, {referral.patientData.age}y
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-critical-100 dark:bg-critical-900/60 text-critical-800 dark:text-critical-300">
              {referral.priority}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.requiredBedType} Bed</span>
            {referral.receivingDepartments && referral.receivingDepartments.length > 0 && (
              <span> · {referral.receivingDepartments.join(', ')}</span>
            )}
            {referringFacilityName && <span> · From {referringFacilityName}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {referrerPhone && (
            <a
              href={`tel:${referrerPhone}`}
              aria-label="Call referring facility"
              className="min-h-[48px] min-w-[48px] px-3 flex items-center justify-center gap-1.5 rounded-xl border-2 border-critical-600 text-critical-700 dark:text-critical-300 hover:bg-critical-100 dark:hover:bg-critical-900/40 font-bold text-xs transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden md:inline">Call Referrer</span>
            </a>
          )}
          {onAction && (
            <button
              type="button"
              onClick={() => onAction(referral)}
              className="min-h-[48px] px-5 rounded-xl bg-critical-600 hover:bg-critical-700 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
