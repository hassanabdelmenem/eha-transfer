import React from 'react';
import { Phone } from 'lucide-react';

export type FooterAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  className: string;
};

export interface MobileActionFooterProps {
  footerPrimary: FooterAction | null;
  footerSecondary: FooterAction | null;
  footerCallNumber?: string;
}

export const MobileActionFooter: React.FC<MobileActionFooterProps> = ({
  footerPrimary,
  footerSecondary,
  footerCallNumber,
}) => {
  if (!footerPrimary) return null;

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-2 shadow-[0_-2px_12px_rgba(20,20,19,.08)]">
      <button
        type="button"
        onClick={footerPrimary.onClick}
        disabled={footerPrimary.disabled}
        className={`w-full h-[60px] rounded-xl text-lg font-bold shadow-md disabled:opacity-50 disabled:pointer-events-none ${footerPrimary.className}`}
      >
        {footerPrimary.label}
      </button>
      {footerPrimary.disabled && footerPrimary.disabledReason && (
        <p className="text-xs text-critical-600 dark:text-critical-400 text-center">
          {footerPrimary.disabledReason}
        </p>
      )}
      {(footerSecondary || footerCallNumber) && (
        <div className="flex items-center gap-2">
          {footerSecondary && (
            <button
              type="button"
              onClick={footerSecondary.onClick}
              className={`flex-1 h-14 rounded-xl text-sm font-bold shadow-sm ${footerSecondary.className}`}
            >
              {footerSecondary.label}
            </button>
          )}
          {footerCallNumber && (
            <a
              href={`tel:${footerCallNumber}`}
              aria-label="Call the referring doctor"
              className="shrink-0 h-14 w-14 rounded-xl border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm"
            >
              <Phone className="h-6 w-6" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};
