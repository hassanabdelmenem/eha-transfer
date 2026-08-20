import React from 'react';
import { Referral } from '../../types';
import { priorityChipClasses } from '../../lib/referralPriority';

/**
 * Desktop master-detail list row -- a compact single-line-per-case row used
 * inside QueueDetailSplit's list column across every queue page (Dashboard,
 * DepartmentPage, ERDashboard, AdminDashboard). `subtitle` carries whatever
 * secondary context is relevant to that queue (department, origin facility,
 * escalation reason, etc.) so this stays a plain rendering component.
 */
export const ReferralQueueRow: React.FC<{
  referral: Referral;
  subtitle: string;
  selected: boolean;
  escalated?: boolean;
  onSelect: () => void;
}> = ({ referral, subtitle, selected, escalated, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-3.5 border-l-4 ${escalated ? 'border-l-critical-600' : 'border-l-transparent'} ${selected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{referral.patientData.name}, {referral.patientData.age}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtitle}</p>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold uppercase whitespace-nowrap ${priorityChipClasses(referral.priority)}`}>
        {referral.priority}
      </span>
    </div>
  </button>
);
