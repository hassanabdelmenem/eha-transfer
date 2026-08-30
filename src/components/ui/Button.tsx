import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // ring-2 with an offset, not ring-1: a 1px indicator with no offset sits
          // directly on the button's own edge and effectively disappears against a
          // similarly-coloured background, which is what WCAG 2.4.13 (Focus
          // Appearance) is about. The offset colour has to be set for dark mode too,
          // or the ring is drawn against the light default.
          "inline-flex items-center justify-center rounded-xl font-bold  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-blue-900 text-white hover:bg-blue-800 shadow-md': variant === 'primary',
            'bg-blue-100 text-blue-900 hover:bg-blue-200': variant === 'secondary',
            'bg-critical-600 text-white hover:bg-critical-700 shadow-md': variant === 'destructive',
            'border border-slate-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300': variant === 'outline',
            'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300': variant === 'ghost',
            // 40px, not 28px: every other interactive element in this app
            // (inputs, ghost icon buttons, links styled as buttons) was
            // already hand-patched to min-h-[40px] one at a time — 30 call
            // sites doing it individually — because size="sm" alone landed
            // under a comfortable touch target. Fixing it here removes the
            // need for that override everywhere it was applied to a Button.
            'h-10 px-3 text-xs': size === 'sm',
            'h-9 px-4 py-2 text-xs': size === 'md',
            'h-11 px-6 text-sm': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
