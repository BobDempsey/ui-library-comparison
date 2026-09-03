/**
 * jsdom does not implement `ResizeObserver`, `matchMedia`, or scroll methods
 * that Ant Design's components use internally (`Table`'s sticky/measure logic,
 * `Modal`'s scroll lock, responsive `Grid` breakpoints). No-op stand-ins are
 * enough since this suite never asserts on layout or media queries.
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

if (typeof window.scrollTo === 'undefined') {
  window.scrollTo = () => {};
}
