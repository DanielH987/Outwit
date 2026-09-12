// Multiplayer server for Outwit WebSocket rooms.
// - Engine-driven: every move is validated by the pure rules engine.
// - Authoritative state lives here; clients render what the server broadcasts.
// - In-memory rooms only. Run with `npm run server`.
//
// Protocol (JSON):
//   Client → Server: join-room | leave-room | make-move | send-chat | resign | offer-draw | respond-draw
//   Server → Client: connected | room-update | game-state | chat-message | error | disconnected
//
// Types: shared in src/types/index.ts and src/engine/*. See docs/RULES.md.

import { WebSocketServer, WebSocket } from 'ws';
import {
  applyMove,
  createInitialState,
  drawByAgreementResult,
  evaluateGameEnd,
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

interface RoomPlayerState {
  userId: string;
  username: string | null;
  side: PlayerId | null;
}

interface RoomState {
  board: BoardState;
  mover: PlayerId;
  players: RoomPlayerState[];
  spectators: Array<{ userId: string; username: string | null }>;
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
}

const rooms = new Map<string, Room>();
const clients = new Map<string, ClientInfo>();
let nextUserSuffix = 1;

const PORT = Number(process.env.OUTWIT_PORT ?? 3001);

function send(ws: ClientInfo | WebSocket, message: ServerMessage) {
  const target = 'ws' in ws ? ws.ws : ws;
  if (target.readyState === WebSocket.OPEN) {
    target.send(JSON.stringify(message));
  }
}

function broadcastRoom(room: Room, message: ServerMessage) {
  for (const c of [...room.players.values(), ...room.spectators.values()]) send(c.ws, message);
}

function roomStatePayload(room: Room): GameStatePayload {
  const s = room.state;
  return {
    roomId: room.id,
    board: { chips: s.board.chips, sideToMove: s.board.sideToMove },
    players: s.players,
    moveHistory: s.moveHistory,
    result: s.result,
  };
}

function roomUpdatePayload(room: Room): RoomUpdatePayload {
  return {
    roomId: room.id,
    players: room.state.players.map(({ side, userId, username }) => ({ side, userId, username })),
    spectators: room.state.spectators,
  };
}

function broadcastState(room: Room) {
  broadcastRoom(room, { type: 'game-state', payload: roomStatePayload(room) });
}

function broadcastRoomUpdate(room: Room) {
  broadcastRoom(room, { type: 'room-update', payload: roomUpdatePayload(room) });
}

function error(client: ClientInfo, message: string) {
  send(client.ws, { type: 'error', payload: { message } satisfies ErrorPayload });
}

function joinRoom(client: ClientInfo, payload: JoinRoomPayload) {
  const roomId = payload.roomId;
  client.roomId = roomId;
  if (payload.username !== undefined) client.username = payload.username;

  let room = rooms.get(roomId);
  if (!room) {
    room = {
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
    };
    rooms.set(roomId, room);
  }

  // Re-joining an active room re-binds the user's side if they were already in it.
  const existing = room.state.players.find((p) => p.userId === client.userId);
  if (existing) {
    room.players.set(client.userId, client);
    broadcastRoomUpdate(room);
    send(client.ws, { type: 'game-state', payload: roomStatePayload(room) });
    return;
  }

  // Assign a side: first joiner = white, second = black, rest spectate.
  if (room.state.players.length === 0) room.state.players.push({ userId: client.userId, username: client.username, side: 'white' });
  else if (room.state.players.length === 1) room.state.players.push({ userId: client.userId, username: client.username, side: 'black' });
  else room.state.spectators.push({ userId: client.userId, username: client.username });

  if (room.state.players.length >= 2) {
    room.state.board = createInitialState();
    room.state.result = { status: 'in-progress', winner: null, reason: null };
    room.state.lastMoveAt = Date.now();
  }

  room.players.set(client.userId, client);
  broadcastRoomUpdate(room);
  broadcastState(room);
}

function applyMoveToRoom(room: Room, client: ClientInfo, payload: MakeMovePayload) {
  const s = room.state;
  if (s.result.status !== 'in-progress') return;
  if (s.players.length < 2) {
    error(client, 'Waiting for a second player.');
    return;
  }

  const player = s.players.find((p) => p.userId === client.userId)?.side;
  if (!player) {
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

  const from = s.board.chips.find((c) => c.id === move.chipId)?.position;
  const record = {
    number: Math.floor(s.moveHistory.length / 2) + 1,
    player,
    chipId: move.chipId,
    from: { ...from! },
    to: { ...move.to },
    notation: formatMove(move.chipId, from!, move.to),
  };
  const key = positionKey(s.board);

  s.board = board;
  s.mover = opponentOf(s.mover);
  s.moveHistory.push(record);
  s.positionKeys.push(key);
  s.lastMoveAt = Date.now();
  s.result = evaluateGameEnd(board, player, s.positionKeys.slice(0, -1));

  broadcastState(room);
}

function respondToDraw(room: Room, payload: RespondToDrawPayload) {
  const s = room.state;
  if (s.pendingDrawFrom === null) return;
  if (payload.accepted) {
    s.result = drawByAgreementResult();
  }
  s.pendingDrawFrom = null;
  broadcastState(room);
}

function resign(room: Room, client: ClientInfo) {
  const s = room.state;
  const side = s.players.find((p) => p.userId === client.userId)?.side;
  if (side) s.result = resignationResult(side);
  broadcastState(room);
}

function handleMessage(client: ClientInfo, message: ClientMessage) {
  const roomId = client.roomId;
  const room = roomId ? rooms.get(roomId) : undefined;
  if (!room) {
    if (message.type !== 'join-room') return;
  }

  switch (message.type) {
    case 'join-room':
      joinRoom(client, message.payload as JoinRoomPayload);
      return;
    case 'leave-room':
      if (room) {
        room.state.players = room.state.players.filter((p) => p.userId !== client.userId);
        room.state.spectators = room.state.spectators.filter((s) => s.userId !== client.userId);
        room.players.delete(client.userId);
        room.spectators.delete(client.userId);
        broadcastRoomUpdate(room);
        if (room.players.size === 0 && room.spectators.size === 0) rooms.delete(room.id);
      }
      client.roomId = null;
      return;
    case 'make-move':
      applyMoveToRoom(room!, client, message.payload as MakeMovePayload);
      return;
    case 'send-chat': {
      const p = message.payload as SendChatPayload;
      broadcastRoom(room!, {
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
      resign(room!, client);
      return;
    case 'offer-draw': {
      const p = message.payload as OfferDrawPayload;
      const side = room!.state.players.find((pl) => pl.userId === p.userId)?.side;
      if (side) room!.state.pendingDrawFrom = side;
      broadcastState(room!);
      return;
    }
    case 'respond-draw':
      respondToDraw(room!, message.payload as RespondToDrawPayload);
      return;
  }
}

export function startServer(port = PORT) {
  const wss = new WebSocketServer({ port, path: '/ws' });

  wss.on('connection', (ws) => {
    const userId = `user-${nextUserSuffix++}`;
    const client: ClientInfo = { ws, userId, username: null, roomId: null };

    clients.set(userId, client);
    send(ws, { type: 'connected', payload: { userId } });
    send(ws, { type: 'room-update', payload: { roomId: '', players: [], spectators: [] } satisfies RoomUpdatePayload });

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
      clients.delete(userId);
      if (client.roomId) {
        const room = rooms.get(client.roomId);
        if (room) {
          room.state.players = room.state.players.filter((p) => p.userId !== client.userId);
          room.state.spectators = room.state.spectators.filter((s) => s.userId !== client.userId);
          room.players.delete(client.userId);
          room.spectators.delete(client.userId);
          broadcastRoomUpdate(room);
          if (room.players.size === 0 && room.spectators.size === 0) rooms.delete(room.id);
        }
      }
    });
  });

  return wss;
}

// Start when run directly (not during tests, which import startServer).
if (process.argv[1] && process.argv[1].endsWith('index.ts')) {
  startServer();
  console.log(`Outwit WebSocket server listening on ws://localhost:${PORT}/ws`);
}
