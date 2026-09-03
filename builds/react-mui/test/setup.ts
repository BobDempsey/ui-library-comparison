/**
 * jsdom implements neither `ResizeObserver` nor `window.matchMedia`. Material
 * UI's internals (Popper/Menu positioning, theme transition helpers) touch
 * both. No-op stand-ins are enough since this suite never asserts on layout
 * or on `prefers-reduced-motion`.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;
}
