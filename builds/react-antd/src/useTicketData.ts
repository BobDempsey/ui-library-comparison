import { useCallback, useEffect, useRef, useState } from 'react';
import { loadTickets, type FixtureOptions, type Ticket } from '@bakeoff/fixture';

export type TicketDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: Ticket[] };

/**
 * Section 8's loading, error, and retry states. The `fail` flag from the fixture
 * options only forces the first attempt: a Retry re-requests the real data, the
 * way a network hiccup would behave against a server that is up.
 */
export function useTicketData(options: FixtureOptions): { state: TicketDataState; retry: () => void } {
  const [state, setState] = useState<TicketDataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    const opts = attempt === 0 ? optionsRef.current : { ...optionsRef.current, fail: false };
    loadTickets(opts)
      .then((rows) => {
        if (live) setState({ status: 'ready', rows: [...rows] });
      })
      .catch((cause: Error) => {
        if (live) setState({ status: 'error', message: cause.message });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}
