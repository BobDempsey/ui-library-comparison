/**
 * jsdom implements none of `ResizeObserver`, `IntersectionObserver`, or
 * `matchMedia`, and Vuetify's overlay/positioning system (`v-dialog`,
 * `v-select`'s menu, `v-snackbar`) touches all three. No-op stand-ins are
 * enough since this suite never asserts on layout or media queries.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  // @ts-expect-error jsdom's lib types do not model this stand-in exactly.
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

// jsdom implements no `CSS` global at all; Vuetify's feature detection
// (`CSS.supports(...)`) calls it unconditionally while loading.
if (typeof globalThis.CSS === 'undefined') {
  // @ts-expect-error minimal stand-in, not a real CSSOM implementation.
  globalThis.CSS = { supports: () => false };
}

// jsdom has no `visualViewport` at all (not even `window.visualViewport`),
// and Vuetify's `VOverlay` positioning code references the bare global
// directly while computing where to place an open menu/dialog.
if (typeof globalThis.visualViewport === 'undefined') {
  // @ts-expect-error minimal stand-in, not a real VisualViewport.
  globalThis.visualViewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
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
  });
}
