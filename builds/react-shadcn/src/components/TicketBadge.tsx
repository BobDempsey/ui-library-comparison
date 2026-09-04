import type { Priority, Status } from '@uilc/fixture';
import { Badge } from '@/components/ui/badge.js';

/** Section 3: status and priority render as badges. shadcn/ui's Badge supplies the shape; the status/priority tone map is ours. */
export function TicketBadge({ value }: { value: Status | Priority }) {
  return <Badge tone={value}>{value}</Badge>;
}
