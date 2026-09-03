<script setup lang="ts">
import type { Priority, Status } from '@bakeoff/fixture';

/** Section 3: status and priority render as badges via Quasar's QBadge. */
defineProps<{ kind: 'status' | 'priority'; value: Status | Priority }>();
</script>

<template>
  <q-badge :class="`badge-${kind}-${value}`" :label="value" />
</template>
