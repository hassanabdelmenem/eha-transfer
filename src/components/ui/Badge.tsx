import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-[6px] px-2 py-1 text-[11px] font-bold leading-none tracking-[0.04em] focus:outline-none focus-visible:ring-2 focus-visible:ring-info-700",
          {
            'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200': variant === 'default' || variant === 'secondary',
            // The four status tints. Text is the darkest step of the same hue, never
            // grey, so a chip reads its meaning even when colour is lost.
            'bg-success-100 text-success-700 dark:bg-success-900/60 dark:text-success-300': variant === 'success',
            'bg-warning-100 text-warning-800 dark:bg-warning-900/50 dark:text-warning-300': variant === 'warning',
            'bg-critical-100 text-critical-700 dark:bg-critical-900/50 dark:text-critical-300': variant === 'danger',
            'bg-info-100 text-info-800 dark:bg-info-900/60 dark:text-info-300': variant === 'info',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
