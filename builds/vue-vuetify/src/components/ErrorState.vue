<script setup lang="ts">
defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <!-- Section 8: the forced error state, with a Retry that reloads the fixture. -->
  <div role="alert" data-testid="table-empty-state" data-kind="error">
    <p>{{ message }}</p>
    <v-btn data-testid="empty-state-action" variant="tonal" @click="emit('retry')">Retry</v-btn>
  </div>
</template>
