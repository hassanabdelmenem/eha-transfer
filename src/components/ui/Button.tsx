import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

// DESIGN.md's touch-target floor (44/48/56px) is non-negotiable -- gloved-hand and
// shared-tablet use, not a nice-to-have. `className` merges last via twMerge (so
// callers can override background/spacing/etc.), which means a stray `min-h-[40px]`
// in a caller's className used to silently win over the size-derived floor below.
// Inline styles beat utility classes on specificity regardless of merge order, so
// the floor is enforced here and can't be shrunk by className.
const SIZE_MIN_DIMENSIONS: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { minHeight: '44px' },
  md: { minHeight: '48px' },
  lg: { minHeight: '56px' },
  icon: { minHeight: '48px', minWidth: '48px' },
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', style, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        style={{ ...style, ...SIZE_MIN_DIMENSIONS[size] }}
        className={cn(
          // ring-2 with an offset, not ring-1: a 1px indicator with no offset sits
          // directly on the button's own edge and effectively disappears against a
          // similarly-coloured background, which is what WCAG 2.4.13 (Focus
          // Appearance) is about. The offset colour has to be set for dark mode too,
          // or the ring is drawn against the light default.
          "inline-flex items-center justify-center rounded-xl font-bold  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50",
          {
            // Resting buttons carry no shadow (DESIGN.md's Floating-Only Rule --
            // shadow means "temporarily above the page," reserved for modals,
            // popovers, dropdowns, and toasts, never a button sitting on the page).
            'bg-command-blue text-white hover:bg-command-blue-hover': variant === 'primary',
            'bg-command-blue-soft text-command-blue hover:bg-blue-200': variant === 'secondary',
            'bg-critical-600 text-white hover:bg-critical-700': variant === 'destructive',
            'border border-slate-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300': variant === 'outline',
            'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300': variant === 'ghost',
            // Enforce minimum touch targets (48px) globally as per Fitts's Law
            'min-h-[44px] px-3 text-xs': size === 'sm',
            'min-h-[48px] px-4 py-2 text-sm': size === 'md',
            'min-h-[56px] px-6 text-sm': size === 'lg',
            'h-12 w-12': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
