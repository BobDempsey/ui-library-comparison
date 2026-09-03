<script setup lang="ts">
/** Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. */
</script>

<template>
  <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
    <table>
      <caption class="visually-hidden">Support tickets, loading</caption>
      <tbody>
        <tr v-for="i in 5" :key="i" class="skeleton-row">
          <td colspan="7">
            <q-skeleton type="text" width="100%" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
