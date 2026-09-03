import { Toast, ToastClose, ToastDescription, ToastProvider as RadixToastProvider, ToastViewport } from '@/components/ui/toast.js';
import { useToasts } from './ToastContext.js';

/**
 * Renders the current toast stack through Radix's Toast primitive. The
 * viewport is mounted from first render, before any toast fires, and carries
 * `aria-live="polite"` explicitly (Radix's own default is an `aria-label`
 * region, not a literal `aria-live` attribute, so section 7's wording is
 * matched directly rather than relied on implicitly).
 */
export function ToastRegion() {
  const { toasts, dismiss } = useToasts();

  return (
    <RadixToastProvider swipeDirection="right">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type="background"
          duration={toast.durationMs}
          onOpenChange={(open) => {
            if (!open) dismiss(toast.id);
          }}
        >
          <ToastDescription data-testid="toast-message">{toast.message}</ToastDescription>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport aria-live="polite" aria-atomic="false" />
    </RadixToastProvider>
  );
}
