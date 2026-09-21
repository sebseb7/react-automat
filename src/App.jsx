import { PureComponent } from 'react';
import CounterButton from './examples/components/CounterButton.jsx';
import CounterDisplay from './examples/components/CounterDisplay.jsx';
import CascadeControls from './examples/components/CascadeControls.jsx';
import NotificationBar from './examples/components/NotificationBar.jsx';
import SyncCounterControls from './examples/components/SyncCounterControls.jsx';
import SyncBackendMonitor from './examples/components/SyncBackendMonitor.jsx';
import IndexSelector from './examples/components/IndexSelector.jsx';
import DynamicAutomatSubscriber from './examples/components/DynamicAutomatSubscriber.jsx';
import CartManager from './examples/components/CartManager.jsx';
import CartBadgeDisplay from './examples/components/CartBadgeDisplay.jsx';
import UnconnectedPartialSubscriber from './examples/components/UnconnectedPartialSubscriber.jsx';
import ApiBoundExample from './examples/components/ApiBoundExample.jsx';
import CascadingPhotosExample from './examples/components/CascadingPhotosExample.jsx';
import CombinedAutomatExample from './examples/components/CombinedAutomatExample.jsx';

class App extends PureComponent {
  render() {
    return (
      <div className="app">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="app-header">
          <div className="logo">
            <span className="logo-icon">⚙</span>
            <span className="logo-text">react-automat</span>
            <span className="logo-version">v0.1.0</span>
          </div>
          <p className="tagline">
            Higher-order state container for React{' '}
            <code className="inline-code">PureComponent</code>
            <br />
            State lives independently of mounting — zero prop drilling · Optional Window and IndexedDB persistence.
          </p>
        </header>

        <main className="app-main">
          {/* ── Example 1: Counter ────────────────────────────────── */}
          <section className="example-section" aria-labelledby="ex1-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">01</span>
                <h2 id="ex1-title">Counter</h2>
              </div>
              <p>
                Two independent <code className="inline-code">PureComponent</code>s
                synchronized by a single <code className="inline-code">counterAutomat</code>.
                Neither knows the other exists — they both subscribe to the same state container.
              </p>
              <div className="flow-diagram" aria-label="Data flow">
                <span className="flow-node">counterAutomat</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">CounterButton</span>
                <span className="flow-sep">&amp;</span>
                <span className="flow-node flow-node-component">CounterDisplay</span>
              </div>
            </div>

            <div className="two-columns">
              <CounterButton />
              <CounterDisplay />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 2: Cascade ───────────────────────────────── */}
          <section className="example-section" aria-labelledby="ex2-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">02</span>
                <h2 id="ex2-title">Notification Cascade</h2>
              </div>
              <p>
                <code className="inline-code">subscribeTo()</code> connects two automats into a
                <strong> reactive pipeline</strong>. Clicking triggers in <code className="inline-code">CascadeControls</code> mutates{' '}
                <code className="inline-code">counterAutomat</code> (upstream). This automatically invokes the{' '}
                <code className="inline-code">subscribeTo()</code> transform callback, updating{' '}
                <code className="inline-code">notificationAutomat</code> (downstream), which then re-renders{' '}
                <code className="inline-code">NotificationBar</code> without any prop drilling or shared component parent.
              </p>
              <div className="flow-diagram" aria-label="Cascade data flow">
                <span className="flow-node">User Click</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">counterAutomat.actions.increment()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">subscribeTo(upstream, transform)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">notificationAutomat.setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">NotificationBar</span>
              </div>

              <div className="info-box">
                <div className="info-box-title">
                  <span>ℹ️</span> How <code>subscribeTo(upstreamAutomat, transform)</code> Works
                </div>
                <ul>
                  <li>
                    <strong><code>upstreamState</code>:</strong> The newly emitted state from the upstream automat (e.g. <code>{`{ count: 1 }`}</code>).
                  </li>
                  <li>
                    <strong><code>myState</code>:</strong> The current state of this downstream automat right before updating (e.g. <code>{`{ messages: [...] }`}</code>). Acts as an accumulator to prepend events and cap history.
                  </li>
                  <li>
                    <strong>Return Value:</strong> The returned partial state object is automatically applied via <code>this.setState(partial)</code>, notifying downstream UI subscribers.
                  </li>
                  <li>
                    <strong>Conditional Filtering:</strong> Return <code>null</code> or <code>undefined</code> to selectively skip updates and avoid triggering renders.
                  </li>
                </ul>
              </div>
            </div>

            <div className="two-columns">
              <CascadeControls />
              <NotificationBar />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 3: API Auto-Sync ─────────────────────────── */}
          <section className="example-section" aria-labelledby="ex3-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">03</span>
                <h2 id="ex3-title">API-Backed Auto-Sync Counter (POST)</h2>
              </div>
              <p>
                <code className="inline-code">syncCounterAutomat</code> manages an indexed counter that automatically
                synchronizes its mutations to the backend via HTTP <code className="inline-code">POST /api/counter</code>.
                State updates are applied <strong>optimistically</strong> for instant UI response, followed by asynchronous
                background synchronization and status tracking without any component-level <code className="inline-code">fetch</code> or lifecycle glue.
              </p>
              <div className="flow-diagram" aria-label="API auto-sync flow">
                <span className="flow-node">User Click</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Optimistic setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">POST /api/counter</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Backend Database Updated</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Sync Status 200 OK</span>
              </div>
            </div>

