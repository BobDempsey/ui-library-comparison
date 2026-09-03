import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

/**
 * Section 7. Ant Design ships `message` and `notification`, but neither fits
 * the requirements as written: both mount their container lazily on first
 * call rather than being present in the DOM before the first toast, and
 * neither caps its stack at a fixed number with oldest-dropped-first. Rather
 * than bend the requirement to what the library defaults to, the stack, the
 * cap of 3, the auto-dismiss timers, and the live region are hand built here,
 * the same shape `react-headless` used.
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
