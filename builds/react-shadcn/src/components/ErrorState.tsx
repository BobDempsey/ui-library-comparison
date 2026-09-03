import { Button } from '@/components/ui/button.js';

/** Section 8: the forced error state, with a Retry that reloads the fixture. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" data-testid="table-empty-state" data-kind="error" className="rounded-md border border-border bg-surface p-6 text-center">
      <p className="mb-3">{message}</p>
      <Button type="button" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
