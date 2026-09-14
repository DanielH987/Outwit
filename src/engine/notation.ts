// Move-notation helpers for history/UI. Compact, engine-agnostic strings.
//
// Coordinates use chess.com conventions for display: files are lowercase
// letters a–i (x: 0–8, left to right) and ranks are numbers with 1 at the
// BOTTOM, increasing upward (`rank = BOARD_HEIGHT - y`). So the engine's
// top-left origin (0,0) is `a10`, and (0,9) is `a1`.
//
// Format: `8 a9→a4` for chip 8 of a player; power chips carry a ★.

import { BOARD_HEIGHT } from './board';
import type { PlayerId, Position } from './types';

const FILE_LETTERS = 'abcdefghi';

/** Column label for x, e.g. 0 → `a`, 8 → `i`. */
export function fileLabel(x: number): string {
  return FILE_LETTERS[x] ?? String(x);
}

/** Row label for y, chess-style: y=9 (bottom) → `1`, y=0 (top) → `10`. */
export function rankLabel(y: number): string {
  return String(BOARD_HEIGHT - y);
}

/** Board coordinate, e.g. `(0,1)` → `a2`. */
export function formatPosition(pos: Position): string {
  return `${fileLabel(pos.x)}${rankLabel(pos.y)}`;
}

/** Compact label for one chip move, e.g. `5★ d6→d10` or `8 a2→a7`. */
export function formatMove(chipId: string, from: Position, to: Position): string {
  const chipNumber = chipId.split('-')[1];
  const star = chipId.endsWith('-5') ? '★' : '';
  return `${chipNumber}${star} ${formatPosition(from)}→${formatPosition(to)}`;
}

/** Friendly label, e.g. `White` / `Black`. Reused by UI. */
export function playerLabel(player: PlayerId): string {
  return player === 'white' ? 'White' : 'Black';
}
