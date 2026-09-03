import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Section 7. Material UI's `Snackbar` manages one notification slot at a time
 * (its own docs point to a queue that shows the next message only after the
 * current one closes), not the 3-deep stack section 7 asks for. The stack, the
 * cap, and the auto-dismiss timers are hand built here; `ToastRegion` renders
 * each entry with MUI's `Alert` for the visual and the built-in close button.
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
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, durationMs: number) => {
      const id = nextId.current++;
      setToasts((prev) => {
        const next = [...prev, { id, message, durationMs }];
        // Oldest dropped first once the stack passes its cap of 3.
        const overflow = next.length - MAX_TOASTS;
        if (overflow > 0) {
          for (const dropped of next.slice(0, overflow)) {
            const timer = timers.current.get(dropped.id);
            if (timer) {
              clearTimeout(timer);
              timers.current.delete(dropped.id);
            }
          }
        }
        return next.slice(overflow > 0 ? overflow : 0);
      });
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const dismissAll = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setToasts([]);
  }, []);

  return <ToastCtx.Provider value={{ toasts, push, dismiss, dismissAll }}>{children}</ToastCtx.Provider>;
}

export function useToasts(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToasts must be used inside a ToastProvider');
  return ctx;
}
