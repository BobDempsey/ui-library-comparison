export const STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

/** Section 3 of the screen spec. Field order here is the source order, not the column order. */
export interface Ticket {
  /** `TCK-0001`, unique, displayed */
  id: string;
  /** 1 to 120 characters */
  subject: string;
  status: Status;
  priority: Priority;
  /** null renders as `Unassigned` */
  assignee: string | null;
  /** ISO 8601, displayed as `MMM d, yyyy` */
  createdAt: string;
  /** ISO 8601, displayed as a relative time */
  updatedAt: string;
}

export const TICKET_COUNT = 240;
export const PAGE_SIZE = 25;
export const SUBJECT_MAX = 120;
