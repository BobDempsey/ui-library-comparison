<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { loadTickets, type FixtureOptions, type Ticket } from '@uilc/fixture';

/**
 * The screen from sections 2 to 8: a filterable table, a filter form above it, a
 * record modal, and toasts. Build it with __LIBRARY__ and split this file up as
 * it grows; `measure` counts every line under `src/`.
 *
 * The prop exists so the test adapter can force the empty and error states from
 * section 8 without a network layer to stub.
 */
const props = withDefaults(defineProps<{ fixture?: FixtureOptions }>(), { fixture: () => ({}) });

const rows = ref<readonly Ticket[] | null>(null);
const error = ref<string | null>(null);

async function load() {
  rows.value = null;
  error.value = null;
  try {
    rows.value = await loadTickets(props.fixture);
  } catch (cause) {
    error.value = (cause as Error).message;
  }
}

onMounted(load);
watch(() => props.fixture, load);
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="rows === null">Loading</p>
  <!-- Start here. The skeleton, the table, the filter form, the modal, and the
       toasts all still have to be built against the spec. -->
  <p v-else>{{ rows.length }} tickets loaded. Build the screen.</p>
</template>
