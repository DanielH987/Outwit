// Move application and game-end evaluation. Game end: docs/RULES.md §9.
//
// Board moves are pure transitions; resign and draw offers are match-level
// actions modeled here as results without board mutation.

import { baseTiles, chipAt, isInBase, opponentOf, samePosition } from './board';
import { getLegalMoves, hasAnyLegalMove } from './moves';
import type { BoardState, GameResult, MoveRequest, PlayerId, Position } from './types';

/** True when every tile of a player's base is occupied by that player's chips. */
export function isWin(state: BoardState, player: PlayerId): boolean {
  return baseTiles(player).every((tile) => chipAt(state, tile)?.player === player);
}

/**
 * A canonical, order-independent key for the full position: chip placement
 * plus the side to move. Lock-in state need not be included separately —
 * a chip is locked in iff it sits in its own base, which placement determines.
 * Used to detect threefold repetition.
 */
export function positionKey(state: BoardState): string {
  const placement = state.chips
    .map((chip) => `${chip.id}@${chip.position.x},${chip.position.y}`)
    .sort()
    .join(' ');
  return `${placement}|move:${state.sideToMove}`;
}

/**
 * Applies a legal move and returns the new state. Throws on illegal input.
 * Does not evaluate game end — call evaluateGameEnd next.
 */
export function applyMove(state: BoardState, move: MoveRequest): BoardState {
  const chip = state.chips.find((c) => c.id === move.chipId);
  if (!chip) throw new Error(`No chip with id "${move.chipId}"`);
  if (chip.player !== state.sideToMove) throw new Error(`Not ${chip.player}'s turn`);

  const legal = getLegalMoves(state, move.chipId).some((pos) => samePosition(pos, move.to));
  if (!legal) throw new Error(`Illegal move for ${move.chipId} to (${move.to.x}, ${move.to.y})`);

  const chips = state.chips.map((c) => (c.id === move.chipId ? { ...c, position: { ...move.to } } : c));
  return { chips, sideToMove: opponentOf(state.sideToMove) };
}

/**
 * Evaluates the game end after a move by `mover`, in the order: win,
 * stalemate, repetition. `positionHistory` holds prior `positionKey` values
 * from earlier in the game (after every finished turn, including the current
 * key's earlier occurrences). Resignation and draw by agreement are match-level
 * actions — callers should construct those results directly.
 */
export function evaluateGameEnd(state: BoardState, mover: PlayerId, positionHistory: string[]): GameResult {
  if (isWin(state, mover)) {
    return { status: 'finished', winner: mover, reason: 'base-filled' };
  }
  if (!hasAnyLegalMove(state, state.sideToMove)) {
    return { status: 'finished', winner: null, reason: 'stalemate' };
  }
  const key = positionKey(state);
  const occurrences = 1 + positionHistory.filter((k) => k === key).length;
  if (occurrences >= 3) {
    return { status: 'finished', winner: null, reason: 'repetition' };
  }
  return { status: 'in-progress', winner: null, reason: null };
}

/** Result for a resignation: the opponent of `resigner` wins. */
export function resignationResult(resigner: PlayerId): GameResult {
  return { status: 'finished', winner: opponentOf(resigner), reason: 'resignation' };
}

/** Result for a disconnection forfeit: the still-connected player wins. */
export function forfeitResult(forfeiter: PlayerId): GameResult {
  return { status: 'finished', winner: opponentOf(forfeiter), reason: 'forfeit' };
}

/** Result for an accepted draw offer. */
export function drawByAgreementResult(): GameResult {
  return { status: 'finished', winner: null, reason: 'agreement' };
}

/** Helper for tests/UI: the side whose base a position belongs to, if any. */
export function baseOwner(pos: Position): PlayerId | null {
  if (isInBase(pos, 'white')) return 'white';
  if (isInBase(pos, 'black')) return 'black';
  return null;
}
