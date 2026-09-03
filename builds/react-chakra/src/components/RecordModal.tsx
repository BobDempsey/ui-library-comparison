import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Button, Dialog, Field, HStack, Input, NativeSelect, Stack, Text } from '@chakra-ui/react';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { formatDate, formatRelative } from '../format.js';
import { pushToast } from '../toasts.js';

const UNASSIGNED = 'Unassigned';

/**
 * Section 6. Chakra's `Dialog` (Ark UI underneath) supplies `role="dialog"`,
 * `aria-modal="true"`, the title association, the focus trap, and focus
 * return to the row that opened it. Validation, the touched tracking, and the
 * unsaved-changes confirmation are hand built on top, the same as they would
 * be for any dialog primitive: section 6's rules are specific to this screen,
 * not something a generic dialog ships.
 */
export function RecordModal({
  ticket,
  assignees,
  onClose,
  onSave,
}: {
  ticket: Ticket | null;
  assignees: readonly string[];
  onClose: () => void;
  onSave: (updated: Ticket) => void;
}) {
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<Status>('open');
  const [priority, setPriority] = useState<Priority>('normal');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setSubject(ticket.subject);
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setAssignee(ticket.assignee);
    setTouched(false);
    setSubjectError(null);
    setConfirmOpen(false);
  }, [ticket]);

  if (!ticket) return null;

  const requestClose = () => {
    if (touched) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  };

  const discard = () => {
    setConfirmOpen(false);
    onClose();
  };

  const save = () => {
    const length = subject.length;
    if (length === 0) {
      setSubjectError('Subject is required.');
      return;
    }
    if (length > SUBJECT_MAX) {
      setSubjectError(`Subject must be ${SUBJECT_MAX} characters or fewer.`);
      return;
    }
    onSave({ ...ticket, subject, status, priority, assignee });
    pushToast(`Ticket ${ticket.id} updated`, 4000);
    onClose();
  };

  const onSubjectChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSubject(event.target.value);
    setTouched(true);
    setSubjectError(null);
  };

  const onStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setStatus(event.target.value as Status);
    setTouched(true);
  };

  const onPriorityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setPriority(event.target.value as Priority);
    setTouched(true);
  };

  const onAssigneeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setAssignee(event.target.value === '' ? null : event.target.value);
    setTouched(true);
  };

  return (
    <>
      <Dialog.Root
        open
        role="dialog"
        onOpenChange={(details) => {
          if (!details.open) requestClose();
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="record-dialog" maxW="30rem">
            <Dialog.Header>
              <Dialog.Title>
                {ticket.id}: {ticket.subject}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <HStack justify="space-between">
                  <Text fontWeight="semibold">ID</Text>
                  <Text>{ticket.id}</Text>
                </HStack>

                <Field.Root invalid={!!subjectError}>
                  <Field.Label htmlFor="ticket-subject">Subject</Field.Label>
                  <Input
                    id="ticket-subject"
                    value={subject}
                    aria-invalid={subjectError ? true : undefined}
                    aria-describedby={subjectError ? 'ticket-subject-error' : undefined}
                    onChange={onSubjectChange}
                  />
                  <Field.ErrorText id="ticket-subject-error">{subjectError}</Field.ErrorText>
                </Field.Root>

                <Field.Root>
                  <Field.Label htmlFor="modal-status">Status</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      id="modal-status"
                      data-testid="modal-status"
                      value={status}
                      onChange={onStatusChange}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label htmlFor="modal-priority">Priority</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      id="modal-priority"
                      data-testid="modal-priority"
                      value={priority}
                      onChange={onPriorityChange}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Field.Root>
                  <Field.Label htmlFor="modal-assignee">Assignee</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      id="modal-assignee"
                      data-testid="modal-assignee"
                      value={assignee ?? UNASSIGNED}
                      onChange={onAssigneeChange}
                    >
                      {assignees.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value={UNASSIGNED}>{UNASSIGNED}</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <HStack justify="space-between">
                  <Text fontWeight="semibold">Created</Text>
                  <Text>{formatDate(ticket.createdAt)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">Updated</Text>
                  <Text>{formatRelative(ticket.updatedAt)}</Text>
                </HStack>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" onClick={requestClose} variant="outline">
                Cancel
              </Button>
              <Button type="button" onClick={save}>
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={confirmOpen}
        role="alertdialog"
        onOpenChange={(details) => {
          if (!details.open) setConfirmOpen(false);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="confirm-dialog" maxW="24rem">
            <Dialog.Header>
              <Dialog.Title>Discard unsaved changes?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>Closing now loses the edits made to this ticket.</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </Button>
              <Button type="button" onClick={discard}>
                Discard changes
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}