            <div className="two-columns">
              <SyncCounterControls />
              <SyncBackendMonitor />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 4: Dynamic Map Resubscription ──────────── */}
          <section className="example-section" aria-labelledby="ex4-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">04</span>
                <h2 id="ex4-title">Dynamic Window Map (Index-Driven Resubscription)</h2>
              </div>
              <p>
                The left side is a standard <code className="inline-code">indexAutomat</code> counter (like Example 1).
                On the right side, that counter’s value is used to dynamically lookup, instantiate, and resubscribe to
                a different <code className="inline-code">Automat</code> stored in <code className="inline-code">window.automats = new Map()</code>.
                Stepping through indexes unhooks from the old Automat, subscribes to the new one, and instantly recalls its preserved state.
              </p>
              <div className="flow-diagram" aria-label="Index-driven resubscription flow">
                <span className="flow-node">Shared Index: N</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">window.automats.get(N)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Unsub Old / Sub New</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Recall State for Slot #N</span>
              </div>

              <div className="info-box">
                <div className="info-box-title">
                  <span>💾</span> Built-in Persistence: <code>persist: false</code> (Window) &amp; <code>persist: true</code> (IndexedDB)
                </div>
                <ul>
                  <li>
                    <strong>Window Object (<code>persist: false</code>):</strong> While any Automat is unmount-safe by default, setting a <code>name</code> registers it in the <code>window</code> object. State persists across module re-evaluations and HMR, and enables cross-module lookup via <code>Automat.get(name)</code>.
                  </li>
                  <li>
                    <strong>IndexedDB (<code>persist: true</code>):</strong> Setting <code>persist: true</code> automatically synchronizes state snapshots to IndexedDB under the automat's <code>name</code>, surviving full page reloads and browser restarts.
                  </li>
                </ul>
              </div>
            </div>

            <div className="two-columns">
              <IndexSelector />
              <DynamicAutomatSubscriber />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 5: Partial State Subscription ────────────── */}
          <section className="example-section" aria-labelledby="ex5-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">05</span>
                <h2 id="ex5-title">Partial State Subscription &amp; Unconnected Objects</h2>
              </div>
              <p>
                A subscriber can subscribe to only part of an automat’s state. On the right, two different partial subscribers demonstrate this power:
                <br />
                1. <code className="inline-code">CartBadgeDisplay</code> subscribes <strong>only to list length</strong> (<code className="inline-code">items.length</code>) — item quantity and coupon edits cause <strong>zero re-renders</strong>.
                <br />
                2. <code className="inline-code">UnconnectedPartialSubscriber</code> has <strong>zero imports</strong> of the cart store, resolving it strictly via the named window object (<code className="inline-code">Automat.get(&apos;cart&apos;)</code>), and subscribes only to <code className="inline-code">[&apos;couponCode&apos;]</code>.
              </p>
              <div className="flow-diagram" aria-label="Partial subscription data flow">
                <span className="flow-node">cartAutomat.setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">window.__AUTOMATS__.get(&apos;cart&apos;)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">shallowEqual(lastSlice, nextSlice)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Render ONLY if Selected Slice Changed</span>
              </div>
            </div>

            <div className="two-columns">
              <CartManager />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <CartBadgeDisplay />
                <UnconnectedPartialSubscriber />
              </div>
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 6: Backend API Binding & Suspense ─────── */}
          <section className="example-section" aria-labelledby="ex6-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">06</span>
                <h2 id="ex6-title">Backend API Binding, React Suspense &amp; Dirty Invalidation</h2>
              </div>
              <p>
                An automat can bind directly to a backend URL (<code className="inline-code">url: &apos;/api/profile&apos;</code>).
                Supports <code className="inline-code">await automat.ready</code>, React Suspense via <code className="inline-code">automat.read()</code>,
                and manual invalidation via <code className="inline-code">automat.setDirty()</code>.
                When dirty, state resets to default or null. If mounted, it reloads immediately. If all subscribers are unmounted,
                the reload is deferred until a component mounts or <code className="inline-code">read()</code> is invoked!
              </p>
              <div className="flow-diagram" aria-label="Backend binding and dirty flow">
                <span className="flow-node">new Automat(null, &#123;&#125;, &#123; url &#125;)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">await ready / read() (Suspense)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">setDirty()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Immediate if Mounted / Deferred if Unmounted</span>
              </div>
            </div>

            <ApiBoundExample />
          </section>

          <div className="section-divider" />

          {/* ── Example 7: Cascading setDirty, Blobs & SSE ────── */}
          <section className="example-section" aria-labelledby="ex7-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">07</span>
                <h2 id="ex7-title">Cascading setDirty, Binary Blobs &amp; Server-Sent Events (SSE)</h2>
              </div>
              <p>
                Demonstrates <strong>cascading invalidation</strong>, <strong>automatic Blob memory revoking</strong>,
                and <strong>Server-Sent Events (SSE)</strong> integration:
                <br />
                • Multiple photo automats (<code className="inline-code">photo/1</code>, <code className="inline-code">photo/2</code>, <code className="inline-code">photo/3</code>)
                subscribe to a central hub (<code className="inline-code">photos/all</code>) via <code className="inline-code">invalidateWith(photosAllAutomat)</code>.
                <br />
                • When <code className="inline-code">photos/all.setDirty()</code> is called (or an SSE remote invalidation message arrives),
                all child automats cascade <code className="inline-code">setDirty()</code>, <strong>automatically revoking their image Blob object URLs</strong> and releasing memory.
                <br />
                • Unmounted automats remain in freed/null state until re-mounted, deferring network fetches and saving client memory!
              </p>
              <div className="flow-diagram" aria-label="Cascading invalidation and SSE flow">
                <span className="flow-node">SSE Remote Event / User Click</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">photos/all.setDirty()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">cascade invalidateWith()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">URL.revokeObjectURL() &amp; Free Memory</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">photo/1, photo/2, photo/3</span>
              </div>
            </div>

            <CascadingPhotosExample />
          </section>

          <div className="section-divider" />

          {/* ── Example 8: Combined Automats ──────────────────── */}
          <section className="example-section" aria-labelledby="ex8-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">08</span>
                <h2 id="ex8-title">Combined Automats</h2>
              </div>
              <p>
                <code className="inline-code">Automat.combine()</code> creates one derived application state from independent automats.
                Updates retain their namespace, actions remain grouped by child, and readiness operations cover every child.
              </p>
              <div className="flow-diagram" aria-label="Combined automat flow">
                <span className="flow-node">authAutomat</span>
                <span className="flow-sep">+</span>
                <span className="flow-node">companyAutomat</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Automat.combine()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">appAutomat</span>
              </div>
            </div>

            <CombinedAutomatExample />
          </section>
        </main>
      </div>
    );
  }
}

export default App;
