import { onMounted, ref, watch, type Ref } from 'vue';
import { loadTickets, type FixtureOptions, type Ticket } from '@bakeoff/fixture';

export type TicketDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: Ticket[] };

export interface TicketDataApi {
  state: Ref<TicketDataState>;
  retry: () => void;
}

/**
 * Section 8's loading, error, and retry states. The `fail` flag from the fixture
 * options only forces the first attempt: a Retry re-requests the real data, the
 * way a network hiccup would behave against a server that is up.
 */
export function useTicketData(options: FixtureOptions): TicketDataApi {
  const state = ref<TicketDataState>({ status: 'loading' }) as Ref<TicketDataState>;
  const attempt = ref(0);

  async function run() {
    state.value = { status: 'loading' };
    const opts = attempt.value === 0 ? options : { ...options, fail: false };
    try {
      const rows = await loadTickets(opts);
      state.value = { status: 'ready', rows: [...rows] };
    } catch (cause) {
      state.value = { status: 'error', message: (cause as Error).message };
    }
  }

  onMounted(run);
  watch(attempt, run);

  const retry = () => {
    attempt.value += 1;
  };

  return { state, retry };
}
