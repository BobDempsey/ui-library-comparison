import * as SelectPrimitive from '@radix-ui/react-select';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils.js';
import { ChevronDownIcon } from './icons.js';

/**
 * shadcn/ui's Select, a styled wrapper over Radix's Select primitive. Keyboard
 * navigation (arrow keys, type-ahead, Home/End), the trigger's
 * `aria-haspopup`/`aria-expanded`, and option `aria-selected` all come from
 * Radix. Radix's Select is single-value only; section 5's Status and Priority
 * multi-selects use the DropdownMenu primitive instead (see multi-select-field.tsx).
 */
export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm data-[placeholder]:text-muted-foreground focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon aria-hidden="true" className="shrink-0 text-muted-foreground">
        <ChevronDownIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'z-50 max-h-64 min-w-[8rem] overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-md',
          position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-7 pr-2 text-sm capitalize outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[state=checked]:font-medium',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 inline-flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
        <SelectPrimitive.ItemIndicator>✓</SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
