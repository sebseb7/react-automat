import { Automat } from '../../lib/index.js';

/**
 * Normal shared Automat (like Example 1 counter), holding an index value.
 * The right-side component uses this value to lookup, dynamically instantiate,
 * and resubscribe to a different Automat stored in window.automats Map.
 */
export const indexAutomat = new Automat(
  { index: 0 },
  {
    increment(step = 1) {
      indexAutomat.setState({ index: indexAutomat.state.index + step });
    },
    decrement(step = 1) {
      const next = Math.max(0, indexAutomat.state.index - step);
      indexAutomat.setState({ index: next });
    },
    setIndex(index) {
      indexAutomat.setState({ index: Math.max(0, Number(index) || 0) });
    },
  }
);

/**
 * Global Map on window holding dynamically instantiated Automats per index.
 */
if (typeof window !== 'undefined' && !window.automats) {
  window.automats = new Map();
}

/**
 * Accesses or dynamically instantiates an Automat in window.automats for the given index.
 *
 * @param {number} index
 * @returns {Automat}
 */
export function getOrCreateSlotAutomat(index) {
  const map = typeof window !== 'undefined' ? window.automats : null;
  if (!map) {
    return new Automat({ index, clicks: 0, notes: `Slot #${index}` });
  }

  if (!map.has(index)) {
    const slotAutomat = new Automat(
      {
        index,
        clicks: 0,
        notes: `Notes for slot #${index}`,
        lastModified: new Date().toLocaleTimeString(),
      },
      {
        click() {
          slotAutomat.setState({
            clicks: slotAutomat.state.clicks + 1,
            lastModified: new Date().toLocaleTimeString(),
          });
        },
        setNotes(notes) {
          slotAutomat.setState({
            notes,
            lastModified: new Date().toLocaleTimeString(),
          });
        },
        reset() {
          slotAutomat.setState({
            clicks: 0,
            lastModified: new Date().toLocaleTimeString(),
          });
        },
      }
    );
    map.set(index, slotAutomat);
  }

  return map.get(index);
}
