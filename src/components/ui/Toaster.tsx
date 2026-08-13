import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Toast, dismissToast, subscribeToToasts } from '../../lib/toast';
import { cn } from '../../lib/utils';

const TONE_STYLES: Record<Toast['tone'], string> = {
  error: 'border-l-4 border-l-red-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
  success: 'border-l-4 border-l-green-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
  info: 'border-l-4 border-l-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
};

const TONE_ICONS: Record<Toast['tone'], React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const TONE_ICON_COLORS: Record<Toast['tone'], string> = {
  error: 'text-red-600',
  success: 'text-green-600',
  info: 'text-blue-700',
};

/**
 * Renders the toast bus. Mounted once, above the router, so it covers screens
 * that live outside AppLayout (Login, Onboarding, PendingVerification) as well as
 * the authenticated shell.
 *
 * The live region is polite rather than assertive: these announce the outcome of
 * an action the user just took, so interrupting a screen reader mid-sentence is
 * not warranted. Errors are not auto-dismissed silently without also being
 * dismissable by keyboard -- hence the explicit close button on each.
 */
export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 print:hidden"
    >
      {toasts.map((toast) => {
        const Icon = TONE_ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded shadow-lg ring-1 ring-black/5 px-4 py-3',
              TONE_STYLES[toast.tone]
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', TONE_ICON_COLORS[toast.tone])} aria-hidden="true" />
            <p className="flex-1 text-sm leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
