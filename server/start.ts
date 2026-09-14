// Production entry point for the Outwit WebSocket server.
// Kept separate from `server/index.ts` so tests can import `startServer`
// without starting a listener, while the bundled production build starts
// immediately on load.
import { startServer } from './index';

const t0 = Date.now();
console.log(`[outwit-server] starting… pid=${process.pid} node=${process.version} NODE_ENV=${process.env.NODE_ENV ?? 'unset'} PORT=${process.env.PORT ?? 'unset'}`);

const server = startServer();

console.log(`[outwit-server] listening in ${Date.now() - t0}ms`);

// Periodic stats: surface memory/rooms so a growth pattern in logs tells us
// what state is accumulating (room history, timers, player maps).
const port = Number(process.env.PORT ?? process.env.OUTWIT_PORT ?? 3001);
const statsTimer = setInterval(() => {
  fetch(`http://127.0.0.1:${port}/stats`)
    .then((r) => r.json())
    .then((s) => {
      const u = process.memoryUsage();
      const rec = s as { rooms: number; players: number; spectators: number };
      console.log(
        `[outwit-server] uptime=${Math.round((Date.now() - t0) / 1000)}s heap=${Math.round(u.heapUsed / 1024 / 1024)}MB rss=${Math.round(u.rss / 1024 / 1024)}MB rooms=${rec.rooms} players=${rec.players} spectators=${rec.spectators}`
      );
    })
    .catch((err) => console.error('[outwit-server] stats fetch failed:', (err as Error).message));
}, 15000);
statsTimer.unref?.();

server.httpServer.on('error', (err) => {
  console.error('[outwit-server] http server error:', err);
  process.exit(1);
});
server.wss.on('error', (err) => {
  console.error('[outwit-server] ws server error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[outwit-server] FATAL uncaughtException:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[outwit-server] FATAL unhandledRejection:', reason);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`[outwit-server] received ${sig}, shutting down…`);
    server.close();
    process.exit(0);
  });
}

process.on('exit', (code) => {
  console.log(`[outwit-server] exiting with code ${code} (uptime ${Math.round((Date.now() - t0) / 1000)}s)`);
});
