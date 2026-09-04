import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { PRIORITIES, STATUSES, SUBJECT_MAX, type Priority, type Status, type Ticket } from '@uilc/fixture';
import { useToasts } from '../toasts/ToastContext.js';
import { formatDate, formatRelative } from '../format.js';

const UNASSIGNED = 'Unassigned';

/**
 * Section 6. Material UI's `Dialog` gives `role="dialog"`, `aria-modal="true"`,
 * a real focus trap, and focus return to whatever had focus before the dialog
 * opened, all through its underlying `Modal`. `aria-labelledby` is wired
 * explicitly to the title's id rather than relied on implicitly. Validation,
 * the touched tracking, and the unsaved-changes confirmation are hand built.
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
      <Dialog
        open
        onClose={requestClose}
        aria-labelledby="record-dialog-title"
        data-testid="record-dialog"
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle id="record-dialog-title">
          {ticket.id}: {ticket.subject}
        </DialogTitle>
        <DialogContent className="record-dialog-content">
          <Box className="field read-only-field">
            <span className="field-label">ID</span>
            <span>{ticket.id}</span>
          </Box>

          <TextField
            id="ticket-subject"
            label="Subject"
            autoFocus
            fullWidth
            margin="dense"
            value={subject}
            error={subjectError !== null}
            helperText={subjectError}
            onChange={(event) => {
              setSubject(event.target.value);
              setTouched(true);
              setSubjectError(null);
            }}
          />

          <FormControl fullWidth margin="dense" data-testid="modal-status-field">
            <InputLabel id="modal-status-label">Status</InputLabel>
            <Select
              labelId="modal-status-label"
              label="Status"
              value={status}
              onChange={(event: SelectChangeEvent<Status>) => {
                setStatus(event.target.value as Status);
                setTouched(true);
              }}
            >
              {STATUSES.map((option) => (
                <MenuItem key={option} value={option} data-testid={`modal-status-option-${option}`}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" data-testid="modal-priority-field">
            <InputLabel id="modal-priority-label">Priority</InputLabel>
            <Select
              labelId="modal-priority-label"
              label="Priority"
              value={priority}
              onChange={(event: SelectChangeEvent<Priority>) => {
                setPriority(event.target.value as Priority);
                setTouched(true);
              }}
            >
              {PRIORITIES.map((option) => (
                <MenuItem key={option} value={option} data-testid={`modal-priority-option-${option}`}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" data-testid="modal-assignee-field">
            <InputLabel id="modal-assignee-label">Assignee</InputLabel>
            <Select
              labelId="modal-assignee-label"
              label="Assignee"
              value={assignee ?? UNASSIGNED}
              onChange={(event: SelectChangeEvent<string>) => {
                setAssignee(event.target.value === UNASSIGNED ? null : event.target.value);
                setTouched(true);
              }}
            >
              <MenuItem value={UNASSIGNED} data-testid="modal-assignee-option-Unassigned">
                {UNASSIGNED}
              </MenuItem>
              {assignees.map((name) => (
                <MenuItem key={name} value={name} data-testid={`modal-assignee-option-${name}`}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box className="field read-only-field">
            <span className="field-label">Created</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </Box>
          <Box className="field read-only-field">
            <span className="field-label">Updated</span>
            <span>{formatRelative(ticket.updatedAt)}</span>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={save}>
            Save
          </Button>
          <Button type="button" onClick={requestClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="confirm-dialog-title"
        data-testid="confirm-dialog"
        PaperProps={{ role: 'alertdialog' }}
      >
        <DialogTitle id="confirm-dialog-title">Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <Typography>Closing now loses the edits made to this ticket.</Typography>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={discard}>
            Discard changes
          </Button>
          <Button type="button" onClick={() => setConfirmOpen(false)}>
            Keep editing
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
