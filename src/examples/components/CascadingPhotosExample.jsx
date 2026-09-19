import { PureComponent } from 'react';
import { Automat, fetchPdfBlob } from '../../lib/index.js';
import { photosAllAutomat, getOrCreatePhotoAutomat } from '../automats/photosAutomat.js';

/**
 * PDF Document Automat demonstrating `fetchPdfBlob` and memory cleanup.
 */
const pdfDocAutomat = new Automat(
  null,
  {},
  {
    name: 'docs/spec',
    url: '/api/docs/spec',
    fetcher: fetchPdfBlob,
  }
);

/**
 * Individual Photo Card Component.
 * Can be independently mounted/unmounted to demonstrate deferred reload on unmounted automats.
 */
class PhotoCard extends PureComponent {
  _renderCount = 0;

  constructor(props) {
    super(props);
    const automat = getOrCreatePhotoAutomat(props.id);
    this.state = {
      data: automat.state,
      isReady: automat.isReady,
      isDirty: automat.isDirty,
    };
  }

  componentDidMount() {
    const automat = getOrCreatePhotoAutomat(this.props.id);
    this.unsubscribe = automat.subscribe((state) => {
      this.setState({
        data: state,
        isReady: automat.isReady,
        isDirty: automat.isDirty,
      });
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  handleSingleDirty = () => {
    const automat = getOrCreatePhotoAutomat(this.props.id);
    automat.setDirty();
  };

  render() {
    this._renderCount++;
    const { id, title } = this.props;
    const automat = getOrCreatePhotoAutomat(id);
    const { data, isReady, isDirty } = this.state;

    return (
      <div
        className="card"
        style={{
          background: 'var(--surface-2)',
          border: isDirty ? '1px dashed #ef4444' : '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', height: 160, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isReady && data?.url ? (
            <img
              src={data.url}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{isDirty ? '🗑️' : '⏳'}</div>
              <div style={{ fontSize: 12, color: isDirty ? '#ef4444' : 'var(--accent-light)', fontWeight: 600 }}>
                {isDirty ? 'Memory Freed (Blob Revoked)' : 'Loading Blob...'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>State: null</div>
            </div>
          )}

          <span
            className={`badge ${isReady ? 'badge-success' : 'badge-warning'}`}
            style={{ position: 'absolute', top: 8, right: 8, backdropFilter: 'blur(4px)' }}
          >
            photo/{id}
          </span>
        </div>

        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-1)' }}>{title}</h4>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Renders: #{this._renderCount}</span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--surface-1)', padding: '6px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
            {data?.url ? (
              <div>
                <span style={{ color: '#10b981' }}>● Active Blob:</span> {(data.size / 1024).toFixed(1)} KB
              </div>
            ) : (
              <div style={{ color: '#ef4444' }}>● Memory Released (0 bytes)</div>
            )}
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={this.handleSingleDirty}
              style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
            >
              Single Invalidate
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => automat.reload()}
              style={{ flex: 1, fontSize: 11, padding: '4px 6px' }}
            >
              Silent Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Main CascadingPhotosExample Component
 */
export default class CascadingPhotosExample extends PureComponent {
  state = {
    parentData: photosAllAutomat.state,
    parentReady: photosAllAutomat.isReady,
    parentDirty: photosAllAutomat.isDirty,
    mountedPhotos: { 1: true, 2: true, 3: false },
    sseLog: [],
    showPdf: false,
    pdfData: pdfDocAutomat.state,
    pdfReady: pdfDocAutomat.isReady,
  };

  componentDidMount() {
    this.unsubParent = photosAllAutomat.subscribe((state) => {
      this.setState({
        parentData: state,
        parentReady: photosAllAutomat.isReady,
        parentDirty: photosAllAutomat.isDirty,
      });
    });

    this.unsubPdf = pdfDocAutomat.subscribe((state) => {
      this.setState({
        pdfData: state,
        pdfReady: pdfDocAutomat.isReady,
      });
    });

    // Intercept SSE trigger for interactive UI log
    const origTrigger = photosAllAutomat.actions.onSSETrigger;
    photosAllAutomat.actions.onSSETrigger = (data, event, automat) => {
      origTrigger(data, event, automat);
      this.setState((prev) => ({
        sseLog: [
          `[${new Date().toLocaleTimeString()}] SSE ${event}: ${JSON.stringify(data)} -> photosAllAutomat.setDirty()`,
          ...prev.sseLog.slice(0, 4),
        ],
      }));
    };
  }

  componentWillUnmount() {
    if (this.unsubParent) this.unsubParent();
    if (this.unsubPdf) this.unsubPdf();
  }

  handleParentDirty = () => {
    // Calling setDirty on photosAllAutomat cascades setDirty to ALL photo/* automats!
    photosAllAutomat.setDirty();
  };

  handleParentReload = () => {
    photosAllAutomat.reload();
  };

  handleBroadcastSSE = async (eventName = 'invalidate') => {
    try {
      await fetch('/api/events/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data: { target: 'photos', action: eventName, timestamp: Date.now() },
        }),
      });
    } catch (err) {
      console.error('SSE trigger failed:', err);
    }
  };

  togglePhotoMount = (id) => {
    this.setState((prev) => ({
      mountedPhotos: {
        ...prev.mountedPhotos,
        [id]: !prev.mountedPhotos[id],
      },
    }));
  };

  render() {
    const { parentData, parentReady, parentDirty, mountedPhotos, sseLog, showPdf, pdfData, pdfReady } = this.state;

    return (
      <div className="card" style={{ borderTop: '3px solid var(--accent)' }}>
        {/* Header */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="card-icon">🖼️</span>
            <div>
              <h3 style={{ margin: 0 }}>Cascading Invalidation &amp; Binary Fetchers</h3>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Hub: <code>photos/all</code> ➔ Dependents: <code>photo/1</code>, <code>photo/2</code>, <code>photo/3</code>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${parentReady ? 'badge-success' : 'badge-warning'}`}>
              Hub: {parentReady ? 'Ready' : 'Dirty / Unready'}
            </span>
            <span className="badge badge-api">SSE: Connected</span>
          </div>
        </div>

        <div className="card-body">
          {/* Controls Bar */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text-1)' }}>Parent &quot;photos/all&quot; Controls:</strong>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>
                  Setting parent dirty cascades to all photo automats, revoking Blob memory immediately.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={this.handleParentDirty}
                  title="Calls photosAllAutomat.setDirty() which cascades to all children"
                >
                  ⚡ Cascade setDirty() (Free Memory)
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => this.handleBroadcastSSE('invalidate')}
                  style={{ borderColor: '#ec4899', color: '#ec4899' }}
                  title="Sends SSE message to backend which triggers internal onSSETrigger"
                >
                  📡 Send SSE Invalidation
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={this.handleParentReload}
                  title="Reloads parent collection silently"
                >
                  🔄 Reload photos/all
                </button>
              </div>
            </div>

            {/* SSE Live Log */}
            {sseLog.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>
                <span style={{ color: '#ec4899', fontWeight: 600 }}>📡 SSE Activity Log:</span>
                {sseLog.map((log, idx) => (
                  <div key={idx} style={{ color: 'var(--text-2)', marginTop: 2 }}>{log}</div>
                ))}
              </div>
            )}
          </div>

          {/* Mount / Unmount Toggles for Memory Verification */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 8 }}>
              Subscriber Mount States (Verify Deferred Reload &amp; Memory Savings):
            </span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[1, 2, 3].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`btn btn-sm ${mountedPhotos[id] ? 'btn-ghost' : 'btn-primary'}`}
                  onClick={() => this.togglePhotoMount(id)}
                  style={{ fontSize: 12 }}
                >
                  {mountedPhotos[id] ? `📴 Unmount photo/${id}` : `📦 Mount photo/${id}`}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => this.setState((prev) => ({ showPdf: !prev.showPdf }))}
                style={{ marginLeft: 'auto', borderColor: '#10b981', color: '#10b981' }}
              >
                📄 {showPdf ? 'Hide PDF Viewer' : 'Test fetchPdfBlob Viewer'}
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                Photo #1 (Alps) {mountedPhotos[1] ? '🟢 Mounted' : '⚪ Unmounted'}
              </span>
              {mountedPhotos[1] ? (
                <PhotoCard id={1} title="Alps Panorama" />
              ) : (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, background: 'var(--surface-0)' }}>
                  photo/1 is unmounted.<br />
                  Cascading dirty releases its blob and defers reload until re-mounted!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                Photo #2 (Tokyo) {mountedPhotos[2] ? '🟢 Mounted' : '⚪ Unmounted'}
              </span>
              {mountedPhotos[2] ? (
                <PhotoCard id={2} title="Tokyo Neon Night" />
              ) : (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, background: 'var(--surface-0)' }}>
                  photo/2 is unmounted.<br />
                  Cascading dirty releases its blob and defers reload until re-mounted!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                Photo #3 (Rainforest) {mountedPhotos[3] ? '🟢 Mounted' : '⚪ Unmounted'}
              </span>
              {mountedPhotos[3] ? (
                <PhotoCard id={3} title="Emerald Rainforest" />
              ) : (
                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, background: 'var(--surface-0)' }}>
                  photo/3 is unmounted.<br />
                  Click &quot;Mount photo/3&quot; above to subscribe and trigger initial fetch!
                </div>
              )}
            </div>
          </div>

          {/* PDF Blob Viewer Section */}
          {showPdf && (
            <div style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14 }}>PDF Blob Fetcher (`fetchPdfBlob`)</h4>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    Endpoint: <code>/api/docs/spec</code> · Blob Size: {pdfData?.size || 0} bytes
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => pdfDocAutomat.setDirty()}
                  >
                    Set Dirty (Revoke PDF Blob)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => pdfDocAutomat.reload()}
                  >
                    Reload PDF
                  </button>
                </div>
              </div>

              {pdfReady && pdfData?.url ? (
                <iframe
                  src={pdfData.url}
                  title="PDF Spec Viewer"
                  style={{ width: '100%', height: 200, border: '1px solid var(--border-subtle)', borderRadius: 6 }}
                />
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                  PDF Blob Unready or Dirtied (Memory Freed)
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
