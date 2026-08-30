import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface RejectionModalProps {
  isOpen: boolean;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  rejectError: string;
  setRejectError: (error: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  rejectionReason,
  setRejectionReason,
  rejectError,
  setRejectError,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Reject Transfer"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-lg w-full max-w-md relative border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reject Transfer</h2>
          <button
            type="button"
            aria-label="Close rejection dialog"
            onClick={() => {
              onClose();
              setRejectError('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {rejectError && (
          <p className="text-xs text-critical-600 dark:text-critical-400 mb-3 font-medium">
            {rejectError}
          </p>
        )}
        <textarea
          id="rejectionReasonInput"
          className="w-full border rounded p-2 mb-4 dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-1 focus:ring-critical-500 outline-none"
          rows={3}
          placeholder="Reason for rejection (e.g. Bed capacity exhausted, clinical mismatch)..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onClose();
              setRejectError('');
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!rejectionReason.trim() || isSubmitting}
            variant="destructive"
          >
            Confirm Rejection
          </Button>
        </div>
      </div>
    </div>
  );
};
