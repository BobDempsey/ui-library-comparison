import { useEffect, useState } from 'react';
import { loadTickets, type FixtureOptions, type Ticket } from '@uilc/fixture';

/**
 * The screen from sections 2 to 8: a filterable table, a filter form above it, a
 * record modal, and toasts. Build it with __LIBRARY__ and split this file up as
 * it grows; `measure` counts every line under `src/`.
 *
 * The props exist so the test adapter can force the empty and error states from
 * section 8 without a network layer to stub.
 */
export function TicketsScreen({ fixture = {} }: { fixture?: FixtureOptions }) {
  const [rows, setRows] = useState<readonly Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null);
    setError(null);
    loadTickets(fixture)
      .then((loaded) => live && setRows(loaded))
      .catch((cause: Error) => live && setError(cause.message));
    return () => {
      live = false;
    };
  }, [fixture]);

  if (error) return <p role="alert">{error}</p>;
  if (rows === null) return <p>Loading</p>;

  // Start here. The skeleton, the table, the filter form, the modal, and the
  // toasts all still have to be built against the spec.
  return <p>{rows.length} tickets loaded. Build the screen.</p>;
}
