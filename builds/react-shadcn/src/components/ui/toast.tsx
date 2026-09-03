import * as ToastPrimitive from '@radix-ui/react-toast';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils.js';

/**
 * shadcn/ui's Toast, a styled wrapper over Radix's Toast primitive. Radix
 * supplies the portal, the swipe gesture, the `role`/implicit live-region
 * semantics on each toast, per-toast auto-dismiss timing via its `duration`
 * prop (paused on hover/focus), and closing the focused toast on Escape.
 * `aria-live="polite"` on the viewport, the stack cap of 3 with oldest dropped
 * first, and the message text are hand built in `../ToastRegion.tsx`.
 */
export const ToastProvider = ToastPrimitive.Provider;

export function ToastViewport({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn('fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none', className)}
      {...props}
    />
  );
}

export function Toast({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border border-border bg-slate-900 px-4 py-3 text-sm text-white shadow-lg data-[state=closed]:hidden',
        className,
      )}
      {...props}
    />
  );
}

export function ToastDescription({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Description>) {
  return <ToastPrimitive.Description className={cn('text-sm', className)} {...props} />;
}

export function ToastClose({ className, ...props }: ComponentPropsWithoutRef<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={cn('shrink-0 rounded text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white', className)}
      aria-label="Dismiss notification"
      {...props}
    >
      &times;
    </ToastPrimitive.Close>
  );
}
