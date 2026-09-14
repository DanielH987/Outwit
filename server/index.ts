// Multiplayer server for Outwit WebSocket rooms.
// - Engine-driven: every move is validated by the pure rules engine.
// - Authoritative state lives here; clients render what the server broadcasts.
// - Seats persist across reconnects: join-room with the same userId re-binds
//   the player to their earlier side (white/black) if one was assigned.
// - In-memory rooms only. Run with `npm run server`.
//
// Protocol (JSON):
//   Client → Server: join-room | leave-room | make-move | send-chat | resign | offer-draw | respond-draw
//   Server → Client: connected | room-update | game-state | chat-message | error
//
// Types: shared in src/types/index.ts and src/engine/*. See docs/RULES.md.

import { WebSocketServer, WebSocket } from 'ws';
import {
  applyMove,
  createInitialState,
  drawByAgreementResult,
  evaluateGameEnd,
  forfeitResult,
  formatMove,
  opponentOf,
  positionKey,
  resignationResult,
} from '../src/engine';
import type { BoardState, GameResult, PlayerId } from '../src/engine';
import type {
  ClientMessage,
  ErrorPayload,
  GameStatePayload,
  JoinRoomPayload,
  MakeMovePayload,
  MoveRequest,
  OfferDrawPayload,
  RespondToDrawPayload,
  RoomPlayerSummary,
  RoomUpdatePayload,
  SendChatPayload,
  ServerMessage,
} from '../src/types';

interface ClientInfo {
  ws: WebSocket;
  userId: string;
  username: string | null;
  roomId: string | null;
}

interface RoomPlayer {
  userId: string;
  username: string | null;
  side: PlayerId | null;
  connected: boolean;
}

interface RoomState {
  board: BoardState;
  mover: PlayerId;
  players: RoomPlayer[];
  spectators: RoomPlayer[];
  moveHistory: Array<{ number: number; player: PlayerId; chipId: string; from: { x: number; y: number }; to: { x: number; y: number }; notation: string }>;
  positionKeys: string[];
  result: GameResult;
  pendingDrawFrom: PlayerId | null;
  lastMoveAt: number | null;
}

