<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { useToasts } from '../toasts/toastStore.js';
import { formatDate, formatRelative } from '../format.js';

/**
 * Section 6. Vuetify's `v-dialog` gives the dialog role and `aria-modal` for
 * free, and traps Tab cycling once focus is inside. It does not, in
 * practice, move focus onto the first field itself: under jsdom the
 * dialog's content wrapper never receives focus at all (observed by polling
 * `document.activeElement` for a full second after opening), so section 6's
 * "focus moves to the first field on open" is hand built below rather than
 * left to the library. This build also captures and restores focus itself in
 * `TicketsScreen.vue` so criterion 14 does not depend on Vuetify's own
 * focus-return-to-activator behavior either. Validation, touched tracking,
 * and the unsaved-changes confirmation are hand built on top, same as every
 * other build in this comparison.
 */
const props = defineProps<{ ticket: Ticket | null; assignees: readonly string[] }>();
const emit = defineEmits<{ close: []; save: [ticket: Ticket] }>();

const subject = ref('');
const status = ref<Status>('open');
const priority = ref<Priority>('normal');
const assignee = ref<string | null>(null);
const touched = ref(false);
const subjectError = ref<string | null>(null);
const confirmOpen = ref(false);
const toasts = useToasts();

watch(
  () => props.ticket,
  (ticket) => {
    if (!ticket) return;
    subject.value = ticket.subject;
    status.value = ticket.status;
    priority.value = ticket.priority;
    assignee.value = ticket.assignee;
    touched.value = false;
    subjectError.value = null;
    confirmOpen.value = false;
    nextTick(() => {
      document.getElementById('ticket-subject')?.focus();
    });
  },
  { immediate: true },
);

const assigneeProxy = computed<string>({
  get: () => assignee.value ?? 'Unassigned',
  set: (value) => {
    assignee.value = value === 'Unassigned' ? null : value;
    touched.value = true;
  },
});

function onSubjectInput(value: string): void {
  subject.value = value;
  touched.value = true;
  subjectError.value = null;
}

function onStatusChange(value: Status): void {
  status.value = value;
  touched.value = true;
}

function onPriorityChange(value: Priority): void {
  priority.value = value;
  touched.value = true;
}

function requestClose(): void {
  if (touched.value) {
    confirmOpen.value = true;
    return;
  }
  emit('close');
}

function discard(): void {
  confirmOpen.value = false;
  emit('close');
}

function save(): void {
  if (!props.ticket) return;
  if (subject.value.length === 0) {
    subjectError.value = 'Subject is required.';
    return;
  }
  if (subject.value.length > SUBJECT_MAX) {
    subjectError.value = `Subject must be ${SUBJECT_MAX} characters or fewer.`;
    return;
  }
  const updated: Ticket = { ...props.ticket, subject: subject.value, status: status.value, priority: priority.value, assignee: assignee.value };
  emit('save', updated);
  toasts.push(`Ticket ${props.ticket.id} updated`, 4000);
  emit('close');
}
</script>

<template>
  <v-dialog
    :model-value="!!ticket"
    persistent
    max-width="30rem"
    :content-props="{ 'aria-labelledby': 'record-dialog-title' }"
  >
    <v-card v-if="ticket" data-testid="record-dialog" @keydown.esc.stop.prevent="requestClose">
      <v-card-title id="record-dialog-title">{{ ticket.id }}: {{ ticket.subject }}</v-card-title>
      <v-card-text>
        <div class="field read-only-field">
          <span class="field-label">ID</span>
          <span>{{ ticket.id }}</span>
        </div>

        <v-text-field
          id="ticket-subject"
          label="Subject"
          density="compact"
          variant="outlined"
          :model-value="subject"
          :error="!!subjectError"
          hide-details
          @update:model-value="onSubjectInput"
        />
        <p v-if="subjectError" id="ticket-subject-error" role="alert">{{ subjectError }}</p>

        <v-select
          id="modal-status"
          label="Status"
          density="compact"
          variant="outlined"
          hide-details
          :items="[...STATUSES]"
          :model-value="status"
          @update:model-value="onStatusChange"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" :data-testid="`modal-status-option-${item.raw}`" />
          </template>
        </v-select>

        <v-select
          id="modal-priority"
          label="Priority"
          density="compact"
          variant="outlined"
          hide-details
          :items="[...PRIORITIES]"
          :model-value="priority"
          @update:model-value="onPriorityChange"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" :data-testid="`modal-priority-option-${item.raw}`" />
          </template>
        </v-select>

        <v-select
          id="modal-assignee"
          label="Assignee"
          density="compact"
          variant="outlined"
          hide-details
          :items="[...assignees, 'Unassigned']"
          v-model="assigneeProxy"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" :data-testid="`modal-assignee-option-${item.raw}`" />
          </template>
        </v-select>

        <div class="field read-only-field">
          <span class="field-label">Created</span>
          <span>{{ formatDate(ticket.createdAt) }}</span>
        </div>
        <div class="field read-only-field">
          <span class="field-label">Updated</span>
          <span>{{ formatRelative(ticket.updatedAt) }}</span>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn data-testid="modal-save" variant="flat" color="primary" @click="save">Save</v-btn>
        <v-btn data-testid="modal-cancel" variant="tonal" @click="requestClose">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    :model-value="confirmOpen"
    persistent
    max-width="24rem"
    :content-props="{ role: 'alertdialog', 'aria-labelledby': 'confirm-dialog-title' }"
  >
    <v-card v-if="confirmOpen" data-testid="confirm-dialog">
      <v-card-title id="confirm-dialog-title">Discard unsaved changes?</v-card-title>
      <v-card-text>
        <p>Closing now loses the edits made to this ticket.</p>
      </v-card-text>
      <v-card-actions>
        <v-btn data-testid="confirm-discard" variant="flat" color="error" @click="discard">Discard changes</v-btn>
        <v-btn data-testid="confirm-keep-editing" variant="tonal" @click="confirmOpen = false">Keep editing</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
