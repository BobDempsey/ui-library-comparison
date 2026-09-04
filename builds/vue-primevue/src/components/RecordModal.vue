<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@uilc/fixture';
import { useToasts } from '../composables/useToasts.js';
import { formatDate, formatRelative } from '../format.js';

/**
 * Section 6. PrimeVue's `Dialog` supplies `role="dialog"`, `aria-modal`, the
 * title association, and the focus trap. Everything else here is hand built
 * rather than left to Dialog's defaults, because those defaults live inside
 * its `<transition>` `enter`/`leave` hooks (`onEnter` binds the Escape
 * listener and captures the element to restore focus to; `onLeave` restores
 * it), and under jsdom those hooks never fire at all: there is no real CSS
 * transition to time against, and this version of Vue's transition component
 * does not fall back to firing them on the next frame the way it does for
 * `v-show`. A native `autofocus` on the subject field still moves focus on
 * open (the browser's own insertion-time behaviour, independent of Vue's
 * transition), which is section 6's "focus moves to the first field", but
 * closing on Escape and returning focus to the triggering row are handled
 * directly: a document `keydown` listener while the dialog is open, and an
 * explicitly captured trigger element restored on close. The unsaved-changes
 * confirmation uses PrimeVue's own `ConfirmDialog` rather than a second
 * bespoke dialog.
 */
const props = defineProps<{ ticket: Ticket | null; assignees: readonly string[] }>();
const emit = defineEmits<{ close: []; save: [updated: Ticket] }>();

const subject = ref('');
const status = ref<Status>('open');
const priority = ref<Priority>('normal');
const assignee = ref('Unassigned');
const touched = ref(false);
const subjectError = ref<string | null>(null);
const visible = ref(false);

const confirm = useConfirm();
const toasts = useToasts();

const title = computed(() => (props.ticket ? `${props.ticket.id}: ${props.ticket.subject}` : ''));

let triggerElement: HTMLElement | null = null;

watch(
  () => props.ticket,
  (ticket) => {
    if (!ticket) {
      visible.value = false;
      return;
    }
    triggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    subject.value = ticket.subject;
    status.value = ticket.status;
    priority.value = ticket.priority;
    assignee.value = ticket.assignee ?? 'Unassigned';
    touched.value = false;
    subjectError.value = null;
    visible.value = true;
  },
  { immediate: true },
);

function onShow(): void {
  document.getElementById('ticket-subject')?.focus();
}

/** See the module doc comment: Dialog's own `closeOnEscape` depends on its transition hooks, which do not fire under jsdom. */
function onDocumentKeydown(event: KeyboardEvent): void {
  if (visible.value && event.key === 'Escape') requestClose();
}

onMounted(() => document.addEventListener('keydown', onDocumentKeydown));
onUnmounted(() => document.removeEventListener('keydown', onDocumentKeydown));

function onSubjectInput(value: string | undefined): void {
  subject.value = value ?? '';
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

function onAssigneeChange(value: string): void {
  assignee.value = value;
  touched.value = true;
}

function finishClose(): void {
  visible.value = false;
  emit('close');
  triggerElement?.focus();
  triggerElement = null;
}

function requestClose(): void {
  if (touched.value) {
    confirm.require({
      header: 'Discard unsaved changes?',
      message: 'Closing now loses the edits made to this ticket.',
      acceptLabel: 'Discard changes',
      rejectLabel: 'Keep editing',
      accept: finishClose,
      reject: () => {},
    });
    return;
  }
  finishClose();
}

function onDialogVisibleChange(value: boolean): void {
  if (!value) requestClose();
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
  const updated: Ticket = {
    ...props.ticket,
    subject: subject.value,
    status: status.value,
    priority: priority.value,
    assignee: assignee.value === 'Unassigned' ? null : assignee.value,
  };
  emit('save', updated);
  toasts.push(`Ticket ${props.ticket.id} updated`, 4000);
  finishClose();
}
</script>

<template>
  <Dialog
    v-if="ticket"
    :visible="visible"
    modal
    :header="title"
    :close-on-escape="false"
    data-testid="record-dialog"
    @update:visible="onDialogVisibleChange"
    @show="onShow"
  >
    <div class="field read-only-field">
      <span class="field-label">ID</span>
      <span>{{ ticket.id }}</span>
    </div>

    <div class="field">
      <label for="ticket-subject">Subject</label>
      <InputText
        id="ticket-subject"
        autofocus
        :model-value="subject"
        :invalid="!!subjectError"
        :aria-describedby="subjectError ? 'ticket-subject-error' : undefined"
        @update:model-value="onSubjectInput"
      />
      <Message v-if="subjectError" id="ticket-subject-error" severity="error" size="small" variant="simple">
        {{ subjectError }}
      </Message>
    </div>

    <div class="field">
      <label id="modal-status-label" for="modal-status">Status</label>
      <Select
        input-id="modal-status"
        aria-labelledby="modal-status-label"
        :model-value="status"
        :options="[...STATUSES]"
        data-testid="modal-status-button"
        @update:model-value="onStatusChange"
      />
    </div>

    <div class="field">
      <label id="modal-priority-label" for="modal-priority">Priority</label>
      <Select
        input-id="modal-priority"
        aria-labelledby="modal-priority-label"
        :model-value="priority"
        :options="[...PRIORITIES]"
        data-testid="modal-priority-button"
        @update:model-value="onPriorityChange"
      />
    </div>

    <div class="field">
      <label id="modal-assignee-label" for="modal-assignee">Assignee</label>
      <Select
        input-id="modal-assignee"
        aria-labelledby="modal-assignee-label"
        :model-value="assignee"
        :options="[...assignees, 'Unassigned']"
        data-testid="modal-assignee-button"
        @update:model-value="onAssigneeChange"
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

    <template #footer>
      <Button type="button" label="Cancel" severity="secondary" @click="requestClose" />
      <Button type="button" label="Save" @click="save" />
    </template>
  </Dialog>
</template>
