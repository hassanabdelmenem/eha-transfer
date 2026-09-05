import React from 'react';
import { UserCheck, UserX } from 'lucide-react';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { Facility } from '../../../types';

export interface PatientConsentCardProps {
  toFacility?: Partial<Facility> & { name: string };
  showDeclineForm: boolean;
  setShowDeclineForm: (show: boolean) => void;
  declineReason: string;
  setDeclineReason: (reason: string) => void;
  consentBusy: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

export const PatientConsentCard: React.FC<PatientConsentCardProps> = ({
  toFacility,
  showDeclineForm,
  setShowDeclineForm,
  declineReason,
  setDeclineReason,
  consentBusy,
  onConsent,
  onDecline,
}) => {
  return (
    <div className="relative p-3 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-500 rounded-lg space-y-3 shadow-sm">
      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
        <UserCheck className="w-4 h-4" /> Patient Consent
      </span>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Confirm with the patient before dispatch: did they agree to transfer to {toFacility?.name || 'this facility'}?
      </p>
      {!showDeclineForm ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onConsent}
            disabled={consentBusy}
            className="bg-success-600 hover:bg-success-700 text-xs py-1.5 min-h-[40px]"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1 shrink-0" /> Accepted Transfer
          </Button>
          <Button
            onClick={() => setShowDeclineForm(true)}
            disabled={consentBusy}
            variant="destructive"
            className="text-xs py-1.5 min-h-[40px]"
          >
            <UserX className="h-3.5 w-3.5 mr-1 shrink-0" /> Declined This Facility
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <VoiceTextarea
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
            placeholder="Reason the patient declined (optional)... (Click mic to dictate)"
            value={declineReason}
            onValueChange={setDeclineReason}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => {
                setShowDeclineForm(false);
                setDeclineReason('');
              }}
              variant="ghost"
              className="text-xs min-h-[40px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onDecline}
              disabled={consentBusy}
              variant="destructive"
              className="text-xs min-h-[40px]"
            >
              Confirm Decline & Re-route
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
