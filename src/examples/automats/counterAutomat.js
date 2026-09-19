import { Automat } from '../../lib/index.js';

/**
 * A local-memory automat with no API backend.
 *
 * State: { count: number }
 *
 * Actions close over the automat instance and drive all state transitions.
 * Multiple React components can subscribe — they all stay in sync through
 * the automat's subscriber set, never through React's prop drilling.
 */
const counterAutomat = new Automat(
  { count: 0 },
  {
    increment(amount = 1) {
      const { count } = counterAutomat.getState();
      const step = typeof amount === 'number' ? amount : 1;
      counterAutomat.setState({ count: count + step });
    },
    decrement(amount = 1) {
      const { count } = counterAutomat.getState();
      const step = typeof amount === 'number' ? amount : 1;
      counterAutomat.setState({ count: count - step });
    },
    reset() {
      counterAutomat.setState({ count: 0 });
    },
  }
);

export default counterAutomat;
