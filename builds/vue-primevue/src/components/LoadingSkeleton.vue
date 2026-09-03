<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

/** Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. PrimeVue's `Skeleton` supplies the shimmer bar. */
</script>

<template>
  <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
    <table>
      <caption class="visually-hidden">Support tickets, loading</caption>
      <tbody>
        <tr v-for="i in 5" :key="i" class="skeleton-row">
          <td colspan="7">
            <Skeleton height="1.25rem" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
