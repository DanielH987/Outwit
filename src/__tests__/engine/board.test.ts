import { describe, expect, it } from 'vitest';
import {
  BASE_RANGES,
  baseTiles,
  chipAt,
  isInBase,
  isInBounds,
  isInEnemyBase,
  opponentOf,
  samePosition,
  startingPosition,
} from '../../engine/board';
import { createInitialState } from '../../engine/setup';

describe('board geometry', () => {
  it('is a 9x10 grid with origin at the top-left', () => {
    expect(isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(isInBounds({ x: 8, y: 9 })).toBe(true);
    expect(isInBounds({ x: 9, y: 0 })).toBe(false);
    expect(isInBounds({ x: 0, y: 10 })).toBe(false);
    expect(isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(isInBounds({ x: 0, y: -1 })).toBe(false);
  });

  it('white base is the top-right 3x3, black base is the bottom-left 3x3', () => {
    expect(BASE_RANGES.white).toEqual({ minX: 6, maxX: 8, minY: 0, maxY: 2 });
    expect(BASE_RANGES.black).toEqual({ minX: 0, maxX: 2, minY: 7, maxY: 9 });
    expect(baseTiles('white')).toHaveLength(9);
    expect(baseTiles('black')).toHaveLength(9);
    expect(isInBase({ x: 8, y: 2 }, 'white')).toBe(true);
    expect(isInBase({ x: 5, y: 2 }, 'white')).toBe(false);
    expect(isInBase({ x: 2, y: 7 }, 'black')).toBe(true);
    expect(isInEnemyBase({ x: 0, y: 9 }, 'white')).toBe(true);
    expect(isInEnemyBase({ x: 0, y: 9 }, 'black')).toBe(false);
  });

  it('opponentOf swaps players', () => {
    expect(opponentOf('white')).toBe('black');
    expect(opponentOf('black')).toBe('white');
  });

  it('place chips on the two diagonals per docs/RULES.md §4', () => {
    // White: y = x + 1 → chip n at (n-1, n)
    expect(startingPosition('white', 1)).toEqual({ x: 0, y: 1 });
    expect(startingPosition('white', 5)).toEqual({ x: 4, y: 5 });
    expect(startingPosition('white', 9)).toEqual({ x: 8, y: 9 });
    // Black: y = x → chip n at (n-1, n-1)
    expect(startingPosition('black', 1)).toEqual({ x: 0, y: 0 });
    expect(startingPosition('black', 5)).toEqual({ x: 4, y: 4 });
    expect(startingPosition('black', 9)).toEqual({ x: 8, y: 8 });
  });
});

describe('setup', () => {
  it('creates 18 chips: 8 standard + 1 power per player, white to move', () => {
    const state = createInitialState();
    expect(state.sideToMove).toBe('white');
    expect(state.chips).toHaveLength(18);
    for (const player of ['white', 'black'] as const) {
      const chips = state.chips.filter((c) => c.player === player);
      expect(chips).toHaveLength(9);
      expect(chips.filter((c) => c.isPower)).toHaveLength(1);
      expect(chips.find((c) => c.isPower)?.id).toBe(`${player}-5`);
    }
  });

  it('matches the reference diagram from docs/RULES.md', () => {
    const state = createInitialState();
    expect(chipAt(state, { x: 0, y: 0 })?.id).toBe('black-1');
    expect(chipAt(state, { x: 0, y: 1 })?.id).toBe('white-1');
    expect(chipAt(state, { x: 4, y: 4 })?.id).toBe('black-5');
    expect(chipAt(state, { x: 4, y: 5 })?.id).toBe('white-5');
    expect(chipAt(state, { x: 8, y: 8 })?.id).toBe('black-9');
    expect(chipAt(state, { x: 8, y: 9 })?.id).toBe('white-9');
    expect(samePosition({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(samePosition({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});
