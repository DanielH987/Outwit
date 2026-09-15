// Server heartbeat: a client that stops responding (e.g. a browser gone behind
// a proxy that keeps the TCP connection open) must be detected and removed from
// its seat, so the disconnect-forfeit timer can start.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import net from 'node:net';
import crypto from 'node:crypto';
import { startServer } from '../../server/index';
import type { ServerMessage } from '../types';

const PORT = 3461;

/** A raw WebSocket client that completes the handshake then goes silent. */
function silentSocket(): Promise<net.Socket> {
  return new Promise((resolve) => {
    const key = crypto.randomBytes(16).toString('base64');
    const socket = net.connect(PORT, '127.0.0.1', () => {
      socket.write(
        `GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
      );
    });
    socket.once('data', () => {
      // Handshake complete; stop reading so pings are never answered.
      socket.pause();
      resolve(socket);
    });
  });
}

/** Send one unmasked-by-us (properly masked) text frame on a raw socket. */
function sendTextFrame(socket: net.Socket, text: string) {
  const data = Buffer.from(text);
  const mask = crypto.randomBytes(4);
  const header = Buffer.from([0x81, 0x80 | data.length]);
  const masked = Buffer.from(data.map((b, i) => b ^ mask[i % 4]));
  socket.write(Buffer.concat([header, mask, masked]));
}

describe('server heartbeat', () => {
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('removes a silent client from its seat within two heartbeat intervals', async () => {
    const events: ServerMessage[] = [];
    const a = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    a.on('message', (raw) => events.push(JSON.parse(raw.toString()) as ServerMessage));
    await new Promise((resolve) => a.on('open', resolve));

    const next = (type: string, check?: (p: any) => boolean, ms = 20000) =>
      new Promise<ServerMessage>((res, rej) => {
        const t0 = Date.now();
        const poll = () => {
          const i = events.findIndex((m) => m.type === type && (!check || check(m.payload)));
          if (i !== -1) return res(events.splice(i, 1)[0]);
          if (Date.now() - t0 > ms) return rej(new Error(`timeout for ${type}`));
          setTimeout(poll, 20);
        };
        void poll();
      });

    a.send(JSON.stringify({ type: 'join-room', payload: { roomId: 'heartbeat', userId: 'A', username: 'Stayer' } }));
    await next('room-update');

    // A silent second seat, then let it go unresponsive.
    const silent = await silentSocket();
    sendTextFrame(silent, JSON.stringify({ type: 'join-room', payload: { roomId: 'heartbeat', userId: 'B', username: 'Silent' } }));
    const seated = await next('room-update', (p) => p.players.length === 2);
    expect((seated.payload as any).players.map((p: any) => p.userId).sort()).toEqual(['A', 'B']);

    // The server's next game-state (triggered by the heartbeat's termination)
    // must show B disconnected, which is what starts the forfeit countdown.
    const state = await next('game-state', (p) => p.players.some((x: any) => !x.connected), 20000);
    const b = (state.payload as any).players.find((p: any) => p.userId === 'B');
    expect(b.connected).toBe(false);
    // Deadline present => the countdown started.
    expect((state.payload as any).forfeit).not.toBeNull();
    expect((state.payload as any).forfeit.side).toBe('black');

    silent.destroy();
    a.close();
  }, 30000);
});
