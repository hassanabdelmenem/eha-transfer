import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { Toast, dismissToast, subscribeToToasts } from '../../lib/toast';
import { cn } from '../../lib/utils';

const TONE_STYLES: Record<Toast['tone'], string> = {
  error: 'border-critical-300 bg-critical-50 text-critical-900 dark:border-critical-800 dark:bg-critical-950 dark:text-critical-100',
  success: 'border-success-300 bg-success-50 text-success-900 dark:border-success-700 dark:bg-success-900 dark:text-success-100',
  info: 'border-slate-200 bg-white text-ink dark:border-white/15 dark:bg-slate-900 dark:text-paper',
};

const TONE_ICONS: Record<Toast['tone'], React.ComponentType<{ className?: string }>> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const TONE_ICON_COLORS: Record<Toast['tone'], string> = {
  error: 'text-critical-700 dark:text-critical-300',
  success: 'text-success-700 dark:text-success-300',
  info: 'text-info-700 dark:text-info-300',
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
      // Top on phones: the bottom of every phone screen is a sticky action bar.
      className="fixed z-[120] top-[max(12px,env(safe-area-inset-top))] right-3 left-3 sm:top-auto sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 flex flex-col gap-2 print:hidden empty:hidden"
    >
      {toasts.map((toast) => {
        const Icon = TONE_ICONS[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border py-2 pr-1.5 pl-3.5 shadow-[0_8px_24px_rgba(20,20,19,0.14)]',
              TONE_STYLES[toast.tone]
            )}
          >
            <Icon className={cn('mt-2.5 h-5 w-5 shrink-0', TONE_ICON_COLORS[toast.tone])} aria-hidden="true" />
            <p className="flex-1 py-2 text-[14.5px] font-medium leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
