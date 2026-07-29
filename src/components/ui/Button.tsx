import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-blue-900 text-white hover:bg-blue-800 shadow-sm': variant === 'primary',
            'bg-blue-100 text-blue-900 hover:bg-blue-200': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 shadow-sm': variant === 'destructive',
            'border border-slate-300 bg-transparent hover:bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300': variant === 'outline',
            'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300': variant === 'ghost',
            'h-7 px-3 text-[10px]': size === 'sm',
            'h-9 px-4 py-2 text-xs': size === 'md',
            'h-11 px-6 text-sm': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
