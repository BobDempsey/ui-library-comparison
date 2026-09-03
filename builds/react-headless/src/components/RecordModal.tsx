import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { PRIORITIES, STATUSES, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { SUBJECT_MAX } from '@bakeoff/fixture';
import { SingleSelectField } from './SingleSelectField.js';
import { useToasts } from '../toasts/ToastContext.js';
import { formatDate, formatRelative } from '../format.js';

/**
 * Section 6. Headless UI's `Dialog` gives the `role="dialog"`, `aria-modal`, the
 * title association, the focus trap, and focus-return to whatever had focus
 * before the dialog opened. Validation, the touched tracking, and the
 * unsaved-changes confirmation are hand built on top.
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
    const trimmedLength = subject.length;
    if (trimmedLength === 0) {
      setSubjectError('Subject is required.');
      return;
    }
    if (trimmedLength > SUBJECT_MAX) {
      setSubjectError(`Subject must be ${SUBJECT_MAX} characters or fewer.`);
      return;
    }
    onSave({ ...ticket, subject, status, priority, assignee });
    toasts.push(`Ticket ${ticket.id} updated`, 4000);
    onClose();
  };

  return (
    <>
      <Dialog open onClose={requestClose} className="record-dialog" data-testid="record-dialog">
        <div className="dialog-backdrop" aria-hidden="true" />
        <div className="dialog-frame">
          <DialogPanel>
            <DialogTitle>
              {ticket.id}: {ticket.subject}
            </DialogTitle>

            <div className="field read-only-field">
              <span className="field-label">ID</span>
              <span>{ticket.id}</span>
            </div>

            <div className="field">
              <label htmlFor="ticket-subject">Subject</label>
              <input
                id="ticket-subject"
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
                <p id="ticket-subject-error" role="alert">
                  {subjectError}
                </p>
              ) : null}
            </div>

            <SingleSelectField<Status>
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

            <div className="field read-only-field">
              <span className="field-label">Created</span>
              <span>{formatDate(ticket.createdAt)}</span>
            </div>
            <div className="field read-only-field">
              <span className="field-label">Updated</span>
              <span>{formatRelative(ticket.updatedAt)}</span>
            </div>

            <div className="dialog-actions">
              <button type="button" onClick={save}>
                Save
              </button>
              <button type="button" onClick={requestClose}>
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        role="alertdialog"
        className="confirm-dialog"
        data-testid="confirm-dialog"
      >
        <div className="dialog-backdrop" aria-hidden="true" />
        <div className="dialog-frame">
          <DialogPanel>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <p>Closing now loses the edits made to this ticket.</p>
            <div className="dialog-actions">
              <button type="button" onClick={discard}>
                Discard changes
              </button>
              <button type="button" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
