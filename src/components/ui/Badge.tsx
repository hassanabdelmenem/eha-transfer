import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1",
          {
            'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200': variant === 'default',
            'border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': variant === 'success',
            'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300': variant === 'warning',
            'border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': variant === 'danger',
            'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300': variant === 'info',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
