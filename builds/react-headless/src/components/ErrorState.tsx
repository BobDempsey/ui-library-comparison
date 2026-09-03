/** Section 8: the forced error state, with a Retry that reloads the fixture. */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" data-testid="table-empty-state" data-kind="error">
      <p>{message}</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
