export interface Player {
  id: string;
  username: string;
  rating: number;
  isConnected: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  gameType: GameType;
  status: GameStatus;
  players: Player[];
  spectators: Player[];
  timeControl: TimeControl;
  createdAt: string;
}

export type GameType = 'custom' | 'quick-match' | 'rated';
export type GameStatus = 'waiting' | 'in-progress' | 'finished';

export interface TimeControl {
  initialMinutes: number;
  incrementSeconds: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  text: string;
  timestamp: string;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload: unknown;
}

export interface ClientMessage {
  type: ClientMessageType;
  payload: unknown;
}

// Online room protocol (server/). Engine state is shared as-is so the pure
// engine in src/engine/ is the single source of truth on both sides.

/** A move sent by a client, e.g. white chip 1 to (0, 6). */
export interface OutwitClientMove {
  chipId: string;
  to: { x: number; y: number };
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string | null;
  username: string | null;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string | null;
}

export interface MakeMovePayload {
  roomId: string;
  userId: string | null;
  move: OutwitClientMove;
}

export interface SendChatPayload {
  roomId: string;
  userId: string | null;
  username: string | null;
  text: string;
}

export interface ResignPayload {
  roomId: string;
  userId: string | null;
}

export interface OfferDrawPayload {
  roomId: string;
  userId: string | null;
}

export interface RespondToDrawPayload {
  roomId: string;
  userId: string | null;
  accepted: boolean;
}

/** Payloads for ServerMessage types. */
export interface ConnectedPayload {
  userId: string;
}

export interface RoomUpdatePayload {
  roomId: string;
  players: Array<{ userId: string; username: string | null; side: 'white' | 'black' | null }>;
  spectators: Array<{ userId: string; username: string | null }>;
}

/** Authoritative game state broadcast to all room participants. */
export interface GameStatePayload {
  roomId: string;
  board: { chips: Chip[]; sideToMove: PlayerId };
  players: Array<{ userId: string; username: string | null; side: 'white' | 'black' | null }>;
  moveHistory: Array<{ number: number; player: PlayerId; notation: string; chipId: string; from: Position; to: Position }>;
  result: import('@/engine').GameResult;
}

export interface ErrorPayload {
  message: string;
}

export type ServerMessageType =
  | 'connected'
  | 'disconnected'
  | 'room-update'
  | 'game-state'
  | 'chat-message'
  | 'error';

export type ClientMessageType =
  | 'join-room'
  | 'leave-room'
  | 'make-move'
  | 'send-chat'
  | 'resign'
  | 'offer-draw'
  | 'respond-draw';

// Rules-engine domain types (docs/RULES.md). Re-exported so `import type { Position } from '@/types'` works project-wide.
import type { Chip, PlayerId, Position } from '@/engine/types';
export type { PlayerId, Position, Chip, BoardState, MoveRequest, GameEndReason, GameResult } from '@/engine/types';
