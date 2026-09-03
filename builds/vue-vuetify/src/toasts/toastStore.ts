import { inject, provide, reactive, type InjectionKey } from 'vue';

/**
 * Section 7. Vuetify's `v-snackbar` renders one message at a time; it has no
 * built-in concept of a stack, so the queue, the cap of 3, and the per-toast
 * auto-dismiss timers are hand built here (each toast is still rendered
 * through `v-snackbar` for its chrome). Mirrors the shape of
 * `builds/react-headless/src/toasts/ToastContext.tsx`, ported to provide/inject.
 */
export interface Toast {
  id: number;
  message: string;
  durationMs: number;
}

const MAX_TOASTS = 3;

export interface ToastApi {
  toasts: Toast[];
  push(message: string, durationMs: number): void;
  dismiss(id: number): void;
  dismissAll(): void;
}

const ToastKey: InjectionKey<ToastApi> = Symbol('toasts');

export function provideToasts(): ToastApi {
  const toasts = reactive<Toast[]>([]);
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextId = 1;

  const dismiss = (id: number): void => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    const index = toasts.findIndex((t) => t.id === id);
    if (index !== -1) toasts.splice(index, 1);
  };

  const push = (message: string, durationMs: number): void => {
    const id = nextId++;
    toasts.push({ id, message, durationMs });
    // Oldest dropped first once the stack passes its cap of 3.
    while (toasts.length > MAX_TOASTS) {
      const dropped = toasts.shift();
      if (dropped) {
        const timer = timers.get(dropped.id);
        if (timer) {
          clearTimeout(timer);
          timers.delete(dropped.id);
        }
      }
    }
    const timer = setTimeout(() => dismiss(id), durationMs);
    timers.set(id, timer);
  };

  const dismissAll = (): void => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    toasts.splice(0, toasts.length);
  };

  const api: ToastApi = { toasts, push, dismiss, dismissAll };
  provide(ToastKey, api);
  return api;
}

export function useToasts(): ToastApi {
  const api = inject(ToastKey);
  if (!api) throw new Error('useToasts must be called inside a component tree under provideToasts()');
  return api;
}
