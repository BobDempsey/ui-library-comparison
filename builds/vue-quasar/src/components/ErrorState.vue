<script setup lang="ts">
/** Section 8: the forced error state, with a Retry that reloads the fixture. */
defineProps<{ message: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div role="alert" data-testid="table-empty-state" data-kind="error">
    <p>{{ message }}</p>
    <q-btn label="Retry" @click="emit('retry')" />
  </div>
</template>
