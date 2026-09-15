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
import { createServer, type Server as HttpServer } from 'node:http';
import { verifySupabaseToken, type SupabaseJwtConfig } from './auth';
import { matchRecorderConfig, recordMatch } from './matches';
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
  /** Epoch ms when the current disconnect-forfeit fires, if one is running. */
  forfeitDeadline: number | null;
  lastActivityAt: number;
  /** True once this room's finished game has been persisted (idempotency). */
  recorded: boolean;
}

const rooms = new Map<string, Room>();
let nextUserSuffix = 1;

const PORT = Number(process.env.PORT ?? process.env.OUTWIT_PORT ?? 3001);

/** Supabase JWT verification config; null when not configured (guest-only). */
function supabaseAuthConfig(): SupabaseJwtConfig | null {
  const url = process.env.SUPABASE_URL;
  if (!url) return null;
  return { url, jwtSecret: process.env.SUPABASE_JWT_SECRET };
}

/**
 * Seconds after which a disconnected seat forfeits. Configurable via env.
 *
 * Default 30s: chess.com scales its reconnect window with the clock (10% of
 * base time, min 30s, max 3m), but Outwit has no clock pressure — the game
 * clock is informational. 30s (their minimum) survives a real wifi blip or an
 * accidental refresh without making the opponent stare at a stalled board.
 */
