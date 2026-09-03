import type { KeyboardEvent } from 'react';
import { Alert } from '@mui/material';
import { useToasts } from './ToastContext.js';

/**
 * The live region exists in the DOM from first render, before any toast fires,
 * so `aria-live="polite"` announcements are not missed on the first push.
 * Each entry is an MUI `Alert`, which gives the close button (with its own
 * `aria-label`) for free; the Escape-to-dismiss handler is hand built.
 */
export function ToastRegion() {
  const { toasts, dismiss } = useToasts();

  const onKeyDown = (id: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dismiss(id);
    }
  };

  return (
    <div className="toast-region" aria-live="polite" aria-atomic="false" data-testid="toast-region">
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          severity="success"
          variant="filled"
          className="toast"
          data-testid="toast"
          tabIndex={0}
          onKeyDown={onKeyDown(toast.id)}
          onClose={() => dismiss(toast.id)}
        >
          {toast.message}
        </Alert>
      ))}
    </div>
  );
}