interface Room {
  id: string;
  state: RoomState;
  players: Map<string, ClientInfo>;
  spectators: Map<string, ClientInfo>;
  forfeitTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, Room>();
let nextUserSuffix = 1;

const PORT = Number(process.env.OUTWIT_PORT ?? 3001);

/** Seconds after which a disconnected seat forfeits. Configurable via env. */
function forfeitSeconds(): number {
  const parsed = Number.parseInt(process.env.OUTWIT_FORFEIT_SECONDS ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 60;
}

function open(ws: WebSocket) {
  return ws.readyState === WebSocket.OPEN;
}

function send(ws: ClientInfo | WebSocket, message: ServerMessage) {
  const target = 'ws' in ws ? ws.ws : ws;
  if (open(target)) target.send(JSON.stringify(message));
}

function broadcastRoom(room: Room, message: ServerMessage) {
  for (const c of [...room.players.values(), ...room.spectators.values()]) {
    send(c.ws, message);
  }
}

function playerSummaries(room: Room): RoomPlayerSummary[] {
  return room.state.players.map((p) => ({
    userId: p.userId,
    username: p.username,
    side: p.side,
    connected: p.connected,
  }));
}

function roomStatePayload(room: Room): GameStatePayload {
  const s = room.state;
  return {
    roomId: room.id,
    board: { chips: s.board.chips, sideToMove: s.board.sideToMove },
    players: playerSummaries(room),
    moveHistory: s.moveHistory,
    result: s.result,
    pendingDrawFrom: s.pendingDrawFrom,
  };
}

function clearForfeitTimer(room: Room) {
  if (room.forfeitTimer) {
    clearTimeout(room.forfeitTimer);
    room.forfeitTimer = null;
  }
}

/** If someone is disconnected mid-game, the connected player wins after the grace period. */
function maybeStartForfeitTimer(room: Room) {
  const s = room.state;
  clearForfeitTimer(room);
  if (s.result.status !== 'in-progress') return;
  if (s.players.length < 2) return;
  const disconnected = s.players.find((p) => !p.connected);
  const connectedPlayer = s.players.find((p) => p.connected);
  if (!disconnected || !connectedPlayer) return;

  room.forfeitTimer = setTimeout(() => {
    if (s.result.status === 'in-progress' && !disconnected.connected) {
      s.result = forfeitResult(disconnected.side as PlayerId);
      broadcastState(room);
    }
  }, forfeitSeconds() * 1000);
}

function roomUpdatePayload(room: Room): RoomUpdatePayload {
  return {
    roomId: room.id,
    players: playerSummaries(room),
    spectators: room.state.spectators.map((s) => ({ userId: s.userId, username: s.username, connected: s.connected })),
  };
}

function broadcastState(room: Room) {
  clearForfeitTimer(room);
  broadcastRoom(room, { type: 'game-state', payload: roomStatePayload(room) });
  maybeStartForfeitTimer(room);
}

function broadcastRoomUpdate(room: Room) {
  broadcastRoom(room, { type: 'room-update', payload: roomUpdatePayload(room) });
}

function error(target: ClientInfo | WebSocket, message: string) {
  send(target, { type: 'error', payload: { message } satisfies ErrorPayload });
}

function createRoom(roomId: string): Room {
  return {
    id: roomId,
    state: {
      board: createInitialState(),
      mover: 'white',
      players: [],
      spectators: [],
      moveHistory: [],
      positionKeys: [],
      result: { status: 'in-progress', winner: null, reason: null },
      pendingDrawFrom: null,
      lastMoveAt: null,
    },
    players: new Map(),
    spectators: new Map(),
    forfeitTimer: null,
  };
}

function joinRoom(client: ClientInfo, payload: JoinRoomPayload) {
  const roomId = payload.roomId;
  client.roomId = roomId;
  if (payload.username !== undefined && payload.username !== null) client.username = payload.username;

  let room = rooms.get(roomId);
  if (!room) {
    room = createRoom(roomId);
    rooms.set(roomId, room);
  }

  // Seats are keyed by the client-supplied userId from the join payload (and
  // every message includes the same userId). A reconnecting client that
  // keeps its userId re-binds to its seat.
  const seatId = payload.userId!;
  const existing = room.state.players.find((p) => p.userId === seatId);
  if (existing) {
    room.players.set(seatId, client);
    existing.connected = true;
    existing.username = client.username ?? existing.username;
    client.userId = seatId;
    broadcastRoomUpdate(room);
    broadcastState(room);
    return;
  }

  if (room.state.players.length === 0) {
    room.state.players.push({ userId: seatId, username: client.username, side: 'white', connected: true });
  } else if (room.state.players.length === 1) {
    room.state.players.push({ userId: seatId, username: client.username, side: 'black', connected: true });
  } else {
    room.state.spectators.push({ userId: seatId, username: client.username, side: null, connected: true });
  }

  client.userId = seatId;
  room.players.set(seatId, client);
  broadcastRoomUpdate(room);
  broadcastState(room);
}

function removeClientFromRoom(room: Room, client: ClientInfo) {
  const player = room.state.players.find((p) => p.userId === client.userId);
  if (player) player.connected = false;

  room.state.spectators = room.state.spectators.filter((s) => s.userId !== client.userId);
  room.players.delete(client.userId);
  room.spectators.delete(client.userId);

  broadcastRoomUpdate(room);
  // Also broadcast game-state so clients see the connection-status change.
  broadcastState(room);
  // Rooms persist while anyone holds a seat (even if disconnected), so a
  // reconnect can re-bind. Rooms are only dropped when nobody ever joined.
  if (room.state.players.length === 0 && room.state.spectators.length === 0) {
    clearForfeitTimer(room);
    rooms.delete(room.id);
  }
}

function applyMoveToRoom(room: Room, client: ClientInfo, payload: MakeMovePayload) {
  const s = room.state;
  if (s.result.status !== 'in-progress') return;
  if (s.players.length < 2) {
    error(client, 'Waiting for a second player.');
    return;
  }

  const side = s.players.find((p) => p.userId === client.userId)?.side;
  if (!side) {
    error(client, 'Only players in the room can move.');
    return;
  }

  const move: MoveRequest = { chipId: payload.move.chipId, to: payload.move.to };
  let board: BoardState;
  try {
    board = applyMove(s.board, move); // engine validates side-to-move and legality
  } catch {
    error(client, 'Illegal move.');
    return;
  }

  const from = s.board.chips.find((c) => c.id === move.chipId)!.position;
  s.moveHistory.push({
    number: Math.floor(s.moveHistory.length / 2) + 1,
    player: side,
    chipId: move.chipId,
    from: { ...from },
    to: { ...move.to },
    notation: formatMove(move.chipId, from, move.to),
  });
  s.positionKeys.push(positionKey(s.board));

  s.board = board;
  s.mover = opponentOf(s.mover);
  s.lastMoveAt = Date.now();
  s.result = evaluateGameEnd(board, side, s.positionKeys.slice(0, -1));

  broadcastState(room);
}

function resign(room: Room, client: ClientInfo) {
  const s = room.state;
  const side = s.players.find((p) => p.userId === client.userId)?.side;
  if (side) s.result = resignationResult(side);
  broadcastState(room);
}

function handleMessage(client: ClientInfo, message: ClientMessage) {
  let room = client.roomId ? rooms.get(client.roomId) : undefined;

  switch (message.type) {
    case 'join-room':
      joinRoom(client, message.payload as JoinRoomPayload);
      return;
    case 'leave-room':
      if (room) removeClientFromRoom(room, client);
      client.roomId = null;
      return;
    case 'make-move':
      if (!room) return;
      applyMoveToRoom(room, client, message.payload as MakeMovePayload);
      return;
    case 'send-chat': {
      if (!room) return;
      const p = message.payload as SendChatPayload;
      broadcastRoom(room, {
        type: 'chat-message',
        payload: {
          id: `${client.userId}-${Date.now()}`,
          senderId: client.userId,
          username: p.username ?? client.username ?? 'Anon',
          text: p.text,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    case 'resign':
      if (room) resign(room, client);
      return;
    case 'offer-draw': {
      if (!room) return;
      const p = message.payload as OfferDrawPayload;
      const side = room.state.players.find((pl) => pl.userId === p.userId)?.side;
      if (side) room.state.pendingDrawFrom = side;
      broadcastState(room);
      return;
    }
    case 'respond-draw': {
      if (!room) return;
      const payload = message.payload as RespondToDrawPayload;
      const s = room.state;
      if (s.pendingDrawFrom === null) return;
      const side = s.players.find((pl) => pl.userId === payload.userId)?.side;
      if (side === s.pendingDrawFrom) return; // can't accept your own offer
      if (!side) return; // spectators can't respond
      if (payload.accepted) s.result = drawByAgreementResult();
      s.pendingDrawFrom = null;
      broadcastState(room);
      return;
    }
  }
}

export function startServer(port = PORT) {
  const wss = new WebSocketServer({ port, path: '/ws' });

  wss.on('connection', (ws) => {
    const userId = `user-${nextUserSuffix++}`;
    const client: ClientInfo = { ws, userId, username: null, roomId: null };

    send(ws, { type: 'connected', payload: { userId } });

    ws.on('message', (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        error(client, 'Malformed message.');
        return;
      }
      handleMessage(client, message);
    });

    ws.on('close', () => {
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) removeClientFromRoom(room, client);
      }
    });
  });

  return wss;
}

if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  startServer();
  console.log(`Outwit WebSocket server listening on ws://localhost:${PORT}/ws`);
}
