import React, { useRef } from 'react';
import { Button } from './Button';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useI18n } from '../../i18n';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * Asks before an action that takes effect at once (discharge frees the bed for
 * the network). Cancel comes first so it takes the initial focus: a stray Enter,
 * or the second click of a double-click, lands on the safe choice.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, body, confirmLabel, onConfirm, onCancel, busy = false }) => {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useDialogA11y(open, onCancel, ref);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={body ? 'confirm-dialog-body' : undefined}
        tabIndex={-1}
        className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_8px_24px_rgba(20,20,19,0.14)] w-full max-w-sm border border-slate-200 dark:border-slate-800"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        {body && <p id="confirm-dialog-body" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{body}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="min-h-[48px]" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="button" className="min-h-[48px] bg-critical-600 hover:bg-critical-700 text-white" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};
