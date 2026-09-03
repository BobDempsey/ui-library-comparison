import { Table, TableBody, TableCaption, TableCell, TableRow } from '@/components/ui/table.js';

/** Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. */
export function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
      <Table>
        <TableCaption className="visually-hidden">Support tickets, loading</TableCaption>
        <TableBody>
          {Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={7}>
                <span className="block h-4 animate-pulse rounded bg-secondary" aria-hidden="true" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
