import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Section 7. Radix's Toast primitive gives one toast its auto-dismiss timing,
 * Escape-while-focused close, and swipe gesture, but has no concept of a
 * capped stack: the array, the cap of 3 with oldest dropped first, and the
 * exact message text per trigger are hand built here.
 */
export interface Toast {
  id: number;
  message: string;
  durationMs: number;
}

const MAX_TOASTS = 3;

interface ToastApi {
  toasts: Toast[];
  push(message: string, durationMs: number): void;
  dismiss(id: number): void;
  dismissAll(): void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, durationMs: number) => {
    const id = nextId.current++;
    setToasts((prev) => {
      const next = [...prev, { id, message, durationMs }];
      // Oldest dropped first once the stack passes its cap of 3.
      const overflow = next.length - MAX_TOASTS;
      return overflow > 0 ? next.slice(overflow) : next;
    });
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  return <ToastCtx.Provider value={{ toasts, push, dismiss, dismissAll }}>{children}</ToastCtx.Provider>;
}

export function useToasts(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToasts must be used inside a ToastProvider');
  return ctx;
}
