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
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(PORT);
  });

  afterAll(() => {
    server.close();
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

    // Find A's side from the game state.
    const state = await b.nextBy('game-state');
    const aSide = (state.payload as any).players.find((p: any) => p.userId === a.userId)?.side;

    a.send('offer-draw', { roomId, userId: a.userId });
    await b.nextBy('game-state', (p) => p.pendingDrawFrom === aSide);

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

    // Find B's side from the game state (randomized).
    const state = await b.nextBy('game-state');
    const bSide = (state.payload as any).players.find((p: any) => p.userId === b.userId)?.side;

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
    expect(me.side).toBe(bSide);
    expect(me.connected).toBe(true);

    const state2 = await b2.nextBy('game-state');
    expect((state2.payload as any).board.sideToMove).toBe('white');

    a2.closeNow();
    b2.closeNow();
  });

  it('join-room with a null userId gets a distinct seat instead of colliding', async () => {
    const roomId = 'anon-seats';
    const a = await connect();
    a.send('join-room', { roomId, userId: null, username: 'AnonA' });
    const b = await connect();
    b.send('join-room', { roomId, userId: null, username: 'AnonB' });

    const update = await b.nextBy('room-update', (p) => p.players.length === 2);
    const players = (update.payload as any).players;
    expect(players).toHaveLength(2);
    expect(new Set(players.map((p: any) => p.userId)).size).toBe(2);
    expect(players.map((p: any) => p.side).sort()).toEqual(['black', 'white']);
    a.closeNow();
    b.closeNow();
  });

  it('a late close from a replaced socket does not detach the new connection', async () => {
    const roomId = 'replace';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    await a.nextBy('room-update');

    const b1 = await connect();
    b1.send('join-room', { roomId, userId: b1.userId, username: 'B' });
    await b1.nextBy('room-update', (p) => p.players.length === 2);

    // Find A's side from the game state.
    const state = await b1.nextBy('game-state');
    const aSide = (state.payload as any).players.find((p: any) => p.userId === a.userId)?.side;
    const aChip = aSide === 'white' ? 'white-1' : 'black-9';

    // A second socket re-binds the same seat (tab refresh / reconnect).
    const b2 = await connect();
    b2.send('join-room', { roomId, userId: b1.userId, username: 'B' });
    await b2.nextBy('room-update');

    // The old socket's close arrives afterwards.
    b1.closeNow();
    await new Promise((r) => setTimeout(r, 200));

    // A moves; the new socket must still receive broadcasts...
    a.send('make-move', { roomId, userId: a.userId, move: { chipId: aChip, to: aSide === 'white' ? { x: 0, y: 6 } : { x: 8, y: 3 } } });
    const moveState = await b2.nextBy('game-state', (p) => p.board.chips.find((c: any) => c.id === aChip)?.position.y === (aSide === 'white' ? 6 : 3));
    expect((moveState.payload as any).board.chips.find((c: any) => c.id === aChip).position).toEqual(aSide === 'white' ? { x: 0, y: 6 } : { x: 8, y: 3 });

    // ...and the replaced socket may not act.
    const blockedChip = aSide === 'white' ? 'black-1' : 'white-1';
    b1.send('make-move', { roomId, userId: b1.userId, move: { chipId: blockedChip, to: { x: 0, y: 5 } } });
    const blocked = await b2.nextBy('game-state', (p) => p.board.chips.find((c: any) => c.id === blockedChip)?.position.y === 5).then(() => false).catch(() => true);
    expect(blocked).toBe(true);

    a.closeNow();
    b2.closeNow();
  });
});
