// Production entry point for the Outwit WebSocket server.
// Kept separate from `server/index.ts` so tests can import `startServer`
// without starting a listener, while the bundled production build starts
// immediately on load.
import { startServer } from './index';

startServer();
