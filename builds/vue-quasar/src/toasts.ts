import { inject, provide, reactive, type InjectionKey } from 'vue';

/**
 * Section 7. Quasar ships an imperative `$q.notify()` plugin, but it does not
 * guarantee an `aria-live` region mounted before the first call, a hard cap of
 * 3 stacked messages with the oldest dropped first, or Escape-to-dismiss on a
 * focused toast. Reproducing all three on top of `$q.notify` would mean
 * overriding most of what it does, so the stack, the cap, the timers, and the
 * live region are hand built here instead, the same call this build made for
 * the record modal's validation (real, but adjacent to what the library ships).
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

export function createToastStore(): ToastApi {
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

  return { toasts, push, dismiss, dismissAll };
}

export function provideToasts(): ToastApi {
  const store = createToastStore();
  provide(ToastKey, store);
  return store;
}

export function useToasts(): ToastApi {
  const store = inject(ToastKey);
  if (!store) throw new Error('useToasts must be used inside a component tree that called provideToasts()');
  return store;
}
