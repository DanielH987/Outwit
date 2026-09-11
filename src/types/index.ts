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
  | 'offer-draw';
