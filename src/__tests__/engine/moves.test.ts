import { describe, expect, it } from 'vitest';
import { getLegalMoves, hasAnyLegalMove } from '../../engine/moves';
import { createInitialState } from '../../engine/setup';
import type { BoardState, Chip, Position } from '../../engine/types';

function makeState(chips: Chip[], sideToMove: 'white' | 'black' = 'white'): BoardState {
  return { chips, sideToMove };
}

function std(id: string, player: 'white' | 'black', position: Position): Chip {
  return { id, player, isPower: false, position };
}

function key(state: BoardState, chipId: string): string[] {
  return getLegalMoves(state, chipId).map((p) => `${p.x},${p.y}`).sort();
}

describe('getLegalMoves — opening position', () => {
  const state = createInitialState();

  it('white chip 1 at (0,1): up blocked, right blocked, slides down to (0,6)', () => {
    // Up: (0,0) occupied by black-1. Right: (1,1) occupied by black-2.
    // Down: (0,2)...(0,6) clear; (0,7) is the black base perimeter.
    expect(key(state, 'white-1')).toEqual(['0,6']);
  });

  it('white chip 2 at (1,2): must slide to the farthest clear tile', () => {
    // Down: farthest is (1,6) — (1,7) is black base. Left: farthest is (0,2).
    // Up blocked by black-2 at (1,1), right blocked by black-3 at (2,2).
    expect(key(state, 'white-2')).toEqual(['0,2', '1,6']);
  });

  it('white chip 4 at (3,4): long slides to the edges', () => {
    // Right blocked by black-5 at (4,4), up blocked by black-4 at (3,3).
    expect(key(state, 'white-4')).toEqual(['0,4', '3,9']);
  });

  it('white power chip (white-5) at (4,5): 13 destinations, may stop anywhere', () => {
    // Down: (4,6)(4,7)(4,8)(4,9). Left: (3,5)(2,5)(1,5)(0,5).
    // Diagonal up-right: (5,4)(6,3)(7,2)(8,1) — (7,2) and (8,1) are white's own base.
    // Diagonal down-left: (3,6) only — (2,7) is the black base.
    // Up blocked by black-5, right blocked by black-6, down-right by white-6, up-left by white-4.
    expect(key(state, 'white-5')).toEqual([
      '0,5', '1,5', '2,5', '3,5', '3,6', '4,6', '4,7', '4,8', '4,9', '5,4', '6,3', '7,2', '8,1',
    ]);
  });

  it('white chip 7 at (6,7): blocked by both diagonals', () => {
    // Up blocked by black-7 at (6,6), right by black-8 at (7,7).
    // Down: (6,9). Left: farthest (3,7) — (2,7) is the black base.
    expect(key(state, 'white-7')).toEqual(['3,7', '6,9']);
  });

  it('the white-5 path into its own base locks the destination', () => {
    // (8,1) and (7,2) are white base tiles — landing there is legal and locks in.
    const moves = getLegalMoves(state, 'white-5');
    expect(moves).toContainEqual({ x: 8, y: 1 });
  });

  it('black-9 at (8,8): only one legal move, and the enemy base stops the ray', () => {
    // Up: (8,7)...(8,3) clear; (8,2) is in the white base (6≤x≤8, 0≤y≤2) → enemy base blocks.
    // Left: (7,8) occupied by white-8. Down: (8,9) occupied by white-9. Right: off-board.
    expect(key(state, 'black-9')).toEqual(['8,3']);
  });
});

describe('getLegalMoves — custom positions', () => {
  it('standard chip must slide as far as possible (cannot stop early)', () => {
    const state = makeState([std('white-1', 'white', { x: 4, y: 4 })]);
    // Down ray is clear to the edge: only (4,9) is legal, not intermediate tiles.
    expect(key(state, 'white-1')).toEqual(['0,4', '4,0', '4,9', '8,4']);
  });

  it('a chip boxed in by four neighbors has no legal moves', () => {
    const state = makeState([
      std('white-1', 'white', { x: 4, y: 4 }),
      std('black-1', 'black', { x: 4, y: 3 }),
      std('black-2', 'black', { x: 4, y: 5 }),
      std('black-3', 'black', { x: 3, y: 4 }),
      std('black-4', 'black', { x: 5, y: 4 }),
    ]);
    expect(getLegalMoves(state, 'white-1')).toEqual([]);
    expect(hasAnyLegalMove(state, 'white')).toBe(false);
  });

  it('standard chip sliding into its own base stops at the last clear tile inside', () => {
    const state = makeState([std('white-1', 'white', { x: 4, y: 1 })]);
    // Right ray: (5,1) then (6,1),(7,1),(8,1) in base, boundary (9,1) off-board.
    expect(key(state, 'white-1')).toEqual(['0,1', '4,0', '4,9', '8,1']);
  });

  it('base boundary blocks a locked-in chip from leaving', () => {
    const state = makeState([std('white-1', 'white', { x: 7, y: 1 })]);
    // Right: (8,1). Up: (7,0). Down: (7,2) — (7,3) would exit. Left: (6,1) is still base.
    expect(key(state, 'white-1')).toEqual(['6,1', '7,0', '7,2', '8,1']);
  });

  it('locked-in power chip can stop mid-slide inside the base', () => {
    const state = makeState([{ id: 'white-5', player: 'white', isPower: true, position: { x: 6, y: 0 } }]);
    // Right: (7,0),(8,0). Down: (6,1),(6,2) — (6,3) would exit. Down-right: (7,1),(8,2).
    // Left (5,0) would exit base → blocked. All up rays are off-board.
    expect(key(state, 'white-5')).toEqual(['6,1', '6,2', '7,0', '7,1', '8,0', '8,2']);
  });

  it('unlocked chip cannot exit its own base mid-slide (ray capping)', () => {
    // White power chip at (7,3), moving up-left: (6,2) is base, (5,1) would exit.
    // Only (6,2) is legal on that diagonal; stopping before entry is impossible (adjacent).
    const state = makeState([{ id: 'white-5', player: 'white', isPower: true, position: { x: 7, y: 3 } }]);
    const moves = getLegalMoves(state, 'white-5');
    expect(moves).toContainEqual({ x: 6, y: 2 });
    expect(moves).not.toContainEqual({ x: 5, y: 1 });
  });

  it('ray capping does not affect standard chips (orthogonal only)', () => {
    // Standard chip at (5,1): right ray enters base at (6,1) and must continue;
    // it cannot "exit" — the slide continues inside to the boundary at x=9.
    const state = makeState([std('white-1', 'white', { x: 5, y: 1 })]);
    expect(key(state, 'white-1')).toEqual(['0,1', '5,0', '5,9', '8,1']);
  });

  it('enemy base perimeter is a hard wall both ways', () => {
    const state = makeState([std('black-1', 'black', { x: 5, y: 0 })]);
    // Down to (5,9); right: (6,0)(7,0)(8,0) are white's base — blocked at once.
    expect(key(state, 'black-1')).toEqual(['0,0', '5,9']);
  });
});
