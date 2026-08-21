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
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1",
          {
            'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200': variant === 'default',
            // success/warning/danger use the dedicated status scale, not raw
            // green-/amber-/red- utilities: warning and danger both render
            // from the same brand orange ramp, so `variant="warning"` and
            // `variant="danger"` used to be pixel-identical everywhere this
            // component is used.
            'border-transparent bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300': variant === 'success',
            'border-transparent bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300': variant === 'warning',
            'border-transparent bg-critical-100 text-critical-700 dark:bg-critical-900/40 dark:text-critical-300': variant === 'danger',
            'border-transparent bg-info-100 text-info-700 dark:bg-info-900/40 dark:text-info-300': variant === 'info',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
