import { Alert, Button } from '@mui/material';

/** Section 8: the forced error state, with a Retry that reloads the fixture. Alert's default role is "alert". */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert severity="error" data-testid="table-empty-state" data-kind="error" action={
      <Button color="inherit" size="small" onClick={onRetry}>
        Retry
      </Button>
    }>
      <span data-testid="empty-state-message">{message}</span>
    </Alert>
  );
}
