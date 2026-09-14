// Integration tests for the multiplayer server over real WebSockets.
// A single server instance is shared; each test uses its own room so state
// doesn't leak. `next(type)` reads the NEXT message of a given type while
// buffering others.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startServer } from '../../server/index'; // starts server/index.ts when run via tsx
import type { ServerMessage } from '../types';

const PORT = 3456;

interface TestClient {
  ws: WebSocket;
  userId: string;
  send: (type: string, payload: unknown) => void;
  next: (type?: string) => Promise<ServerMessage>;
  close: () => void;
}

function connect(): Promise<TestClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`);
    const buffer: ServerMessage[] = [];
    ws.on('message', (raw) => buffer.push(JSON.parse(raw.toString()) as ServerMessage));
    ws.on('error', reject);

    const readNext = (type?: string): Promise<ServerMessage> =>
      new Promise((res, rejErr) => {
        const started = Date.now();
        const poll = () => {
          let idx = -1;
          if (type) idx = buffer.findIndex((m) => m.type === type);
          else idx = buffer.length > 0 ? 0 : -1;
          if (idx !== -1) return res(buffer.splice(idx, 1)[0]);
          if (Date.now() - started > 2000) return rejErr(new Error(`timeout waiting for ${type ?? 'any message'}`));
          setTimeout(poll, 10);
        };
        void poll();
      });

    ws.on('open', async () => {
      const connected = await readNext('connected');
      const userId = (connected.payload as { userId: string }).userId;
      resolve({
        ws,
        userId,
        send: (type, payload) => ws.send(JSON.stringify({ type, payload })),
        next: readNext,
        close: () => ws.close(),
      });
    });
  });
}

describe('multiplayer server', () => {
  let server: ReturnType<typeof startServer>;

  beforeAll(() => {
    server = startServer(PORT);
  });

  afterAll(() => {
    server.close();
  });

  it('assigns sides (white then black) and broadcasts alternating moves', async () => {
    const roomId = 'sides';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    await a.next('room-update');
    await a.next('game-state'); // initial

    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.next('room-update');
    const state = await b.next('game-state'); // latest after b joins
    expect(state.type).toBe('game-state');
    expect((state.payload as any).board.sideToMove).toBe('white');
    expect((state.payload as any).players.map((p: any) => p.side)).toEqual(['white', 'black']);

    a.send('make-move', { roomId, userId: a.userId, move: { chipId: 'white-1', to: { x: 0, y: 6 } } });
    // Keep reading game-state updates until we see the post-move one.
    let afterA = await a.next('game-state');
    while ((afterA.payload as any).board.sideToMove !== 'black') {
      afterA = await a.next('game-state');
    }
    expect((afterA.payload as any).board.chips.find((c: any) => c.id === 'white-1').position).toEqual({ x: 0, y: 6 });
    expect((afterA.payload as any).board.sideToMove).toBe('black');

    b.send('make-move', { roomId, userId: b.userId, move: { chipId: 'black-9', to: { x: 8, y: 3 } } });
    let afterB = await b.next('game-state');
    while ((afterB.payload as any).board.sideToMove !== 'white') {
      afterB = await b.next('game-state');
    }
    expect((afterB.payload as any).board.sideToMove).toBe('white');
    expect((afterB.payload as any).moveHistory.map((m: any) => m.notation)).toEqual(['1 a9→a4', '9 i2→i7']);

    a.close();
    b.close();
  });

  it('rejects out-of-turn and illegal moves with an error', async () => {
    const roomId = 'errors';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.next('room-update');
    await a.next('room-update'); // b joining re-broadcasts to a too

    b.send('make-move', { roomId, userId: b.userId, move: { chipId: 'black-9', to: { x: 8, y: 3 } } });
    const outOfTurn = await b.next('error');
    expect(outOfTurn.type).toBe('error');
    expect((outOfTurn.payload as any).message).toMatch(/Illegal move/);

    a.send('make-move', { roomId, userId: a.userId, move: { chipId: 'white-1', to: { x: 0, y: 3 } } });
    const illegal = await a.next('error');
    expect((illegal.payload as any).message).toMatch(/Illegal move/);

    a.close();
    b.close();
  });

  it('detects resignation', async () => {
    const roomId = 'resign';
    const a = await connect();
    a.send('join-room', { roomId, userId: a.userId, username: 'A' });
    const b = await connect();
    b.send('join-room', { roomId, userId: b.userId, username: 'B' });
    await b.next('room-update');
    await b.next('game-state'); // drain the pre-resign one

    b.send('resign', { roomId, userId: b.userId });
    let end = await b.next('game-state');
    while ((end.payload as any).result.status !== 'finished') {
      end = await b.next('game-state');
    }
    expect((end.payload as any).result).toEqual({ status: 'finished', winner: 'white', reason: 'resignation' });

    a.close();
    b.close();
  });
});
