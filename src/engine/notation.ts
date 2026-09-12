// Move-notation helpers for history/UI. Compact, engine-agnostic strings.
//
// Format: `P8(4,9)->(3,9)` for chip 8 of a player; power chips carry a ★.
// Player name omitted — history is rendered in two columns like chess.

import type { PlayerId, Position } from './types';

/** Compact label for one chip move, e.g. `5★(4,5)→(4,9)` or `8(0,1)→(0,6)`. */
export function formatMove(chipId: string, from: Position, to: Position): string {
  const chipNumber = chipId.split('-')[1];
  const star = chipId.endsWith('-5') ? '★' : '';
  return `${chipNumber}${star}(${from.x},${from.y})→(${to.x},${to.y})`;
}

/** Friendly label, e.g. `White` / `Black`. Reused by UI. */
export function playerLabel(player: PlayerId): string {
  return player === 'white' ? 'White' : 'Black';
}
