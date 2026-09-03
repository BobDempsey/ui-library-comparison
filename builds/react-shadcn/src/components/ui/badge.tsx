import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils.js';

/**
 * shadcn/ui's Badge ships four tone variants (default/secondary/outline/destructive).
 * Section 3 needs a badge per status and per priority value, eight tones in all, so
 * this extends the standard variant map rather than inventing a new component.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors',
  {
    variants: {
      tone: {
        neutral: 'border-transparent bg-secondary text-secondary-foreground',
        open: 'border-transparent bg-blue-100 text-blue-800',
        pending: 'border-transparent bg-amber-100 text-amber-800',
        resolved: 'border-transparent bg-emerald-100 text-emerald-800',
        closed: 'border-transparent bg-slate-200 text-slate-700',
        low: 'border-transparent bg-slate-100 text-slate-600',
        normal: 'border-transparent bg-blue-100 text-blue-800',
        high: 'border-transparent bg-orange-100 text-orange-800',
        urgent: 'border-transparent bg-red-100 text-red-800',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, className }))} {...props} />;
}
