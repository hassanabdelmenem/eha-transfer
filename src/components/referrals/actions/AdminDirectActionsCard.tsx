import React from 'react';
import { CheckCircle, Clock, ShieldAlert, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Facility, Referral } from '../../../types';

export interface AdminDirectActionsCardProps {
  referral: Referral;
  facilities: Facility[];
  contractedFacilityId: string;
  setContractedFacilityId: (id: string) => void;
  onDirectApprove: () => void;
  onDirectDecline: () => void;
  onDirectPostpone: () => void;
}

export const AdminDirectActionsCard: React.FC<AdminDirectActionsCardProps> = ({
  referral,
  facilities,
  contractedFacilityId,
  setContractedFacilityId,
  onDirectApprove,
  onDirectDecline,
  onDirectPostpone,
}) => {
  return (
    <div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg space-y-3 mb-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-critical-700 dark:text-critical-400 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4" /> System Admin Direct Actions
        </span>
        {referral.isEscalated && (
          <span className="text-xs bg-critical-700 text-white font-semibold px-2 py-0.5 rounded">
            Escalated
          </span>
        )}
      </div>

      {/* Any Facility Transfer option on Approval (System Admin Bypass) */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          Force Move/Transfer to Facility (Bypass Bed Check)
        </label>
        <select
          className="w-full rounded border border-slate-300 dark:border-slate-700 p-2 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          value={contractedFacilityId}
          onChange={(e) => setContractedFacilityId(e.target.value)}
        >
          <option value="">-- Keep Default Destination --</option>
          {facilities
            .filter(f => f.id !== referral.referringFacilityId)
            .map(f => {
              const bedCap = f.capacity?.[referral.requiredBedType] || { total: 0, occupied: 0 };
              return (
                <option key={f.id} value={f.id}>
                  🏥 {f.name} ({bedCap.occupied}/{bedCap.total} {referral.requiredBedType})
                </option>
              );
            })}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <Button
          onClick={onDirectApprove}
          className="bg-success-600 hover:bg-success-700 text-xs py-1.5 min-h-[40px] h-auto"
          title="Direct Approve Referral"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1 shrink-0" /> Approve
        </Button>
        <Button
          onClick={onDirectDecline}
          variant="destructive"
          className="text-xs py-1.5 min-h-[40px] h-auto"
          title="Direct Decline Referral"
        >
          <X className="h-3.5 w-3.5 mr-1 shrink-0" /> Decline
        </Button>
        <Button
          onClick={onDirectPostpone}
          className="bg-warning-600 hover:bg-warning-700 text-white text-xs py-1.5 min-h-[40px] h-auto"
          title="Direct Postpone Referral"
        >
          <Clock className="h-3.5 w-3.5 mr-1 shrink-0" /> Postpone
        </Button>
      </div>
    </div>
  );
};
