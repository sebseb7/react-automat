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
 * Global Map on window holding dynamically instantiated slot Automats per index.
 */
if (typeof window !== 'undefined' && !window.automats) {
  window.automats = new Map();
}

/**
 * Accesses or dynamically instantiates a named Automat in the window object for the given index.
 * Demonstrates named automats and window-level persistence: `persist: false`.
 *
 * @param {number} index
 * @returns {Automat}
 */
export function getOrCreateSlotAutomat(index) {
  const name = `slot_${index}`;
  let slotAutomat = Automat.get(name);

  if (!slotAutomat) {
    slotAutomat = new Automat(
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
      },
      { name, persist: false } // Named automat persisted to window object
    );
    if (typeof window !== 'undefined' && window.automats) {
      window.automats.set(index, slotAutomat);
    }
  }

  return slotAutomat;
}
