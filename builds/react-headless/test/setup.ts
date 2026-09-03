/**
 * jsdom does not implement `ResizeObserver`, and Headless UI's `Listbox` uses
 * it internally when closing (to restore scroll position). A no-op stand-in is
 * enough since this suite never asserts on layout.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub;
}
