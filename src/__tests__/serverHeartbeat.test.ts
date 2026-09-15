// Server heartbeat: a client that stops responding (e.g. a browser gone behind
// a proxy that holds the TCP connection open) must be detected and removed from
// its seat, so the disconnect-forfeit timer can start.
//
// NOTE: this uses the app-level `ping`/`pong` JSON protocol, not WS control
// frames — Render's proxy terminates control frames (measured in production:
// server `ws.ping()` never reached the browser, and healthy clients could be
// wrongly terminated). Ordinary JSON traverses the proxy, so liveness rides on it.
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
      // Handshake complete; stop reading so app-level pings are never answered.
      socket.pause();
      resolve(socket);
    });
  });
}

/** Send one properly masked text frame on a raw socket. */
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

  it('removes a silent client from its seat within a few heartbeat intervals', async () => {
    const events: ServerMessage[] = [];
    let pingCount = 0;
    const a = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    a.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      // Mirror the real client: answer app-level heartbeats.
      if (message.type === 'ping') {
        pingCount++;
        a.send(JSON.stringify({ type: 'pong', payload: {} }));
        return;
      }
      events.push(message);
    });
    await new Promise((resolve) => a.on('open', resolve));

    const next = (type: string, check?: (p: any) => boolean, ms = 25000) =>
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

    // Healthy client: must keep receiving heartbeats and never be dropped.
    a.send(JSON.stringify({ type: 'join-room', payload: { roomId: 'heartbeat', userId: 'A', username: 'Stayer' } }));
    await next('room-update');

    // Wait for at least two heartbeats (proves the server pings and stays alive).
    await new Promise<void>((resolve, reject) => {
      const t0 = Date.now();
      const poll = () => {
        if (pingCount >= 2) return resolve();
        if (Date.now() - t0 > 20000) return reject(new Error('no heartbeats received'));
        setTimeout(poll, 50);
      };
      void poll();
    });
    expect(a.readyState).toBe(WebSocket.OPEN);

    // A silent second seat: never replies to pings, then let it go unresponsive.
    const silent = await silentSocket();
    sendTextFrame(silent, JSON.stringify({ type: 'join-room', payload: { roomId: 'heartbeat', userId: 'B', username: 'Silent' } }));
    const seated = await next('room-update', (p) => p.players.length === 2);
    expect((seated.payload as any).players.map((p: any) => p.userId).sort()).toEqual(['A', 'B']);

    // The heartbeat must detect B and report it as disconnected, starting the
    // forfeit countdown.
    const state = await next('game-state', (p) => p.players.some((x: any) => !x.connected));
    const b = (state.payload as any).players.find((p: any) => p.userId === 'B');
    expect(b.connected).toBe(false);
    expect((state.payload as any).forfeit).not.toBeNull();
    expect((state.payload as any).forfeit.side).toBe('black');

    // The healthy client is still alive and answering — not terminated.
    expect(a.readyState).toBe(WebSocket.OPEN);

    silent.destroy();
    a.close();
  }, 40000);
});
