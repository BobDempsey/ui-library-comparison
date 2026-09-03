<script setup lang="ts">
import type { Priority, Status } from '@bakeoff/fixture';

/** Section 3: status and priority render as badges. Plain elements; no PrimeVue component covers this shape. */
defineProps<{ kind: 'status' | 'priority'; value: Status | Priority }>();
</script>

<template>
  <span :class="`badge badge-${kind}-${value}`">{{ value }}</span>
</template>
