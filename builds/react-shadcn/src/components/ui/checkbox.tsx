import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils.js';

export function Checkbox({ className, ...props }: ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input bg-surface data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-[0.65rem] leading-none">✓</CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
