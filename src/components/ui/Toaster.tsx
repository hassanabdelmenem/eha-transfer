import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Toast, dismissToast, subscribeToToasts } from '../../lib/toast';
import { cn } from '../../lib/utils';

const TONE_STYLES: Record<Toast['tone'], string> = {
  error: 'border-l-4 border-l-critical-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
  success: 'border-l-4 border-l-success-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
  info: 'border-l-4 border-l-info-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100',
};

const TONE_ICONS: Record<Toast['tone'], React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const TONE_ICON_COLORS: Record<Toast['tone'], string> = {
  error: 'text-critical-600',
  success: 'text-success-600',
  info: 'text-info-700',
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

  // The live region is always mounted, even with nothing in it.
  //
  // Returning null while empty meant the region and its first message were
  // inserted in the same commit, and screen readers only announce changes to a
  // region that was already in the accessibility tree — so the first toast of a
  // session, typically the one reporting that a write was refused, was silently
  // dropped for exactly the users who cannot see it. `empty:hidden` keeps it out
  // of the layout while it has no children.
  return (
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 print:hidden empty:hidden"
    >
      {toasts.map((toast) => {
        const Icon = TONE_ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-xl shadow-md-lg ring-1 ring-black/5 px-4 py-3',
              TONE_STYLES[toast.tone]
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', TONE_ICON_COLORS[toast.tone])} aria-hidden="true" />
            <p className="flex-1 text-sm leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-xl p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
