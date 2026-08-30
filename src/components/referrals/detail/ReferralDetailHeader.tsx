import React from 'react';
import { ArrowLeft, Check, Copy, Printer, ShieldAlert } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Referral } from '../../../types';
import { STAGE_LABELS, stageIndexForStatus } from '../../../lib/referralStage';

export type BannerTint = 'info' | 'success' | 'critical' | 'warning';

export const BANNER_TINT_CLASSES: Record<BannerTint, string> = {
  info: 'bg-info-100 text-info-800 border-info-300 dark:bg-info-900/30 dark:text-info-300 dark:border-info-800',
  success: 'bg-success-100 text-success-800 border-success-300 dark:bg-success-900/30 dark:text-success-300 dark:border-success-800',
  critical: 'bg-critical-100 text-critical-800 border-critical-300 dark:bg-critical-900/30 dark:text-critical-300 dark:border-critical-800',
  warning: 'bg-warning-100 text-warning-800 border-warning-300 dark:bg-warning-900/30 dark:text-warning-300 dark:border-warning-800',
};

export const StageRail: React.FC<{ status: Referral['status'] }> = ({ status }) => {
  const currentIndex = stageIndexForStatus(status);
  const isException = currentIndex === null;
  return (
    <div className="flex items-stretch gap-1" role="img" aria-label={`Stage: ${status.replace(/_/g, ' ')}`}>
      {STAGE_LABELS.map((label, i) => {
        const done = !isException && i < (currentIndex as number);
        const current = !isException && i === currentIndex;
        return (
          <div key={label} className="flex-1 min-w-0">
            <div
              className={`h-1.5 rounded-full ${
                current ? 'bg-white' : done ? 'bg-success-400' : isException ? 'bg-critical-500/60' : 'bg-white/22'
              }`}
            />
            <p
              className={`mt-1 text-[10px] font-bold truncate ${
                current ? 'text-white' : 'text-white/62'
              }`}
            >
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export interface ReferralDetailHeaderProps {
  referral: Referral;
  copied: boolean;
  onCopyId: () => void;
  onToggleEscalation: () => void;
  onPrint: () => void;
  onBack: () => void;
  mobileBanner: { label: string; tint: BannerTint };
  roleVariant: 'dept-head' | 'manager' | 'er-room' | 'nurse' | 'clinician' | null;
  roleVariantLabel?: string;
}

export const ReferralDetailHeader: React.FC<ReferralDetailHeaderProps> = ({
  referral,
  copied,
  onCopyId,
  onToggleEscalation,
  onPrint,
  onBack,
  mobileBanner,
  roleVariant,
  roleVariantLabel,
}) => {
  return (
    <>
      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold text-gray-900">Referral Details</h1>
        <p className="text-sm text-gray-500 font-mono">ID: {referral.id}</p>
      </div>

      {/* Modern interactive executive header card */}
      <div className="-mt-4 sm:mt-0 -mx-3.5 sm:mx-0 sm:rounded-xl sm:overflow-hidden print:hidden">
        <div className="bg-slate-950 text-white px-4 pt-4 pb-4 sm:px-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                aria-label="Go back"
                className="h-11 w-11 -ml-2 shrink-0 flex items-center justify-center rounded text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-heading font-semibold truncate">
                  {referral.patientData.name || 'Unknown patient'}, {referral.patientData.age}
                </h1>
                <div className="flex items-center gap-1 min-w-0">
                  <p className="text-xs text-white/60 truncate">
                    {referral.patientData.hospitalId} · {referral.requiredBedType} · {referral.priority} · ID: {referral.id}
                  </p>
                  <button
                    type="button"
                    onClick={onCopyId}
                    aria-label="Copy referral ID"
                    className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-success-400" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                  </button>
                  <span className="sr-only" role="status">{copied ? 'Referral ID copied to clipboard' : ''}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={referral.isEscalated ? "destructive" : "outline"}
                className={referral.isEscalated ? "bg-critical-600 text-white hover:bg-critical-700" : "bg-white/10 border-white/25 text-white hover:bg-white/20"}
                onClick={onToggleEscalation}
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/25 text-white hover:bg-white/20"
                onClick={onPrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Generate PDF Summary
              </Button>
            </div>
          </div>
          <StageRail status={referral.status} />
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={onToggleEscalation}
              className={`flex-1 min-h-[44px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                referral.isEscalated ? 'bg-critical-600 text-white' : 'border border-white/25 text-white'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {referral.isEscalated ? 'De-escalate' : 'Mark Escalated'}
            </button>
            <button
              onClick={onPrint}
              className="flex-1 min-h-[44px] rounded-lg border border-white/25 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF Summary
            </button>
          </div>
        </div>
        <div className={`px-4 sm:px-6 py-3 border-b text-xs font-bold ${BANNER_TINT_CLASSES[mobileBanner.tint]}`}>
          {mobileBanner.label}
        </div>
        {roleVariant && roleVariantLabel && (
          <div className="sm:hidden px-4 py-2 bg-slate-900 border-t border-white/10">
            <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-white/10 text-white/80 text-[11px] font-bold">
              Viewing as {roleVariantLabel}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
