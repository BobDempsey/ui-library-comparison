import { Tag } from 'antd';
import type { Priority, Status } from '@uilc/fixture';

const STATUS_COLOR: Record<Status, string> = {
  open: 'blue',
  pending: 'gold',
  resolved: 'green',
  closed: 'default',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: 'default',
  normal: 'cyan',
  high: 'orange',
  urgent: 'red',
};

/** Section 3: status and priority render as badges. Ant Design's `Tag` supplies the shape for free. */
export function Badge({ kind, value }: { kind: 'status' | 'priority'; value: Status | Priority }) {
  const color = kind === 'status' ? STATUS_COLOR[value as Status] : PRIORITY_COLOR[value as Priority];
  return <Tag color={color}>{value}</Tag>;
}
