import type { KeyboardEvent } from 'react';
import { useToasts } from './ToastContext.js';

/**
 * The live region exists in the DOM from first render, before any toast fires,
 * so `aria-live="polite"` announcements are not missed on the first push.
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
    <div className="toast-region" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" role="status" tabIndex={0} onKeyDown={onKeyDown(toast.id)}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
