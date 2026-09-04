<script setup lang="ts">
import { ref, watch } from 'vue';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@uilc/fixture';
import { formatDate, formatRelative } from '../format.js';
import { useToasts } from '../toasts.js';

/**
 * Section 6. Quasar's `QDialog` gives the `role="dialog"`, `aria-modal`, the
 * focus trap, initial focus, and focus-return to whatever had focus before the
 * dialog opened. Validation, touched tracking, and the unsaved-changes
 * confirmation are hand built on top, same as every other build in this
 * comparison since none of the eight libraries ship that as a primitive.
 */
const props = defineProps<{ ticket: Ticket | null; assignees: readonly string[] }>();
const emit = defineEmits<{ close: []; save: [updated: Ticket] }>();

const toasts = useToasts();

const subject = ref('');
const status = ref<Status>('open');
const priority = ref<Priority>('normal');
const assignee = ref<string | null>(null);
const touched = ref(false);
const subjectError = ref<string | null>(null);
const confirmOpen = ref(false);

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
  },
  { immediate: true },
);

function onSubjectChange(value: string | number | null) {
  subject.value = value === null ? '' : String(value);
  touched.value = true;
  subjectError.value = null;
}

function onStatusChange(value: Status) {
  status.value = value;
  touched.value = true;
}

function onPriorityChange(value: Priority) {
  priority.value = value;
  touched.value = true;
}

function onAssigneeChange(value: string | null) {
  assignee.value = value;
  touched.value = true;
}

function requestClose() {
  if (touched.value) {
    confirmOpen.value = true;
    return;
  }
  emit('close');
}

function discard() {
  confirmOpen.value = false;
  emit('close');
}

function save() {
  if (!props.ticket) return;
  const length = subject.value.length;
  if (length === 0) {
    subjectError.value = 'Subject is required.';
    return;
  }
  if (length > SUBJECT_MAX) {
    subjectError.value = `Subject must be ${SUBJECT_MAX} characters or fewer.`;
    return;
  }
  const updated: Ticket = {
    ...props.ticket,
    subject: subject.value,
    status: status.value,
    priority: priority.value,
    assignee: assignee.value,
  };
  emit('save', updated);
  toasts.push(`Ticket ${props.ticket.id} updated`, 4000);
  emit('close');
}
</script>

<template>
  <q-dialog :model-value="ticket !== null" persistent>
    <q-card v-if="ticket" data-testid="record-dialog" style="min-width: 24rem" @keydown.esc="requestClose">
      <q-card-section>
        <div class="text-h6" data-testid="record-dialog-title">{{ ticket.id }}: {{ ticket.subject }}</div>
      </q-card-section>

      <q-card-section>
        <div class="field read-only-field">
          <span class="field-label">ID</span>
          <span>{{ ticket.id }}</span>
        </div>

        <div class="field">
          <q-input
            data-testid="modal-subject"
            label="Subject"
            :model-value="subject"
            :error="subjectError !== null"
            :error-message="subjectError ?? undefined"
            autofocus
            @update:model-value="onSubjectChange"
          />
        </div>

        <div class="field">
          <q-select
            data-testid="modal-status"
            label="Status"
            :options="[...STATUSES]"
            :model-value="status"
            emit-value
            map-options
            dropdown-icon="M7 10l5 5 5-5z"
            @update:model-value="onStatusChange"
          />
        </div>

        <div class="field">
          <q-select
            data-testid="modal-priority"
            label="Priority"
            :options="[...PRIORITIES]"
            :model-value="priority"
            emit-value
            map-options
            dropdown-icon="M7 10l5 5 5-5z"
            @update:model-value="onPriorityChange"
          />
        </div>

        <div class="field">
          <q-select
            data-testid="modal-assignee"
            label="Assignee"
            :options="[...assignees, 'Unassigned']"
            :model-value="assignee ?? 'Unassigned'"
            emit-value
            map-options
            dropdown-icon="M7 10l5 5 5-5z"
            @update:model-value="(v) => onAssigneeChange(v === 'Unassigned' ? null : (v as string))"
          />
        </div>

        <div class="field read-only-field">
          <span class="field-label">Created</span>
          <span>{{ formatDate(ticket.createdAt) }}</span>
        </div>
        <div class="field read-only-field">
          <span class="field-label">Updated</span>
          <span>{{ formatRelative(ticket.updatedAt) }}</span>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Save" data-testid="modal-save" @click="save" />
        <q-btn label="Cancel" data-testid="modal-cancel" @click="requestClose" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog :model-value="confirmOpen" persistent role="alertdialog">
    <q-card data-testid="confirm-dialog" @keydown.esc="confirmOpen = false">
      <q-card-section>
        <div class="text-h6">Discard unsaved changes?</div>
      </q-card-section>
      <q-card-section>
        <p>Closing now loses the edits made to this ticket.</p>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn label="Discard changes" data-testid="confirm-discard" @click="discard" />
        <q-btn label="Keep editing" data-testid="confirm-keep" @click="confirmOpen = false" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
