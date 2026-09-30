import React from 'react';
import { UserCheck, UserX } from 'lucide-react';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';
import { Facility } from '../../../types';
import { useI18n } from '../../../i18n';

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
  const { t } = useI18n();
  return (
    <div className="relative p-3 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 dark:border-blue-500 rounded-lg space-y-3">
      <span className="absolute -top-1.5 -end-1.5 flex h-3 w-3">
        <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
        <UserCheck className="w-4 h-4" /> {t('consent.title')}
      </span>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {t('consent.question', { facility: toFacility?.name || t('consent.thisFacility') })}
      </p>
      {!showDeclineForm ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onConsent}
            disabled={consentBusy}
            className="bg-success-600 hover:bg-success-700 text-xs py-1.5"
          >
            <UserCheck className="h-3.5 w-3.5 me-1 shrink-0" /> {t('consent.accepted')}
          </Button>
          <Button
            onClick={() => setShowDeclineForm(true)}
            disabled={consentBusy}
            variant="destructive"
            className="text-xs py-1.5"
          >
            <UserX className="h-3.5 w-3.5 me-1 shrink-0" /> {t('consent.declined')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <VoiceTextarea
            dir="auto"
            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm focus:ring-1 focus:ring-blue-500 min-h-[60px]"
            placeholder={t('consent.placeholder')}
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
              className="text-xs"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={onDecline}
              disabled={consentBusy}
              variant="destructive"
              className="text-xs"
            >
              {t('consent.confirm')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
