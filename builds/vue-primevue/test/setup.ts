/**
 * jsdom does not implement `ResizeObserver`, which PrimeVue components (the
 * DataTable scroller and the Dialog/Toast positioning) touch internally. A
 * no-op stand-in is enough since this suite never asserts on layout.
 *
 * jsdom also has no real layout engine, so `Element.getBoundingClientRect`
 * always reports zeros. PrimeVue's overlay positioning (Dialog centering,
 * MultiSelect/Select panel placement) reads it defensively and tolerates
 * zeros, so no stub is needed there.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

/** jsdom has no matchMedia; PrimeVue's theme layer touches it when checking for reduced-motion/dark-mode preferences. */
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof globalThis.matchMedia;
}
