<script setup lang="ts">
import { computed } from 'vue';
import type { Priority, Status } from '@uilc/fixture';

/** Section 3: status and priority render as badges, built on Vuetify's `v-chip`. */
const props = defineProps<{ kind: 'status' | 'priority'; value: Status | Priority }>();

const STATUS_COLOR: Record<Status, string> = {
  open: 'primary',
  pending: 'warning',
  resolved: 'success',
  closed: 'surface-variant',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'surface-variant',
  normal: 'primary',
  high: 'warning',
  urgent: 'error',
};

const color = computed(() =>
  props.kind === 'status' ? STATUS_COLOR[props.value as Status] : PRIORITY_COLOR[props.value as Priority],
);
</script>

<template>
  <v-chip :class="`badge badge-${kind}-${value}`" size="small" :color="color" label>{{ value }}</v-chip>
</template>
