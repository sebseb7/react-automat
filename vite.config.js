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

      let profileFetchCount = 0;
      server.middlewares.use('/api/profile', (req, res, next) => {
        if (req.method === 'GET') {
          profileFetchCount++;
          // 350ms simulated latency to illustrate unready state and Suspense fallback
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                id: 101,
                name: 'Alex Morgan',
                role: 'Staff Platform Engineer',
                department: 'Distributed Systems',
                fetchCount: profileFetchCount,
                loadedAt: new Date().toLocaleTimeString(),
              })
            );
          }, 350);
          return;
        }
        next();
      });

      // ── Photos Collection & Blob Endpoints ──────────────────────
      server.middlewares.use('/api/photos', (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        const match = url.pathname.match(/^\/(\d+)$/);

        // Individual Photo SVG/Image Blob: /api/photos/:id
        if (match) {
          const id = Number(match[1]);
          const colors = [
            ['#6366f1', '#4338ca', 'Alps Panorama'],
            ['#ec4899', '#be185d', 'Tokyo Neon Night'],
            ['#10b981', '#047857', 'Emerald Rainforest'],
            ['#f59e0b', '#b45309', 'Golden Dunes'],
          ];
          const [c1, c2, title] = colors[(id - 1) % colors.length];
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="100%" stop-color="${c2}" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" fill="url(#g)" rx="16"/>
  <circle cx="300" cy="180" r="80" fill="rgba(255,255,255,0.15)" />
  <path d="M 120 340 L 260 210 L 360 290 L 480 160 L 580 340 Z" fill="rgba(255,255,255,0.22)" />
  <text x="300" y="360" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="system-ui, sans-serif">
    Photo #${id}: ${title}
  </text>
</svg>`;
          setTimeout(() => {
            res.writeHead(200, {
              'Content-Type': 'image/svg+xml',
              'Cache-Control': 'no-store',
            });
            res.end(svg);
          }, 200);
          return;
        }

        // Photos collection metadata
        if (req.method === 'GET' && (url.pathname === '' || url.pathname === '/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              count: 3,
              updatedAt: new Date().toLocaleTimeString(),
              photos: [
                { id: 1, title: 'Alps Panorama', url: '/api/photos/1', memoryEst: '2.4 MB' },
                { id: 2, title: 'Tokyo Neon Night', url: '/api/photos/2', memoryEst: '3.1 MB' },
                { id: 3, title: 'Emerald Rainforest', url: '/api/photos/3', memoryEst: '1.9 MB' },
              ],
            })
          );
        }

        next();
      });

      // ── PDF Blob Endpoint ───────────────────────────────────────
      server.middlewares.use('/api/docs/spec', (req, res, next) => {
        if (req.method === 'GET') {
          // Minimal valid PDF binary
          const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 24 Tf 100 700 Td (Automat PDF Stream Loaded) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000334 00000 n 
trailer << /Root 1 0 R /Size 6 >>
startxref
407
%%EOF`;
          setTimeout(() => {
            res.writeHead(200, {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'inline; filename="automat-spec.pdf"',
              'Cache-Control': 'no-store',
            });
            res.end(minimalPdf);
          }, 250);
          return;
        }
        next();
      });

      // ── Server-Sent Events (SSE) Stream ─────────────────────────
      const sseClients = new Set();

      server.middlewares.use('/api/events/sse', (req, res, next) => {
        if (req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          res.write(`event: connected\ndata: ${JSON.stringify({ time: new Date().toLocaleTimeString() })}\n\n`);
          sseClients.add(res);

          const keepAlive = setInterval(() => {
            res.write(`: heartbeat\n\n`);
          }, 15000);

          req.on('close', () => {
            clearInterval(keepAlive);
            sseClients.delete(res);
          });
          return;
        }
        next();
      });

      // Endpoint to broadcast SSE events from the demo UI:
      server.middlewares.use('/api/events/trigger', (req, res, next) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const eventName = payload.event || 'invalidate';
            const data = payload.data || { reason: 'manual trigger', timestamp: Date.now() };

            const ssePayload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
            sseClients.forEach((client) => {
              client.write(ssePayload);
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, clients: sseClients.size, event: eventName }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), counterBackendPlugin()],
});
