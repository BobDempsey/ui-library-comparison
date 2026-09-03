import { useEffect, useRef, useState, type RefObject } from 'react';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { formatDate, formatRelative } from '../format.js';
import { useToasts } from '../toasts/ToastContext.js';
import { SingleSelectField } from './SingleSelectField.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.js';
import { Button } from '@/components/ui/button.js';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from '@/components/ui/dialog.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';

/**
 * Section 6. Radix's Dialog gives `role="dialog"`, `aria-modal="true"`, the
 * title association, and the focus trap for free. Focus return is *not*
 * free here: Radix's Dialog restores focus to its own `<Dialog.Trigger>` on
 * close (see `@radix-ui/react-dialog`'s `DialogContentModal`, which composes
 * `onCloseAutoFocus` with `context.triggerRef.current?.focus()` and always
 * calls `preventDefault()`, skipping the generic "whatever was focused
 * before" fallback `FocusScope` otherwise provides). This screen opens the
 * dialog from a table row via controlled `open` state rather than a
 * `Dialog.Trigger`, so `triggerRef` is never populated and that restore is a
 * silent no-op. `returnFocusRef` below is the hand-built replacement: the
 * row that opened the dialog is captured by `TicketsTable` and focused
 * explicitly in `onCloseAutoFocus`. The initial-focus target (first field) is
 * left to Radix's default, which lands on the first tabbable element inside
 * the content — the Subject input, here. Validation, touched tracking, and
 * the unsaved-changes confirmation (a Radix AlertDialog, which cannot be
 * dismissed by an outside click the way a plain Dialog can) are hand built.
 */
export function RecordModal({
  ticket,
  assignees,
  returnFocusRef,
  onClose,
  onSave,
}: {
  ticket: Ticket | null;
  assignees: readonly string[];
  /** The row that opened the dialog, focused again once it closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
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
  const subjectRef = useRef<HTMLInputElement>(null);
  const toasts = useToasts();

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
    toasts.push(`Ticket ${ticket.id} updated`, 4000);
    onClose();
  };

  return (
    <>
      <Dialog open onOpenChange={(next) => !next && requestClose()}>
        <DialogContent
          data-testid="record-dialog"
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onInteractOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onCloseAutoFocus={(event) => {
            // Radix's own restore targets `Dialog.Trigger`, which this screen
            // does not use (see the comment above). Focus the originating
            // row explicitly instead.
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <DialogTitle>
            {ticket.id}: {ticket.subject}
          </DialogTitle>

          <div className="flex justify-between text-sm">
            <span className="font-semibold">ID</span>
            <span>{ticket.id}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-subject">Subject</Label>
            <Input
              id="ticket-subject"
              ref={subjectRef}
              type="text"
              value={subject}
              aria-invalid={subjectError ? true : undefined}
              aria-describedby={subjectError ? 'ticket-subject-error' : undefined}
              onChange={(event) => {
                setSubject(event.target.value);
                setTouched(true);
                setSubjectError(null);
              }}
            />
            {subjectError ? (
              <p id="ticket-subject-error" role="alert" className="text-sm text-destructive">
                {subjectError}
              </p>
            ) : null}
          </div>

          <SingleSelectField<Status>
            id="modal-status"
            testId="modal-status"
            label="Status"
            options={STATUSES}
            value={status}
            onChange={(value) => {
              if (value) {
                setStatus(value);
                setTouched(true);
              }
            }}
          />

          <SingleSelectField<Priority>
            id="modal-priority"
            testId="modal-priority"
            label="Priority"
            options={PRIORITIES}
            value={priority}
            onChange={(value) => {
              if (value) {
                setPriority(value);
                setTouched(true);
              }
            }}
          />

          <SingleSelectField<string>
            id="modal-assignee"
            testId="modal-assignee"
            label="Assignee"
            options={assignees}
            value={assignee}
            onChange={(value) => {
              setAssignee(value);
              setTouched(true);
            }}
            nullOption="Unassigned"
          />

          <div className="flex justify-between text-sm">
            <span className="font-semibold">Created</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold">Updated</span>
            <span>{formatRelative(ticket.updatedAt)}</span>
          </div>

          <DialogFooter>
            <Button type="button" onClick={save}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="confirm-dialog">
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>Closing now loses the edits made to this ticket.</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button type="button" variant="destructive" onClick={discard}>
                Discard changes
              </Button>
            </AlertDialogAction>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Keep editing
              </Button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
