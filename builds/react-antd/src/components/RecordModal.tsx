import { useEffect, useRef, useState } from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import type { InputRef } from 'antd';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@bakeoff/fixture';
import { useToasts } from '../toasts/ToastContext.js';
import { formatDate, formatRelative } from '../format.js';

const STATUS_OPTIONS = STATUSES.map((value) => ({ value, label: value }));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: value }));

/**
 * Section 6. Ant Design's `Modal` supplies `role="dialog"`, `aria-modal`, the
 * title-to-`aria-labelledby` association, and a Tab focus trap between two
 * sentinel elements, all from `rc-dialog`. Everything else here is hand built:
 * moving focus to the Subject field rather than Ant Design's own sentinel,
 * returning focus to the row that opened the dialog (`focusTriggerAfterClose`
 * is turned off and the return is done explicitly, since the library's own
 * version only fires after its close animation settles and nothing about the
 * fixed 25-row page guarantees the same row instance survives from open to
 * close), the touched-state unsaved-changes confirmation, and the subject
 * validation with its field-level error.
 */
export function RecordModal({
  ticket,
  assignees,
  opener,
  onClose,
  onSave,
}: {
  ticket: Ticket | null;
  assignees: readonly string[];
  opener: HTMLElement | null;
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
  const subjectRef = useRef<InputRef>(null);
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
    subjectRef.current?.focus();
  }, [ticket]);

  if (!ticket) return null;

  const close = () => {
    onClose();
    opener?.focus();
  };

  const requestClose = () => {
    if (touched) {
      setConfirmOpen(true);
      return;
    }
    close();
  };

  const discard = () => {
    setConfirmOpen(false);
    close();
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
    close();
  };

  return (
    <>
      <Modal
        open
        onCancel={requestClose}
        title={`${ticket.id}: ${ticket.subject}`}
        data-testid="record-dialog"
        focusTriggerAfterClose={false}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={requestClose}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={save}>
            Save
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <div className="field read-only-field">
            <span className="field-label">ID</span>
            <span>{ticket.id}</span>
          </div>

          <Form.Item label="Subject" htmlFor="ticket-subject" className="field">
            <Input
              id="ticket-subject"
              data-testid="modal-subject-input"
              ref={subjectRef}
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
              <p id="ticket-subject-error" role="alert" className="field-error">
                {subjectError}
              </p>
            ) : null}
          </Form.Item>

          <Form.Item label="Status" htmlFor="modal-status" className="field">
            <Select<Status>
              id="modal-status"
              data-testid="modal-status-select"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatus(value);
                setTouched(true);
              }}
            />
          </Form.Item>

          <Form.Item label="Priority" htmlFor="modal-priority" className="field">
            <Select<Priority>
              id="modal-priority"
              data-testid="modal-priority-select"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={(value) => {
                setPriority(value);
                setTouched(true);
              }}
            />
          </Form.Item>

          <Form.Item label="Assignee" htmlFor="modal-assignee" className="field">
            <Select<string | null>
              id="modal-assignee"
              data-testid="modal-assignee-select"
              value={assignee}
              options={[{ value: null, label: 'Unassigned' }, ...assignees.map((name) => ({ value: name, label: name }))]}
              onChange={(value) => {
                setAssignee(value);
                setTouched(true);
              }}
            />
          </Form.Item>

          <div className="field read-only-field">
            <span className="field-label">Created</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
          <div className="field read-only-field">
            <span className="field-label">Updated</span>
            <span>{formatRelative(ticket.updatedAt)}</span>
          </div>
        </Form>
      </Modal>

      {confirmOpen ? (
        // Rendered only while open, rather than an always-mounted Modal toggling
        // its `open` prop: `confirmIsOpen()` in the adapter is a synchronous read,
        // and rc-dialog keeps its root element in the DOM through its close
        // animation (out of scope per section 12 anyway), which a presence check
        // would misread as still open. Conditional rendering removes it from the
        // DOM in the same commit the state change causes.
        <Modal
          open
          onCancel={() => setConfirmOpen(false)}
          title="Discard unsaved changes?"
          data-testid="confirm-dialog"
          footer={[
            <Button key="keep" onClick={() => setConfirmOpen(false)}>
              Keep editing
            </Button>,
            <Button key="discard" danger onClick={discard}>
              Discard changes
            </Button>,
          ]}
        >
          <p>Closing now loses the edits made to this ticket.</p>
        </Modal>
      ) : null}
    </>
  );
}
