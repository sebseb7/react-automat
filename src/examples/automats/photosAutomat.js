import { Automat, fetchJson, fetchImageBlob, connectSSE } from '../../lib/index.js';

/**
 * Parent Automat: "photos/all"
 *
 * Manages the collection metadata and acts as the central invalidation hub.
 * Listens to Server-Sent Events (SSE) via connectSSE to handle remote invalidation signals.
 */
export const photosAllAutomat = new Automat(
  null,
  {
    onSSETrigger(data, event, automat) {
      console.log('[SSE Trigger Received]:', event, data);
      if (data?.target === 'photos' || event === 'invalidate') {
        automat.setDirty();
      }
    },
  },
  {
    name: 'photos/all',
    url: '/api/photos',
    fetcher: fetchJson,
  }
);

// Connect parent automat to Server-Sent Events stream:
if (typeof window !== 'undefined') {
  connectSSE(photosAllAutomat, '/api/events/sse', {
    onMessage: (data, event) => {
      console.log('[SSE Stream Message]:', event, data);
    },
  });
}

/**
 * Factory / Registry for individual photo automats: "photo/:id"
 *
 * Each photo automat:
 * 1. Fetches an Image Blob via `fetchImageBlob`
 * 2. Cascades invalidation from `photosAllAutomat` via `invalidateWith(photosAllAutomat)`
 * 3. On dirty, its `revoke()` method is called automatically, freeing the Blob URL from memory!
 * 4. Bound to window under `photo/${id}` for global discovery
 */
const photoInstances = new Map();

export const getOrCreatePhotoAutomat = (id) => {
  const name = `photo/${id}`;
  if (photoInstances.has(id)) {
    return photoInstances.get(id);
  }

  const automat = new Automat(
    null,
    {},
    {
      name,
      url: `/api/photos/${id}`,
      fetcher: fetchImageBlob,
    }
  );

  // 💡 Cascading setDirty: Whenever photosAllAutomat is dirtied, this photo automat
  // cascades setDirty(), revoking its blob URL and freeing heap memory!
  automat.invalidateWith(photosAllAutomat);

  photoInstances.set(id, automat);
  return automat;
};

// Initialize photo automats 1, 2, 3
export const photo1 = getOrCreatePhotoAutomat(1);
export const photo2 = getOrCreatePhotoAutomat(2);
export const photo3 = getOrCreatePhotoAutomat(3);
