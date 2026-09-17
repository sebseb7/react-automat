import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Embedded in-memory backend plugin for Vite dev server.
 * Handles POST /api/counter and GET /api/counter to support automatic
 * backend synchronization for the indexed counter demo without external APIs.
 */
function counterBackendPlugin() {
  const serverStore = new Map([
    [0, { count: 0, updatedAt: 'Initial' }],
    [1, { count: 5, updatedAt: 'Initial' }],
    [2, { count: 10, updatedAt: 'Initial' }],
  ]);

  return {
    name: 'counter-backend-plugin',
    configureServer(server) {
      server.middlewares.use('/api/counter', (req, res, next) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const index = Number(data.index) || 0;
              const count = Number(data.count) || 0;
              const updatedAt = new Date().toLocaleTimeString();

              serverStore.set(index, { count, updatedAt });

              // 180ms simulated server latency to clearly illustrate syncing status
              setTimeout(() => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    success: true,
                    index,
                    count,
                    savedAt: updatedAt,
                    allRecords: Array.from(serverStore.entries()).map(([idx, val]) => ({
                      index: idx,
                      ...val,
                    })),
                  })
                );
              }, 180);
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.method === 'GET') {
          const url = new URL(req.url, 'http://localhost');
          const indexParam = url.searchParams.get('index');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          if (indexParam !== null) {
            const index = Number(indexParam);
            const item = serverStore.get(index) || { count: 0, updatedAt: 'Unsynced' };
            return res.end(JSON.stringify({ index, ...item }));
          }

          return res.end(
            JSON.stringify({
              allRecords: Array.from(serverStore.entries()).map(([idx, val]) => ({
                index: idx,
                ...val,
              })),
            })
          );
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), counterBackendPlugin()],
});
