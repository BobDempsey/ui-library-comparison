import { Toast, Toaster, createToaster } from '@chakra-ui/react';

/**
 * Section 7. Chakra's toast is a real primitive (`createToaster` plus a
 * `<Toaster>` renderer, both built on Ark UI's toast machine): the live
 * region (`role="region"`, `aria-live="polite"`), the per-toast `role="status"`,
 * the Escape-to-dismiss handler, and the close button all come from the
 * library. What it does not do out of the box is section 7's cap of 3 with the
 * oldest dropped first: Ark's `max` option queues toasts past the limit rather
 * than evicting, so the eviction policy below is hand built on top.
 */
export const toaster = createToaster({
  placement: 'top-end',
  overlap: false,
});

const MAX_TOASTS = 3;
const activeIds: string[] = [];

function forget(id: string): void {
  const index = activeIds.indexOf(id);
  if (index !== -1) activeIds.splice(index, 1);
}

export function pushToast(message: string, durationMs: number): void {
  if (activeIds.length >= MAX_TOASTS) {
    const oldest = activeIds.shift();
    if (oldest) toaster.remove(oldest);
  }
  const id = toaster.create({
    description: message,
    duration: durationMs,
    type: 'info',
    onStatusChange: (details) => {
      if (details.status === 'unmounted') forget(id);
    },
  });
  activeIds.push(id);
}

export function dismissAllToasts(): void {
  toaster.dismiss();
}

/**
 * `createToaster` builds one store shared by every mount of the screen (the
 * standard way to use it), which is exactly what section 7 wants at runtime:
 * toasts outlive a single render. The test adapter mounts and unmounts the
 * screen between cases, though, so it calls this to hard-clear the store
 * (`remove()`, not the animated `dismiss()`) rather than let a toast from one
 * test bleed into the next.
 */
export function resetToastsForTest(): void {
  toaster.remove();
  activeIds.length = 0;
}

/**
 * Mounted once, at the top of the screen, so the live region exists before the
 * first toast fires (section 7's last requirement).
 */
export function ToastRegion() {
  return (
    <Toaster toaster={toaster} data-testid="toast-region" insetInline={{ mdDown: '4' }}>
      {(toast) => (
        <Toast.Root width={{ md: 'sm' }} data-testid="toast">
          <Toast.Description>{toast.description}</Toast.Description>
          <Toast.CloseTrigger aria-label="Dismiss notification" />
        </Toast.Root>
      )}
    </Toaster>
  );
}
