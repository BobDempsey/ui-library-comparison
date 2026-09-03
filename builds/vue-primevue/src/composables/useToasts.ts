import { inject, type InjectionKey, provide, reactive } from 'vue';

/**
 * Section 7. PrimeVue's own `Toast` ships each message as its own
 * `role="alert" aria-live="assertive"` node with no persistent container, which
 * does not match the spec: a single `aria-live="polite"` region present in the
 * DOM before the first toast, a cap of 3 with the oldest dropped first, and a
 * dismiss on Escape while a toast is focused. Getting all four exactly right was
 * faster to hand build than to fight the primitive's defaults, so this is a
 * plain reactive stack, independent of `primevue/toast`.
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

const ToastKey: InjectionKey<ToastApi> = Symbol('bakeoff-toasts');

export function createToastQueue(): ToastApi {
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
    timers.set(
      id,
      setTimeout(() => dismiss(id), durationMs),
    );
  };

  const dismissAll = (): void => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    toasts.splice(0, toasts.length);
  };

  return { toasts, push, dismiss, dismissAll };
}

export function provideToasts(): ToastApi {
  const api = createToastQueue();
  provide(ToastKey, api);
  return api;
}

export function useToasts(): ToastApi {
  const api = inject(ToastKey);
  if (!api) throw new Error('useToasts must be called under a component that called provideToasts()');
  return api;
}
