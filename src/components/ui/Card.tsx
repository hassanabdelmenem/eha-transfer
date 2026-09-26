import React from 'react';
import { cn } from '../../lib/utils';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    // Resting card, no shadow -- DESIGN.md's Floating-Only Rule reserves shadow for
    // modals/popovers/dropdowns/toasts; the border + canvas tonal contrast does the
    // separation work here instead.
    <div ref={ref} className={cn("rounded-xl border border-slate-200 bg-white text-ink dark:border-white/12 dark:bg-white/[0.05] dark:text-paper", className)} {...props} />
  )
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-[14px] border-b border-slate-200 dark:border-white/10", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-white/60", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-[14px]", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-[14px] border-t border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-transparent", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"
