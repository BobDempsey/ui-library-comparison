import { Button, EmptyState, VStack } from '@chakra-ui/react';

export type TableEmptyKind = 'no-tickets' | 'no-matches';

/**
 * Section 8's two in-table empty states: the fixture starting empty, and a
 * filter matching nothing. Chakra's `EmptyState` supplies the layout
 * (indicator, title/description slot, actions); the per-kind message and
 * action wiring are ours.
 */
export function TableEmptyState({
  kind,
  message,
  onAction,
}: {
  kind: TableEmptyKind;
  message: string;
  onAction: () => void;
}) {
  return (
    <EmptyState.Root data-testid="table-empty-state" data-kind={kind} size="sm">
      <EmptyState.Content>
        <VStack textAlign="center">
          <EmptyState.Description>{message}</EmptyState.Description>
          {kind === 'no-matches' ? (
            <Button type="button" size="sm" onClick={onAction}>
              Clear filters
            </Button>
          ) : null}
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
