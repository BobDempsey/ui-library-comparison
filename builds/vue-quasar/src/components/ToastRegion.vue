<script setup lang="ts">
import { useToasts } from '../toasts.js';

/**
 * The live region exists in the DOM from first render, before any toast fires,
 * so `aria-live="polite"` announcements are not missed on the first push.
 */
const toasts = useToasts();

function onKeydown(id: number, event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation();
    toasts.dismiss(id);
  }
}
</script>

<template>
  <div class="toast-region" aria-live="polite" aria-atomic="false">
    <div
      v-for="toast in toasts.toasts"
      :key="toast.id"
      class="toast"
      role="status"
      tabindex="0"
      @keydown="onKeydown(toast.id, $event)"
    >
      <span>{{ toast.message }}</span>
      <q-btn dense flat round aria-label="Dismiss notification" label="×" @click="toasts.dismiss(toast.id)" />
    </div>
  </div>
</template>
