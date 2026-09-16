// Pure replay helpers. Moves are stored with `from`/`to`, and Outwit has no
// captures, so any historical position is reconstructable by replaying the
// first N moves from the standard starting position. No server involvement —
// board history is derived entirely on the client.
//
// `atMove` uses -1 to mean "before any move" (the initial position); 0 is after
// move 1, and so on. Both the local store and the server's game-state use the
// same `{ chipId, to }` shape, so this works for pass-and-play and online alike.

import { createInitialState } from './setup';
import { applyMove } from './rules';
import type { BoardState, Position } from './types';

/** A move as stored in history (engine-agnostic subset of engine MoveRequest). */
export interface ReplayMove {
  chipId: string;
  from: Position;
  to: Position;
}

/**
 * Board state after `moveIndex` moves (-1 = initial position). Returns the
 * initial state when the index is out of range, and never throws: a malformed
 * history degrades to the last position it could replay.
 */
export function boardAtMove(moves: ReplayMove[], moveIndex: number): BoardState {
  let state = createInitialState();
  const last = Math.min(moveIndex, moves.length - 1);
  for (let i = 0; i <= last; i++) {
    const move = moves[i];
    try {
      state = applyMove(state, { chipId: move.chipId, to: move.to });
    } catch {
      // History should always be legal; if not, stop at the last good position.
      break;
    }
  }
  return state;
}
