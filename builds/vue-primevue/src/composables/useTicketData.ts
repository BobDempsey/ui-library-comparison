import { type Ref, ref, watch } from 'vue';
import { loadTickets, type FixtureOptions, type Ticket } from '@uilc/fixture';

export type TicketDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: Ticket[] };

/**
 * Section 8's loading, error, and retry states. The `fail` flag from the fixture
 * options only forces the first attempt: a Retry re-requests the real data, the
 * way a network hiccup would behave against a server that is up.
 */
export function useTicketData(fixture: Ref<FixtureOptions>): { state: Ref<TicketDataState>; retry: () => void } {
  const state = ref<TicketDataState>({ status: 'loading' }) as Ref<TicketDataState>;
  let attempt = 0;
  let live = 0;

  const load = () => {
    const token = (live += 1);
    state.value = { status: 'loading' };
    const opts = attempt === 0 ? fixture.value : { ...fixture.value, fail: false };
    loadTickets(opts)
      .then((rows) => {
        if (token === live) state.value = { status: 'ready', rows: [...rows] };
      })
      .catch((cause: Error) => {
        if (token === live) state.value = { status: 'error', message: cause.message };
      });
  };

  watch(fixture, load, { immediate: true });

  const retry = () => {
    attempt += 1;
    load();
  };

  return { state, retry };
}
