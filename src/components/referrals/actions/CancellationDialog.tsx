import React from 'react';
import { Ban } from 'lucide-react';
import { Button } from '../../ui/Button';
import { VoiceTextarea } from '../../ui/VoiceTextarea';

export interface CancellationDialogProps {
  canCancel: boolean;
  showCancelConfirm: boolean;
  setShowCancelConfirm: (show: boolean) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  cancelError: string;
  setCancelError: (error: string) => void;
  cancelBusy: boolean;
  onConfirmCancel: () => void;
}

export const CancellationDialog: React.FC<CancellationDialogProps> = ({
  canCancel,
  showCancelConfirm,
  setShowCancelConfirm,
  cancelReason,
  setCancelReason,
  cancelError,
  setCancelError,
  cancelBusy,
  onConfirmCancel,
}) => {
  if (!canCancel) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
      {!showCancelConfirm ? (
        <button
          type="button"
          onClick={() => {
            setShowCancelConfirm(true);
            setCancelError('');
          }}
          className="w-full flex items-center justify-center gap-2 min-h-[40px] rounded border border-critical-200 dark:border-critical-900 text-critical-600 dark:text-critical-400 text-xs font-semibold hover:bg-critical-50 dark:hover:bg-critical-950/30 transition-colors"
        >
          <Ban className="w-3.5 h-3.5" /> Cancel Referral
        </button>
      ) : (
        <div className="p-3 bg-critical-50 dark:bg-critical-950/30 border border-critical-200 dark:border-critical-900 rounded-lg space-y-3">
          <p className="text-xs font-semibold text-critical-700 dark:text-critical-400">
            This withdraws the referral and archives it with its full history. This cannot be undone once confirmed.
          </p>
          <VoiceTextarea
            className="w-full rounded border border-critical-200 dark:border-critical-900 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-2 text-sm min-h-[50px]"
            placeholder="Reason for cancellation (mandatory)... (Click mic to dictate)"
            value={cancelReason}
            onValueChange={setCancelReason}
          />
          {cancelError && <p className="text-xs text-critical-600 dark:text-critical-400">{cancelError}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => {
                setShowCancelConfirm(false);
                setCancelReason('');
                setCancelError('');
              }}
              variant="ghost"
              className="text-xs min-h-[40px]"
            >
              Keep Referral
            </Button>
            <Button
              type="button"
              onClick={onConfirmCancel}
              disabled={cancelBusy || !cancelReason.trim()}
              variant="destructive"
              className="text-xs min-h-[40px]"
            >
              {cancelBusy ? 'Cancelling…' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
