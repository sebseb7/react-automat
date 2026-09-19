/**
 * Built-in Fetchers & SSE Connector for Automat.
 *
 * Provides specialized fetchers for JSON, Image Blobs, PDF Blobs,
 * and Server-Sent Events (SSE) with automatic trigger action dispatch.
 */

/**
 * Standard JSON fetcher.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
export const fetchJson = (url, options = {}) =>
  fetch(url, options).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
  });

/**
 * Binary Blob fetcher (for images, PDFs, etc.).
 * Creates a local object URL and provides a memory-freeing revoke() method.
 * Automatically invoked when an Automat is setDirty() or disposed.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<{ blob: Blob, url: string, size: number, type: string, loadedAt: string, revoke: () => void }>}
 */
export const fetchBlob = (url, options = {}) =>
  fetch(url, options).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return {
      blob,
      url: objectUrl,
      size: blob.size,
      type: blob.type,
      loadedAt: new Date().toLocaleTimeString(),
      revoke: () => {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
      },
    };
  });

export const fetchImageBlob = fetchBlob;
export const fetchPdfBlob = fetchBlob;

/**
 * Connects an Automat to a Server-Sent Events (SSE) stream.
 * Automatically forwards events, handles invalidation, and dispatches to
 * the automat's internal `actions.onSSETrigger` or `onSSETrigger` method.
 *
 * @param {import('./Automat.js').Automat} automat - Target automat instance
 * @param {string} url - SSE endpoint URL
 * @param {object} [options]
 * @param {(data: any, event: string, automat: any) => void} [options.onMessage]
 * @param {Record<string, (data: any, automat: any) => void>} [options.events]
 * @param {(err: any, automat: any) => void} [options.onError]
 * @returns {{ eventSource: EventSource | null, close: () => void }}
 */
export const connectSSE = (automat, url, options = {}) => {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return { eventSource: null, close() {} };
  }

  const es = new EventSource(url);

  const handleData = (eventName, rawData) => {
    let data = rawData;
    try {
      data = JSON.parse(rawData);
    } catch {}

    // 1. Explicit event callback in options.events:
    if (options.events?.[eventName]) {
      options.events[eventName](data, automat);
    }

    // 2. User-provided general message listener:
    if (options.onMessage) {
      options.onMessage(data, eventName, automat);
    }

    // 3. Call internal SSE trigger function on the automat (actions or direct method):
    if (typeof automat.actions?.onSSETrigger === 'function') {
      automat.actions.onSSETrigger(data, eventName, automat);
    }
    if (typeof automat.onSSETrigger === 'function') {
      automat.onSSETrigger(data, eventName, automat);
    }

    // 4. Standard SSE conventions:
    if (eventName === 'invalidate' || eventName === 'dirty' || data?.action === 'invalidate') {
      automat.setDirty();
    } else if (eventName === 'reload' || data?.action === 'reload') {
      automat.reload();
    }
  };

  es.onmessage = (e) => handleData('message', e.data);

  const events = ['invalidate', 'reload', ...Object.keys(options.events || {})];
  events.forEach((name) => {
    es.addEventListener(name, (e) => handleData(name, e.data));
  });

  if (options.onError) {
    es.onerror = (err) => options.onError(err, automat);
  }

  const cleanup = () => {
    try {
      es.close();
    } catch {}
  };

  if (automat._unsubs) {
    automat._unsubs.push(cleanup);
  }

  return {
    eventSource: es,
    close: cleanup,
  };
};

/**
 * Creates an SSE-enabled fetcher that automatically establishes an SSE connection
 * on initial load and delegates data fetching to baseFetcher.
 *
 * @param {string} sseUrl
 * @param {Function} [baseFetcher=fetchJson]
 * @param {object} [sseOptions={}]
 * @returns {(url: string, automat?: any) => Promise<any>}
 */
export const createSSEFetcher = (sseUrl, baseFetcher = fetchJson, sseOptions = {}) => {
  let connected = false;
  return (url, automat) => {
    if (!connected && automat) {
      connectSSE(automat, sseUrl, sseOptions);
      connected = true;
    }
    return baseFetcher(url);
  };
};