function forfeitSeconds(): number {
  const parsed = Number.parseInt(process.env.OUTWIT_FORFEIT_SECONDS ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 30;
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
  const disconnected = s.players.find((p) => !p.connected && p.side !== null);
  return {
    roomId: room.id,
    board: { chips: s.board.chips, sideToMove: s.board.sideToMove },
    players: playerSummaries(room),
    moveHistory: s.moveHistory,
    result: s.result,
    pendingDrawFrom: s.pendingDrawFrom,
    // Present only while a seat is absent and the game is still live.
    forfeit:
      s.result.status === 'in-progress' && disconnected && room.forfeitDeadline !== null
        ? {
            side: disconnected.side as PlayerId,
            deadline: room.forfeitDeadline,
            serverNow: Date.now(),
            graceSeconds: forfeitSeconds(),
          }
        : null,
  };
}

function clearForfeitTimer(room: Room) {
  if (room.forfeitTimer) {
    clearTimeout(room.forfeitTimer);
    room.forfeitTimer = null;
  }
  room.forfeitDeadline = null;
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

  const grace = forfeitSeconds();
  room.forfeitDeadline = Date.now() + grace * 1000;
  room.forfeitTimer = setTimeout(() => {
    if (s.result.status === 'in-progress' && !disconnected.connected) {
      s.result = forfeitResult(disconnected.side as PlayerId);
      broadcastState(room);
    }
  }, grace * 1000);
}

function roomUpdatePayload(room: Room): RoomUpdatePayload {
  return {
    roomId: room.id,
    players: playerSummaries(room),
    spectators: room.state.spectators.map((s) => ({ userId: s.userId, username: s.username, connected: s.connected })),
  };
}

function broadcastState(room: Room) {
  room.lastActivityAt = Date.now();
  clearForfeitTimer(room);
  // Start the disconnect countdown *before* building the payload so the
  // broadcast carries the deadline clients count down against.
  maybeStartForfeitTimer(room);
  broadcastRoom(room, { type: 'game-state', payload: roomStatePayload(room) });
  maybeRecordFinishedMatch(room);
}

/** Persist the finished game once per room (best-effort; never blocks gameplay). */
function maybeRecordFinishedMatch(room: Room) {
  const s = room.state;
  if (room.recorded) return;
  if (s.result.status !== 'finished' || s.result.reason === null) return;
  const white = s.players.find((p) => p.side === 'white');
  const black = s.players.find((p) => p.side === 'black');
  if (!white || !black) return;

  room.recorded = true;
  void recordMatch(
    {
      roomId: room.id,
      whiteId: white.userId,
      blackId: black.userId,
      whiteName: white.username,
      blackName: black.username,
      winner: s.result.winner,
      reason: s.result.reason,
      moveCount: s.moveHistory.length,
    },
    matchRecorderConfig()
  );
}

function broadcastRoomUpdate(room: Room) {
  room.lastActivityAt = Date.now();
  broadcastRoom(room, { type: 'room-update', payload: roomUpdatePayload(room) });
}

/** Minutes an abandoned room (no connected clients) is kept for reconnects. */
function roomTtlSeconds(): number {
  const parsed = Number.parseInt(process.env.OUTWIT_ROOM_TTL_SECONDS ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 1800;
}

/** Drop rooms nobody is connected to after the TTL; prevents unbounded growth. */
function sweepAbandonedRooms() {
  const cutoff = Date.now() - roomTtlSeconds() * 1000;
  for (const [id, room] of rooms) {
    if (room.players.size > 0 || room.spectators.size > 0) continue;
    if (room.lastActivityAt > cutoff) continue;
    clearForfeitTimer(room);
    rooms.delete(id);
  }
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
    forfeitDeadline: null,
    lastActivityAt: Date.now(),
    recorded: false,
  };
}

function joinRoom(client: ClientInfo, payload: JoinRoomPayload, verifiedSub?: string | null) {
  const roomId = payload.roomId;
  client.roomId = roomId;
  if (payload.username !== undefined && payload.username !== null) client.username = payload.username;

  let room = rooms.get(roomId);
  if (!room) {
    room = createRoom(roomId);
    rooms.set(roomId, room);
  }

  // Seat priority: a verified Supabase `sub` (signed-in player) wins over the
  // client-supplied id; a mismatched claim is rejected by the caller. Guests
  // fall back to their client-supplied id, or an anonymous seat.
  const seatId = verifiedSub ?? payload.userId ?? `anon-${nextUserSuffix++}`;
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

  const existingSpectator = room.state.spectators.find((s) => s.userId === seatId);
  if (existingSpectator) {
    room.spectators.set(seatId, client);
    existingSpectator.connected = true;
    existingSpectator.username = client.username ?? existingSpectator.username;
    client.userId = seatId;
    broadcastRoomUpdate(room);
    broadcastState(room);
    return;
  }

  client.userId = seatId;
  if (room.state.players.length === 0) {
    room.state.players.push({ userId: seatId, username: client.username, side: 'white', connected: true });
    room.players.set(seatId, client);
  } else if (room.state.players.length === 1) {
    room.state.players.push({ userId: seatId, username: client.username, side: 'black', connected: true });
    room.players.set(seatId, client);
  } else {
    room.state.spectators.push({ userId: seatId, username: client.username, side: null, connected: true });
    room.spectators.set(seatId, client);
  }

  broadcastRoomUpdate(room);
  broadcastState(room);
}

function removeClientFromRoom(room: Room, client: ClientInfo) {
  const isCurrentPlayer = room.players.get(client.userId) === client;
  const isCurrentSpectator = room.spectators.get(client.userId) === client;

  // A late close from a socket that was already replaced by a reconnect must
  // not detach the successor. Without this, a refresh could freeze the new
  // socket: it would stop receiving broadcasts while still acting as a player.
  if (!isCurrentPlayer && !isCurrentSpectator) return;

  if (isCurrentPlayer) {
    const player = room.state.players.find((p) => p.userId === client.userId);
    if (player) player.connected = false;
    room.players.delete(client.userId);
  }
  if (isCurrentSpectator) {
    room.spectators.delete(client.userId);
    room.state.spectators = room.state.spectators.filter((s) => s.userId !== client.userId);
  }

  broadcastRoomUpdate(room);
  // Also broadcast game-state so clients see the connection-status change.
  broadcastState(room);  // Rooms persist while anyone holds a seat (even if disconnected), so a
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

/** True if this socket is the current binding for its seat in the room. */
function isCurrentBinding(room: Room, client: ClientInfo): boolean {
  return room.players.get(client.userId) === client || room.spectators.get(client.userId) === client;
}

async function handleMessage(client: ClientInfo, message: ClientMessage) {
  const room = client.roomId ? rooms.get(client.roomId) : undefined;

  // A socket that has been replaced by a newer reconnect is no longer bound to
  // the room and must not act: its view is frozen, so letting it move would
  // apply phantom moves it cannot see. join-room/leave-room still pass so the
  // socket can rebind or exit cleanly.
  if (room && !isCurrentBinding(room, client) && message.type !== 'join-room' && message.type !== 'leave-room') {
    error(client, 'This session was replaced by a newer connection.');
    return;
  }

  switch (message.type) {
    case 'join-room': {
      const payload = message.payload as JoinRoomPayload;
      let verifiedSub: string | null = null;

      if (payload.token) {
        const verified = await verifySupabaseToken(payload.token, supabaseAuthConfig());
        if (!verified) {
          error(client, 'Sign-in expired or invalid. Please sign in again.');
          return;
        }
        // Impersonation guard: a signed-in client must claim its own account id.
        if (payload.userId && payload.userId !== verified.sub) {
          error(client, 'Identity mismatch.');
          return;
        }
        verifiedSub = verified.sub;
      }

      joinRoom(client, payload, verifiedSub);
      return;
    }
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

export interface RunningServer {
  wss: WebSocketServer;
  httpServer: HttpServer;
  close: () => void;
}

/**
 * WebSocket heartbeat interval. Render's proxy can hold a dead TCP connection
 * open long after the client is gone (measured ~11s locally against the proxy),
 * so `close` never fires promptly and a disconnected seat looks connected until
 * the OS times the socket out. A socket that misses one ping round is
 * terminated, so a real disconnect is detected in 1-2 intervals (~5-10s).
 */
const HEARTBEAT_INTERVAL_MS = 5_000;

/** Current room/snapshot counts for diagnostics. */
function serverStats() {
  let players = 0;
  let spectators = 0;
  let moves = 0;
  for (const room of rooms.values()) {
    players += room.state.players.length;
    spectators += room.state.spectators.length;
    moves += room.state.moveHistory.length;
  }
  return { rooms: rooms.size, players, spectators, moves, heapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) };
}

export function startServer(port = PORT): RunningServer {
  // HTTP server so PaaS health checks (web services probe an HTTP path) get a 200.
  // Also serves /stats for diagnostics.
  const httpServer = createServer((req, res) => {
    if (req.url === '/stats') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(serverStats()));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
  });

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Liveness: mark each connection alive on connect and on every pong, then
  // ping all sockets each round. A socket that failed to pong since the last
  // round is dead — terminate it so `close` runs and the room sees the
  // disconnect immediately.
  const alive = new WeakSet<WebSocket>();
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref?.();

  wss.on('connection', (ws) => {
    const userId = `user-${nextUserSuffix++}`;
    const client: ClientInfo = { ws, userId, username: null, roomId: null };

    alive.add(ws);
    ws.on('pong', () => alive.add(ws));

    send(ws, { type: 'connected', payload: { userId } });

    ws.on('message', (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        error(client, 'Malformed message.');
        return;
      }
      void handleMessage(client, message).catch((err) => {
        console.error('[outwit-server] message handler error:', err);
        error(client, 'Something went wrong handling that message.');
      });
    });

    ws.on('close', () => {
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) removeClientFromRoom(room, client);
      }
    });
  });

  httpServer.listen(port, '0.0.0.0');

  const sweep = setInterval(sweepAbandonedRooms, 60_000);
  sweep.unref?.();

  return {
    wss,
    httpServer,
    close() {
      clearInterval(sweep);
      clearInterval(heartbeat);
      wss.close();
      httpServer.close();
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  startServer();
  console.log(`Outwit WebSocket server listening on 0.0.0.0:${PORT}/ws (http health: /)`);
}
