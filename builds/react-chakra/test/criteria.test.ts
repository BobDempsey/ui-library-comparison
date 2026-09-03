import { runCriteria } from '@bakeoff/criteria';
import { createAdapter } from './adapter.js';

/**
 * The whole test file. The 18 criteria live in @bakeoff/criteria and run against
 * every build, so there is nothing to add here. If a criterion looks wrong, ask
 * the phase one owner. Do not add a local test that changes what passing means.
 */
runCriteria('react-chakra', createAdapter);
