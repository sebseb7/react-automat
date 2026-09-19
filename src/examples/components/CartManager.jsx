import { PureComponent } from 'react';
import { cartAutomat } from '../automats/cartAutomat.js';

/**
 * CartManager — left column of the Partial Subscription example.
 *
 * Full subscriber to cartAutomat.
 * Allows adding/removing items (changing list length) AND modifying
 * existing item content (quantity, name, coupon) without changing list length.
 */
class CartManager extends PureComponent {
  _renderCount = 0;

  constructor(props) {
    super(props);
    this.state = cartAutomat.state;
  }

  componentDidMount() {
    this.unsubscribe = cartAutomat.subscribe(this);
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  handleAddItem = (name, price) => {
    cartAutomat.actions.addItem(name, price);
  };

  handleRemoveItem = (id) => {
    cartAutomat.actions.removeItem(id);
  };

  handleQuantityChange = (id, delta) => {
    cartAutomat.actions.updateQuantity(id, delta);
  };

  handleCouponChange = (e) => {
    cartAutomat.actions.setCouponCode(e.target.value);
  };

  handleReset = () => {
    cartAutomat.actions.resetCart();
  };

  render() {
    this._renderCount++;
    const { items, couponCode } = this.state;

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-icon">🛒</span>
          <h3>Shopping Cart Manager</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge badge-success" title="State persists across full page reloads">💾 IndexedDB</span>
            <span className="badge badge-local">Full Subscriber</span>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Component Renders: <strong style={{ color: 'var(--accent)' }}>#{this._renderCount}</strong>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={this.handleReset}
                title="Reset items to initial state"
              >
                Reset List
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={async () => {
                  await cartAutomat.clearPersistence();
                  this.handleReset();
                }}
                title="Clear persisted state from IndexedDB"
              >
                Clear IndexedDB
              </button>
            </div>
          </div>

          {/* Quick Add Buttons (Changes length) */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Add Item (Changes List Length):
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => this.handleAddItem('Keycaps Set', 45)}
              >
                + Keycaps ($45)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => this.handleAddItem('Wrist Rest', 25)}
              >
                + Wrist Rest ($25)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => this.handleAddItem('Coiled Cable', 32)}
              >
                + Cable ($32)
              </button>
            </div>
          </div>

          {/* Items List */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Cart Items ({items.length}):
            </span>

            {items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface-1)', borderRadius: 'var(--r-md)' }}>
                Cart is empty. Click an add button above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        ${item.price} each
                      </div>
                    </div>

                    {/* Quantity controls (Changes content, NOT length!) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2 }}>Qty:</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ padding: '2px 8px', fontSize: 12, minWidth: 26 }}
                        onClick={() => this.handleQuantityChange(item.id, -1)}
                        title="Decrease quantity (content changed, length unchanged)"
                      >
                        −
                      </button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 13 }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ padding: '2px 8px', fontSize: 12, minWidth: 26 }}
                        onClick={() => this.handleQuantityChange(item.id, 1)}
                        title="Increase quantity (content changed, length unchanged)"
                      >
                        +
                      </button>

                      {/* Remove item (Changes length!) */}
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        style={{ padding: '2px 8px', fontSize: 12, marginLeft: 6 }}
                        onClick={() => this.handleRemoveItem(item.id)}
                        title="Remove item (changes length)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unrelated field: Coupon Code */}
          <div style={{ background: 'var(--surface-1)', padding: '10px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 6 }}>
              Unrelated State Field (Coupon Code):
            </label>
            <input
              type="text"
              value={couponCode}
              onChange={this.handleCouponChange}
              placeholder="Type coupon (e.g. GRUVBOX20)..."
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'var(--surface-0)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-sm)',
                color: 'var(--text-1)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
              Typing here calls <code>cartAutomat.setState({`{ couponCode }`})</code>. Notice how the badge on the right ignores this completely!
            </span>
          </div>
        </div>
      </div>
    );
  }
}

export default CartManager;
