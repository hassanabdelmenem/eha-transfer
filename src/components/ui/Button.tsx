import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // primary     ink; the one action a card or screen exists for
  // success     olive fill; approve / accept
  // warning     amber-brown fill; send back with requirements
  // destructive critical fill; reject / cancel / delete
  // secondary   white with a hairline; the second action beside a primary (Summary)
  // outline     white with the input border; tertiary (Back, Add a note)
  // ghost       no chrome; dismissive (Close, Cancel)
  variant?: 'primary' | 'success' | 'warning' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

// The touch-target floor (44/48/56px) is non-negotiable: gloved hands and shared
// tablets. `className` merges last via twMerge, so a stray `min-h-[40px]` from a
// caller would otherwise win; inline styles beat utilities regardless of merge
// order, so the floor is enforced here and can't be shrunk by className.
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
          // Focus: a 2px ring with an offset, drawn in the action blue. The offset
          // colour follows the surface so the ring never sits on its own edge.
          'inline-flex items-center justify-center gap-2 font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info-700 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
          'dark:focus-visible:ring-info-300 dark:focus-visible:ring-offset-ink',
          'disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-500 disabled:border-transparent',
          'dark:disabled:bg-white/10 dark:disabled:text-white/45',
          {
            'bg-ink text-paper hover:bg-slate-800 dark:bg-paper dark:text-ink dark:hover:bg-slate-200': variant === 'primary',
            'bg-success-700 text-white hover:bg-success-800': variant === 'success',
            'bg-warning-700 text-white hover:bg-warning-800': variant === 'warning',
            'bg-critical-700 text-white hover:bg-critical-800': variant === 'destructive',
            'border border-slate-200 bg-white text-ink hover:bg-slate-50 dark:border-white/20 dark:bg-white/5 dark:text-paper dark:hover:bg-white/10': variant === 'secondary',
            'border border-slate-300 bg-white text-ink hover:bg-slate-50 dark:border-white/25 dark:bg-transparent dark:text-paper dark:hover:bg-white/10': variant === 'outline',
            'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10': variant === 'ghost',
            'min-h-[44px] rounded-[10px] px-3 text-[13px]': size === 'sm',
            'min-h-[48px] rounded-[10px] px-4 text-[14px]': size === 'md',
            'min-h-[56px] rounded-xl px-6 text-[15px]': size === 'lg',
            'h-12 w-12 rounded-[10px]': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
