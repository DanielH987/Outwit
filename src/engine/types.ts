// Domain types for the Outwit rules engine. See docs/RULES.md (source of truth).

/** White is Player 1 (top-right base, moves first). Black is Player 2. */
export type PlayerId = 'white' | 'black';

export interface Position {
  x: number;
  y: number;
}

export interface Chip {
  /** e.g. 'white-5' — chip 5 is the power chip. */
  id: string;
  player: PlayerId;
  isPower: boolean;
  position: Position;
}

export interface BoardState {
  chips: Chip[];
  sideToMove: PlayerId;
}

export interface MoveRequest {
  chipId: string;
  to: Position;
}

export type GameEndReason =
  | 'base-filled'
  | 'stalemate'
  | 'agreement'
  | 'repetition'
  | 'resignation';

export interface GameResult {
  status: 'in-progress' | 'finished';
  /** Null when the game is in progress or ended in a draw. */
  winner: PlayerId | null;
  reason: GameEndReason | null;
}
