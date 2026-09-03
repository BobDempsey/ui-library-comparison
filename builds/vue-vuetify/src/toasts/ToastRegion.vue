<script setup lang="ts">
import { useToasts } from './toastStore.js';

/**
 * The live region exists in the DOM from first render, before any toast
 * fires, so `aria-live="polite"` announcements are not missed on the first
 * push. Each toast renders through Vuetify's `v-alert` rather than
 * `v-snackbar`: `v-snackbar` is a single overlay instance (see
 * `README.md` for why), while `v-alert` is a plain inline component that
 * stacks naturally and ships a built-in, labelable close button.
 */
const toasts = useToasts();

function onKeydown(id: number, event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation();
    toasts.dismiss(id);
  }
}
</script>

<template>
  <div class="toast-region" aria-live="polite" aria-atomic="false">
    <v-alert
      v-for="toast in toasts.toasts"
      :key="toast.id"
      class="toast"
      role="status"
      type="success"
      variant="elevated"
      density="compact"
      closable
      close-label="Dismiss notification"
      tabindex="0"
      @click:close="toasts.dismiss(toast.id)"
      @keydown="onKeydown(toast.id, $event)"
    >
      {{ toast.message }}
    </v-alert>
  </div>
</template>
