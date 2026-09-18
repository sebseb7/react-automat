import { Automat } from '../../lib/index.js';

let nextId = 4;

/**
 * Cart Automat managing a list of items and checkout metadata.
 *
 * Demonstrates:
 * 1. Partial state subscription: Subscribers who only care about cart badge quantity
 *    (list length) can subscribe to `state.items.length` without re-rendering when
 *    item quantities, prices, names, or coupon codes mutate.
 * 2. IndexedDB persistence (`persist: true`): Cart state persists across full browser reloads.
 */
export const cartAutomat = new Automat(
  {
    items: [
      { id: 1, name: 'Mechanical Keyboard', price: 129, quantity: 1 },
      { id: 2, name: 'Wireless Mouse', price: 79, quantity: 2 },
      { id: 3, name: 'Desk Mat (Gruvbox)', price: 29, quantity: 1 },
    ],
    couponCode: '',
  },
  {
    addItem(name = 'USB Hub', price = 35) {
      const { items } = cartAutomat.state;
      cartAutomat.setState({
        items: [
          ...items,
          { id: nextId++, name, price, quantity: 1 },
        ],
      });
    },

    removeItem(id) {
      const { items } = cartAutomat.state;
      cartAutomat.setState({
        items: items.filter((item) => item.id !== id),
      });
    },

    updateQuantity(id, delta) {
      const { items } = cartAutomat.state;
      cartAutomat.setState({
        items: items.map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        ),
      });
    },

    renameItem(id, newName) {
      const { items } = cartAutomat.state;
      cartAutomat.setState({
        items: items.map((item) =>
          item.id === id ? { ...item, name: newName } : item
        ),
      });
    },

    setCouponCode(couponCode) {
      cartAutomat.setState({ couponCode });
    },

    resetCart() {
      nextId = 4;
      cartAutomat.setState({
        items: [
          { id: 1, name: 'Mechanical Keyboard', price: 129, quantity: 1 },
          { id: 2, name: 'Wireless Mouse', price: 79, quantity: 2 },
          { id: 3, name: 'Desk Mat (Gruvbox)', price: 29, quantity: 1 },
        ],
        couponCode: '',
      });
    },
  },
  { name: 'cart', persist: true }
);
