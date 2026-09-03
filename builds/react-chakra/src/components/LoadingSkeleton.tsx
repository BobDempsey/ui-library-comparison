import { Skeleton, Table, VisuallyHidden } from '@chakra-ui/react';

/**
 * Section 8: a skeleton of 5 rows, held for the fixed delay inside `loadTickets`.
 * The bars are Chakra's `Skeleton`, a real library component; the table
 * structure around it is plain, so the loading state still reads as a table
 * to assistive tech.
 */
export function LoadingSkeleton() {
  return (
    <Table.ScrollArea data-testid="loading-skeleton" role="status" aria-label="Loading tickets">
      <Table.Root>
        <VisuallyHidden asChild>
          <caption>Support tickets, loading</caption>
        </VisuallyHidden>
        <Table.Body>
          {Array.from({ length: 5 }, (_, i) => (
            <Table.Row key={i}>
              <Table.Cell colSpan={7}>
                <Skeleton height="1rem" aria-hidden="true" />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
