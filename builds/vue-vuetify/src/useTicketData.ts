import { ref, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import { loadTickets, type FixtureOptions, type Ticket } from '@bakeoff/fixture';

export type TicketDataStatus = 'loading' | 'error' | 'ready';

export interface TicketDataApi {
  status: Ref<TicketDataStatus>;
  errorMessage: Ref<string | null>;
  rows: ShallowRef<Ticket[]>;
  retry(): void;
}

/**
 * Section 8's loading, error, and retry states. The `fail` flag from the fixture
 * options only forces the first attempt: a Retry re-requests the real data, the
 * way a network hiccup would behave against a server that is up. Mirrors
 * `builds/react-headless/src/useTicketData.ts`, ported to the composition API.
 */
export function useTicketData(fixture: FixtureOptions): TicketDataApi {
  const status = ref<TicketDataStatus>('loading');
  const errorMessage = ref<string | null>(null);
  const rows = shallowRef<Ticket[]>([]);
  const attempt = ref(0);

  const run = async (): Promise<void> => {
    status.value = 'loading';
    errorMessage.value = null;
    const opts = attempt.value === 0 ? fixture : { ...fixture, fail: false };
    try {
      const loaded = await loadTickets(opts);
      rows.value = [...loaded];
      status.value = 'ready';
    } catch (cause) {
      errorMessage.value = (cause as Error).message;
      status.value = 'error';
    }
  };

  watch(attempt, run, { immediate: true });

  return {
    status,
    errorMessage,
    rows,
    retry: () => {
      attempt.value += 1;
    },
  };
}
