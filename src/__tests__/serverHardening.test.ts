// Phase 5 hardening tests: reconnection, draw flow, chat.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startServer } from '../../server/index';
import type { ServerMessage } from '../types';

const PORT = 3457;

interface TestClient {
  ws: WebSocket;
  userId: string;
  send: (type: string, payload: unknown) => void;
  take: () => Promise<ServerMessage | undefined>;
  nextBy: (type: string, check?: (p: any) => boolean) => Promise<ServerMessage>;
  closeNow: () => void;
  closeGracefully: () => Promise<void>;
}

function makeClient(ws: WebSocket, userId: string): TestClient {
  const buffer: ServerMessage[] = [];
  ws.on('message', (raw) => buffer.push(JSON.parse(raw.toString()) as ServerMessage));
  return {
    ws,
    userId,
    send: (type, payload) => ws.send(JSON.stringify({ type, payload })),
    take: async () => new Promise((res) => setTimeout(() => res(buffer.shift()), 20)),
    nextBy: (type, check) =>
      new Promise((res, rej) => {
        const started = Date.now();
        const poll = () => {
          const idx = buffer.findIndex((m) => m.type === type && (!check || check((m.payload as any))));
          if (idx !== -1) return res(buffer.splice(idx, 1)[0]);
          if (Date.now() - started > 2000) return rej(new Error(`timeout for ${type}`));
          setTimeout(poll, 10);
        };
        void poll();
      }),
    closeNow: () => ws.close(),
    closeGracefully: () => new Promise((res) => { ws.once('close', () => res()); ws.close(); }),
  };
}

async function connect(): Promise<TestClient> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'connected') resolve(makeClient(ws, msg.payload.userId));
    });
  });
}

describe('multiplayer hardening', () => {
  let wss: ReturnType<typeof startServer>;

  beforeAll(() => {
    wss = startServer(PORT);
  });

  afterAll(() => {
    wss.close();
  });

  it('chat broadcasts to all room participants', async () => {
    const roomId = 'chat';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'Alice' });
    await a.nextBy('room-update');
    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'Bob' });
    await b.nextBy('room-update', (p) => p.players.length === 2);

    a.send('send-chat', { roomId, userId: a.userId, username: 'Alice', text: 'hi' });
    await b.nextBy('chat-message', (m) => m.text === 'hi' && m.username === 'Alice');
    a.closeNow();
    b.closeNow();
  });

  it('draw offer → accepted → mutual draw', async () => {
    const roomId = 'draw';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.nextBy('room-update', (p) => p.players.length === 2);

    a.send('offer-draw', { roomId, userId: a.userId });
    await b.nextBy('game-state', (p) => p.pendingDrawFrom === 'white');

    b.send('respond-draw', { roomId, userId: b.userId, accepted: true });
    const final = await b.nextBy('game-state', (p) => p.result.status === 'finished');
    expect((final.payload as any).result).toEqual({ status: 'finished', winner: null, reason: 'agreement' });
    a.closeNow();
    b.closeNow();
  });

  it('reconnecting with the same userId re-binds to the same side', async () => {
    const roomId = 'rebind';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.nextBy('room-update', (p) => p.players.length === 2);

    a.closeNow();
    await b.nextBy('room-update', (p) => p.players.find((pl: any) => pl.userId === a.userId)?.connected === false);

    // Reconnect: new socket, same userId as before.
    const a2 = await connect();
    a2.send('join-room', { roomId, userId: a.userId, username: 'A' });
    await a2.nextBy('room-update', (p) => p.players.find((pl: any) => pl.userId === a.userId)?.connected === true);

    const b2 = await connect();
    b2.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.nextBy('room-update');
    await b.nextBy('game-state');
    // The close event may lag the reconnect; wait for a room-update where b is connected.
    let update = await b2.nextBy('room-update');
    while (!(update.payload as any).players.find((p: any) => p.userId === b.userId)?.connected) {
      update = await b2.nextBy('room-update');
    }
    const me = (update.payload as any).players.find((p: any) => p.userId === b.userId);
    expect(me.side).toBe('black');
    expect(me.connected).toBe(true);

    const state = await b2.nextBy('game-state');
    expect((state.payload as any).board.sideToMove).toBe('white');

    a2.closeNow();
    b2.closeNow();
  });
});
