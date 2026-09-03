import { Button } from 'antd';

/**
 * Section 8: the forced error state, with a Retry that reloads the fixture.
 * Ant Design's `Result` component would do the visual layout, but it adds
 * roughly 44 KB gzipped on its own for a state this simple; the message and
 * the button are plain markup instead, reusing the `Button` already paid for
 * everywhere else on the screen.
 */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" data-testid="table-empty-state" data-kind="error" className="error-state">
      <p>{message}</p>
      <Button type="primary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
