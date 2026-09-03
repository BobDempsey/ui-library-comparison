<script setup lang="ts"></script>

<template>
  <!-- Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. -->
  <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
    <v-table>
      <caption class="visually-hidden">Support tickets, loading</caption>
      <tbody>
        <tr v-for="i in 5" :key="i" class="skeleton-row">
          <td colspan="7">
            <v-skeleton-loader type="text" aria-hidden="true" />
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
