/**
 * jsdom does not implement `ResizeObserver` or `matchMedia`, and Quasar's
 * components (QDialog's positioning, its platform/screen plugin) touch both
 * internally. No-op stand-ins are enough since this suite never asserts on
 * layout or media queries.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

// jsdom does not implement scroll methods at all; Quasar's scroll utilities
// (used by QSelect's virtual scroll and QBtn's ripple/focus handling) call
// these unconditionally.
if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = function scrollTo(): void {};
}
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}

if (typeof window.matchMedia !== 'function') {
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
