import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, style, ...props }, ref) => {
    return (
      <input
        type={type}
        // Inline style beats a conflicting utility class on specificity regardless
        // of merge order, so a caller's className can't shrink the 48px touch-target
        // floor -- see the matching comment on Button.tsx for why this matters here.
        style={{ ...style, minHeight: '48px' }}
        className={cn(
          "flex min-h-[48px] w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-critical-500 focus:ring-critical-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
