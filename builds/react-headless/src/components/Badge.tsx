import type { Priority, Status } from '@uilc/fixture';

/** Section 3: status and priority render as badges. Plain elements, no Headless UI component covers this. */
export function Badge({ kind, value }: { kind: 'status' | 'priority'; value: Status | Priority }) {
  return <span className={`badge badge-${kind}-${value}`}>{value}</span>;
}
