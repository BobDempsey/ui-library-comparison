<script setup lang="ts">
import type { Toast } from '../composables/useToasts.js';

/**
 * The live region exists in the DOM from first render, before any toast fires,
 * so `aria-live="polite"` announcements are not missed on the first push.
 */
defineProps<{ toasts: Toast[] }>();
const emit = defineEmits<{ dismiss: [id: number] }>();

function onKeydown(id: number, event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation();
    emit('dismiss', id);
  }
}
</script>

<template>
  <div class="toast-region" aria-live="polite" aria-atomic="false">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      role="status"
      tabindex="0"
      @keydown="(event) => onKeydown(toast.id, event)"
    >
      <span>{{ toast.message }}</span>
      <button type="button" aria-label="Dismiss notification" @click="emit('dismiss', toast.id)">&times;</button>
    </div>
  </div>
</template>
