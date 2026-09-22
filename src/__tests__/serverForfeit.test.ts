// Server disconnection-forfeit timer test. Uses a short grace period via
// OUTWIT_FORFEIT_SECONDS.
process.env.OUTWIT_FORFEIT_SECONDS = '1';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startServer } from '../../server/index';
import type { ServerMessage } from '../types';

const PORT = 3458;

function connect(): Promise<{ ws: WebSocket; userId: string; take: (type: string, check?: (p: any) => boolean) => Promise<ServerMessage> }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const buffer: ServerMessage[] = [];
    ws.on('message', (raw) => buffer.push(JSON.parse(raw.toString()) as ServerMessage));
    ws.on('open', () => {
      const find = (type: string, check?: (p: any) => boolean): Promise<ServerMessage> =>
        new Promise((res, rej) => {
          const t = Date.now();
          const poll = () => {
            const idx = buffer.findIndex((m) => m.type === type && (!check || check((m.payload as any))));
            if (idx !== -1) return res(buffer.splice(idx, 1)[0]);
            if (Date.now() - t > 3000) return rej(new Error(`timeout waiting for ${type}`));
            setTimeout(poll, 10);
          };
          void poll();
        });
      find('connected').then((msg) => {
        resolve({ ws, userId: (msg.payload as { userId: string }).userId, take: find });
      });
    });
  });
}

describe('disconnection-forfeit timer', () => {
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('connected player wins when opponent disconnects and the grace period elapses', async () => {
    const roomId = 'forfeit';
    const a = await connect();
    a.ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: a.userId, username: 'A' } }));
    await a.take('room-update');

    const b = await connect();
    b.ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: b.userId, username: 'B' } }));
    await b.take('room-update', (p) => p.players.length === 2);

    // No countdown while both players are present.
    const live = await b.take('game-state', () => true);
    expect((live.payload as any).forfeit).toBeNull();

    // Find A's side to know who disconnects and who wins.
    const aSide = (live.payload as any).players.find((p: any) => p.userId === a.userId)?.side;
    const expectedWinner = aSide === 'white' ? 'black' : 'white';

    // A disconnects; B should see a countdown, then win after the grace period.
    a.ws.close();
    // Server marks A disconnected, then after ~1s issues a forfeit.
    const disconnected = await b.take('game-state', (p) => p.players.find((x: any) => !x.connected) !== undefined);
    const forfeit = (disconnected.payload as any).forfeit;
    expect(forfeit).toMatchObject({ side: aSide, graceSeconds: 1 });
    expect(typeof forfeit.deadline).toBe('number');
    expect(typeof forfeit.serverNow).toBe('number');
    expect(forfeit.deadline).toBeGreaterThanOrEqual(forfeit.serverNow);
    expect(forfeit.deadline - forfeit.serverNow).toBeLessThanOrEqual(1000);

    const final = await b.take('game-state', (p) => p.result.status === 'finished');
    expect((final.payload as any).result).toEqual({
      status: 'finished',
      winner: expectedWinner,
      reason: 'forfeit',
    });
    // The countdown is cleared once the game is over.
    expect((final.payload as any).forfeit).toBeNull();
  }, 10000);

  it('reconnecting inside the grace period cancels the forfeit', async () => {
    const roomId = 'forfeit-cancel';
    const a = await connect();
    a.ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: a.userId, username: 'A' } }));
    await a.take('room-update');

    const b = await connect();
    b.ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: b.userId, username: 'B' } }));
    await b.take('room-update', (p) => p.players.length === 2);

    a.ws.close();
    const disconnected = await b.take('game-state', (p) => p.players.find((x: any) => !x.connected) !== undefined);
    expect((disconnected.payload as any).forfeit).not.toBeNull();

    // Reconnect with same userId before the grace period ends.
    const a2 = await connect();
    a2.ws.send(JSON.stringify({ type: 'join-room', payload: { roomId, userId: a.userId, username: 'A' } }));
    await a2.take('room-update', (p) => p.players.find((x: any) => x.userId === a.userId)?.connected === true);
    // Any game-state broadcast after the reconnect (e.g. the one the room got)
    // should still be in progress, with the countdown cleared.
    const state = await a2.take('game-state', () => true);
    expect((state.payload as any).result.status).toBe('in-progress');
    expect((state.payload as any).forfeit).toBeNull();

    // After the grace window the game is still in progress.
    await new Promise((r) => setTimeout(r, 1200));
    // No further game-state with finished should arrive unless something changed.
    // (If the server mistakenly forfeited, b would have seen it; we can ask b.)
    b.ws.close();
    a2.ws.close();
  }, 10000);
});
