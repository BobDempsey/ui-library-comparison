import type { ComparisonAdapter } from '@uilc/harness';

/**
 * This build's answer to the adapter interface. Every method drives a real
 * control: click the header, type in the input, press the key. A method that
 * reads component state instead measures nothing, and the ergonomics counts in
 * section 10 stop meaning anything.
 *
 * Throw from anything this library genuinely cannot do. A thrown criterion is a
 * recorded failure, which is the point of the exercise. Never return a
 * plausible fake to get the suite green.
 *
 * Delete each `notImplemented` as you go. A build is done when none are left.
 */
export function createAdapter(): ComparisonAdapter {
  const notImplemented = (name: string): never => {
    throw new Error(`__BUILD__: ${name} is not implemented yet`);
  };

  return {
    async mount(_options) {
      notImplemented('mount');
    },
    async unmount() {
      notImplemented('unmount');
    },

    table: {
      rowCount: () => notImplemented('table.rowCount'),
      totalCount: () => notImplemented('table.totalCount'),
      rowAt: (_index) => notImplemented('table.rowAt'),
      sortBy: async (_column) => notImplemented('table.sortBy'),
      ariaSort: (_column) => notImplemented('table.ariaSort'),
      currentPage: () => notImplemented('table.currentPage'),
      gotoPage: async (_page) => notImplemented('table.gotoPage'),
      pressEnterOnRow: async (_index) => notImplemented('table.pressEnterOnRow'),
      rowHasFocus: (_index) => notImplemented('table.rowHasFocus'),
    },

    filters: {
      setSearch: async (_text) => notImplemented('filters.setSearch'),
      setStatus: async (_values) => notImplemented('filters.setStatus'),
      setPriority: async (_values) => notImplemented('filters.setPriority'),
      setAssignee: async (_name) => notImplemented('filters.setAssignee'),
      setCreatedRange: async (_range) => notImplemented('filters.setCreatedRange'),
      clear: async () => notImplemented('filters.clear'),
      clearIsDisabled: () => notImplemented('filters.clearIsDisabled'),
      activeCount: () => notImplemented('filters.activeCount'),
      values: () => notImplemented('filters.values'),
    },

    modal: {
      isOpen: () => notImplemented('modal.isOpen'),
      title: () => notImplemented('modal.title'),
      setSubject: async (_text) => notImplemented('modal.setSubject'),
      setStatus: async (_value) => notImplemented('modal.setStatus'),
      setPriority: async (_value) => notImplemented('modal.setPriority'),
      save: async () => notImplemented('modal.save'),
      cancel: async () => notImplemented('modal.cancel'),
      pressEscape: async () => notImplemented('modal.pressEscape'),
      fieldError: (_field) => notImplemented('modal.fieldError'),
      confirmIsOpen: () => notImplemented('modal.confirmIsOpen'),
      confirmDiscard: async () => notImplemented('modal.confirmDiscard'),
      holdsFocus: () => notImplemented('modal.holdsFocus'),
    },

    toasts: {
      messages: () => notImplemented('toasts.messages'),
      dismissAll: async () => notImplemented('toasts.dismissAll'),
    },

    states: {
      kind: () => notImplemented('states.kind'),
      message: () => notImplemented('states.message'),
      pressAction: async () => notImplemented('states.pressAction'),
      skeletonIsVisible: () => notImplemented('states.skeletonIsVisible'),
    },

    axe: {
      run: async () => notImplemented('axe.run'),
    },
  };
}
