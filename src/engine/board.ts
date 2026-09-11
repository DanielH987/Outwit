// Board geometry: dimensions, bases, and starting positions.
// Coordinates: x in 0..8 (columns, left to right), y in 0..9 (rows, top to bottom).
// Origin (0, 0) is the top-left tile. See docs/RULES.md.

import type { BoardState, Chip, PlayerId, Position } from './types';

export const BOARD_WIDTH = 9;
export const BOARD_HEIGHT = 10;

export const CHIPS_PER_PLAYER = 9;

/** Chip number 5 (of 9) is the power chip. */
export const POWER_CHIP_NUMBER = 5;

/** 3x3 base rectangles. White = Player 1 (top-right), Black = Player 2 (bottom-left). */
export const BASE_RANGES: Record<PlayerId, { minX: number; maxX: number; minY: number; maxY: number }> = {
  white: { minX: 6, maxX: 8, minY: 0, maxY: 2 },
  black: { minX: 0, maxX: 2, minY: 7, maxY: 9 },
};

export function isInBounds(pos: Position): boolean {
  return pos.x >= 0 && pos.x < BOARD_WIDTH && pos.y >= 0 && pos.y < BOARD_HEIGHT;
}

export function isInBase(pos: Position, player: PlayerId): boolean {
  const base = BASE_RANGES[player];
  return pos.x >= base.minX && pos.x <= base.maxX && pos.y >= base.minY && pos.y <= base.maxY;
}

export function isInEnemyBase(pos: Position, player: PlayerId): boolean {
  return isInBase(pos, opponentOf(player));
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'white' ? 'black' : 'white';
}

/** All 9 tiles of a player's base, row-major order. */
export function baseTiles(player: PlayerId): Position[] {
  const base = BASE_RANGES[player];
  const tiles: Position[] = [];
  for (let y = base.minY; y <= base.maxY; y++) {
    for (let x = base.minX; x <= base.maxX; x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

/** The chip occupying a tile, if any. */
export function chipAt(state: BoardState, pos: Position): Chip | undefined {
  return state.chips.find((chip) => samePosition(chip.position, pos));
}

/**
 * Initial position of a player's chip. Chip numbers are 1..9; chip 5 is the power chip.
 * White starts on the diagonal y = x + 1; Black on y = x.
 */
export function startingPosition(player: PlayerId, chipNumber: number): Position {
  return player === 'white'
    ? { x: chipNumber - 1, y: chipNumber }
    : { x: chipNumber - 1, y: chipNumber - 1 };
}
