// Production entry point for the Outwit WebSocket server.
// Kept separate from `server/index.ts` so tests can import `startServer`
// without starting a listener, while the bundled production build starts
// immediately on load.
import { startServer } from './index';

const t0 = Date.now();
console.log(`[outwit-server] starting… pid=${process.pid} node=${process.version} NODE_ENV=${process.env.NODE_ENV ?? 'unset'} PORT=${process.env.PORT ?? 'unset'}`);

const server = startServer();

console.log(`[outwit-server] listening in ${Date.now() - t0}ms`);

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
