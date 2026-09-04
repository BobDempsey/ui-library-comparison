import { Chip } from '@mui/material';
import type { Priority, Status } from '@uilc/fixture';

const STATUS_COLOR: Record<Status, 'info' | 'warning' | 'success' | 'default'> = {
  open: 'info',
  pending: 'warning',
  resolved: 'success',
  closed: 'default',
};

const PRIORITY_COLOR: Record<Priority, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  normal: 'info',
  high: 'warning',
  urgent: 'error',
};

/** Section 3: status and priority render as badges. Material UI's `Chip` covers this directly. */
export function Badge({ kind, value }: { kind: 'status' | 'priority'; value: Status | Priority }) {
  const color = kind === 'status' ? STATUS_COLOR[value as Status] : PRIORITY_COLOR[value as Priority];
  return <Chip size="small" label={value} color={color} variant="outlined" />;
}
