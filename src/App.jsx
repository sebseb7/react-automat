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
import AsyncApiPrimaryView from './examples/components/AsyncApiPrimaryView.jsx';
import AsyncApiCollapsibleView from './examples/components/AsyncApiCollapsibleView.jsx';
import MultiApiIndividualControls from './examples/components/MultiApiIndividualControls.jsx';
import MultiApiCombinedDashboard from './examples/components/MultiApiCombinedDashboard.jsx';
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
            Higher-order observable state container for React{' '}
            <code className="inline-code">PureComponent</code>
            <br />
            State lives independently of mounting — zero prop drilling · Optional Window and IndexedDB persistence.
          </p>
        </header>

        {/* ── Notification Bar ───────────────────────────────────── */}
        <NotificationBar />

        {/* ── Main Content ───────────────────────────────────────── */}
        <main className="examples-container">
          {/* ── Example 1: Basic Counter ──────────────────────────── */}
          <section className="example-section" aria-labelledby="ex1-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">01</span>
                <h2 id="ex1-title">Multi-Subscriber Sync &amp; Local State Isolation</h2>
              </div>
              <p>
                Two completely separate components subscribe to the same <code className="inline-code">counterAutomat</code>.
                The controller button also maintains local UI state (<code className="inline-code">lastPressed</code>, animation classes).
                Neither component passes props to the other.
              </p>
              <div className="flow-diagram" aria-label="Component and Automat data flow">
                <span className="flow-node">CounterButton</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">counterAutomat.actions.increment()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">CounterDisplay</span>
              </div>
            </div>

            <div className="two-columns">
              <CounterButton />
              <CounterDisplay />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 2: Cascading State ────────────────────────── */}
          <section className="example-section" aria-labelledby="ex2-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">02</span>
                <h2 id="ex2-title">Cascading Automats (Reactive Transformation)</h2>
              </div>
              <p>
                <code className="inline-code">notificationAutomat</code> derives its state from{' '}
                <code className="inline-code">counterAutomat</code> using <code className="inline-code">subscribeTo</code>.
                Every state change cascades automatically without manual event dispatching.
              </p>
              <div className="flow-diagram" aria-label="Cascade data flow">
                <span className="flow-node">counterAutomat</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">transform(counterState)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">notificationAutomat</span>
              </div>
            </div>

            <CascadeControls />
          </section>

          <div className="section-divider" />

          {/* ── Example 3: Backend Synchronization ────────────────── */}
          <section className="example-section" aria-labelledby="ex3-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">03</span>
                <h2 id="ex3-title">Backend Synchronization &amp; Optimistic Updates</h2>
              </div>
              <p>
                State changes trigger asynchronous backend persistence via a custom fetch handler in the Automat’s actions.
                A polling subscriber independently monitors the server-side state without polling the Automat itself.
              </p>
              <div className="flow-diagram" aria-label="Backend sync flow">
                <span className="flow-node">SyncCounterControls</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">syncCounterAutomat</span>
                <span className="flow-arrow">⇄</span>
                <span className="flow-node">Backend API</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">SyncBackendMonitor</span>
              </div>
            </div>

            <div className="two-columns">
              <SyncCounterControls />
              <SyncBackendMonitor />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 4: Dynamic Slot Allocation & Persistence ──── */}
          <section className="example-section" aria-labelledby="ex4-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">04</span>
                <h2 id="ex4-title">Dynamic Slot Allocation &amp; Unmount-Safe State Recall</h2>
              </div>
              <p>
                Demonstrates how state lives <em>outside</em> the React component tree.
                Changing the active index resubscribes the display component to a different named Automat.
                Previous slot state is never destroyed on unmount — return to any slot at any time to find its clicks and notes intact.
              </p>
              <div className="flow-diagram" aria-label="Dynamic slot data flow">
                <span className="flow-node">IndexSelector</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">indexAutomat.state.index</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Unsub Old Slot / Sub New Slot</span>
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
                2. <code className="inline-code">UnconnectedPartialSubscriber</code> has <strong>zero imports</strong> of the cart store, resolving it strictly via the named window object (<code className="inline-code">Automat.get('cart')</code>), and subscribes only to <code className="inline-code">['couponCode']</code>.
              </p>
              <div className="flow-diagram" aria-label="Partial subscription data flow">
                <span className="flow-node">cartAutomat.setState()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">window.__AUTOMATS__.get('cart')</span>
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

          {/* ── Example 6: Async Fetch & Constructor Cache ──────── */}
          <section className="example-section" aria-labelledby="ex6-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">06</span>
                <h2 id="ex6-title">Async API Fetch &amp; Constructor Cache (Instant Re-Mount)</h2>
              </div>
              <p>
                An automat fetching asynchronous data via a simulated delayed API. When the primary component mounts,
                calling <code className="inline-code">profileAsyncAutomat.getData()</code> in its constructor returns{' '}
                <code className="inline-code">{`{ status: 'pending' }`}</code>, rendering a loading state (1st render), then re-rendering
                when the fetch finishes (2nd render). When a second component mounts (or when unmounted and remounted via the collapsible toggle),
                the data is <strong>already loaded in memory</strong> — the constructor receives the resolved payload synchronously, rendering in{' '}
                <strong>1 render with zero 2nd render</strong>.
              </p>
              <div className="flow-diagram" aria-label="Async fetch and constructor cache flow">
                <span className="flow-node">Mount 1 Constructor</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">status: 'pending' (Render #1)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">API Resolves</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Render #2 (Data)</span>
                <span className="flow-sep">|</span>
                <span className="flow-node">Mount 2 (Collapsible)</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node flow-node-component">Constructor Has Data (1 Render Only)</span>
              </div>
            </div>

            <div className="two-columns">
              <AsyncApiPrimaryView />
              <AsyncApiCollapsibleView />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 7: Combined Multi-API Automats ────────────── */}
          <section className="example-section" aria-labelledby="ex7-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">07</span>
                <h2 id="ex7-title">Combined Multi-API Automats (Concurrent Orchestration)</h2>
              </div>
              <p>
                Three automats in an orchestrated graph: two with delayed APIs (<code className="inline-code">userStatsAutomat</code> at ~700ms and{' '}
                <code className="inline-code">systemMetricsAutomat</code> at ~1300ms), and one combined automat created with{' '}
                <code className="inline-code">Automat.combine()</code>. When accessed while upstreams are idle, it triggers both to load in parallel,
                merging results when both finish. However, if both have <strong>already been accessed earlier</strong>, the combined automat resolves{' '}
                <strong>instantly in the component constructor</strong> with zero delay and a single render.
              </p>
              <div className="flow-diagram" aria-label="Combined multi-API flow">
                <span className="flow-node">combinedDashboardAutomat.getData()</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">Check Upstreams</span>
                <span className="flow-arrow">→</span>
                <span className="flow-node">If Idle: Fetch Concurrently (~1300ms parallel)</span>
                <span className="flow-sep">|</span>
                <span className="flow-node">If Cached: Instant Constructor Return (1 Render)</span>
              </div>
            </div>

            <div className="two-columns">
              <MultiApiIndividualControls />
              <MultiApiCombinedDashboard />
            </div>
          </section>

          <div className="section-divider" />

          {/* ── Example 8: Backend API Binding & Suspense ─────── */}
          <section className="example-section" aria-labelledby="ex8-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">08</span>
                <h2 id="ex8-title">Backend API Binding, React Suspense &amp; Dirty Invalidation</h2>
              </div>
              <p>
                An automat can bind directly to a backend URL (<code className="inline-code">url: '/api/profile'</code>).
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

          {/* ── Example 9: Cascading setDirty, Blobs & SSE ────── */}
          <section className="example-section" aria-labelledby="ex9-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">09</span>
                <h2 id="ex9-title">Cascading setDirty, Binary Blobs &amp; Server-Sent Events (SSE)</h2>
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

          {/* ── Example 10: Dictionary Combined Automats ───────── */}
          <section className="example-section" aria-labelledby="ex10-title">
            <div className="section-header">
              <div className="section-title-row">
                <span className="section-number">10</span>
                <h2 id="ex10-title">Dictionary Combined Automats</h2>
              </div>
              <p>
                <code className="inline-code">Automat.combine()</code> with an object map creates one derived application state from independent automats.
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

        <footer className="app-footer">
          <p>
            <code className="inline-code">react-automat</code> · MIT ·{' '}
            State is independent of component lifecycle
          </p>
        </footer>
      </div>
    );
  }
}

export default App;
