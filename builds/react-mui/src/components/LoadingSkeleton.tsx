import { Skeleton, Table, TableBody, TableCell, TableRow } from '@mui/material';

/** Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`. */
export function LoadingSkeleton() {
  return (
    <div data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
      <Table>
        <caption className="visually-hidden">Support tickets, loading</caption>
        <TableBody>
          {Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={7}>
                <Skeleton variant="text" height={24} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
