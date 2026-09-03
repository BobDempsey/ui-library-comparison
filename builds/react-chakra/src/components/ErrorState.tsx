import { Button, EmptyState, VStack } from '@chakra-ui/react';

/** Section 8: the forced error state, with a Retry that reloads the fixture. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState.Root data-testid="table-empty-state" data-kind="error" role="alert" size="lg">
      <EmptyState.Content>
        <VStack textAlign="center">
          <EmptyState.Description>{message}</EmptyState.Description>
          <Button type="button" onClick={onRetry}>
            Retry
          </Button>
        </VStack>
      </EmptyState.Content>
    </EmptyState.Root>
  );
}
