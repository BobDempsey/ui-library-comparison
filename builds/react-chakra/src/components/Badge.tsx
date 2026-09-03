import { Badge as ChakraBadge } from '@chakra-ui/react';
import type { Priority, Status } from '@bakeoff/fixture';

const STATUS_PALETTE: Record<Status, string> = {
  open: 'blue',
  pending: 'yellow',
  resolved: 'green',
  closed: 'gray',
};

const PRIORITY_PALETTE: Record<Priority, string> = {
  low: 'gray',
  normal: 'blue',
  high: 'orange',
  urgent: 'red',
};

/** Section 3: status and priority render as badges, using Chakra's `Badge`. */
export function Badge({ kind, value }: { kind: 'status' | 'priority'; value: Status | Priority }) {
  const palette = kind === 'status' ? STATUS_PALETTE[value as Status] : PRIORITY_PALETTE[value as Priority];
  return (
    <ChakraBadge colorPalette={palette} textTransform="capitalize" data-testid={`badge-${kind}`}>
      {value}
    </ChakraBadge>
  );
}
