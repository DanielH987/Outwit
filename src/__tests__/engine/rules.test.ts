import { describe, expect, it } from 'vitest';
import {
  applyMove,
  baseOwner,
  drawByAgreementResult,
  evaluateGameEnd,
  isWin,
  positionKey,
  resignationResult,
} from '../../engine/rules';
import { createInitialState } from '../../engine/setup';
import type { BoardState, Chip, PlayerId, Position } from '../../engine/types';

function makeState(chips: Chip[], sideToMove: PlayerId = 'white'): BoardState {
  return { chips, sideToMove };
}

function fillBase(player: PlayerId, except?: Position): Chip[] {
  const chips: Chip[] = [];
  const base = player === 'white' ? { minX: 6, maxX: 8, minY: 0, maxY: 2 } : { minX: 0, maxX: 2, minY: 7, maxY: 9 };
  let n = 1;
  for (let y = base.minY; y <= base.maxY; y++) {
    for (let x = base.minX; x <= base.maxX; x++) {
      if (except && except.x === x && except.y === y) continue;
      chips.push({ id: `${player}-${n}`, player, isPower: false, position: { x, y } });
      n++;
    }
  }
  return chips;
}

describe('applyMove', () => {
  it('moves the chip and passes the turn', () => {
    const state = createInitialState();
    const next = applyMove(state, { chipId: 'white-1', to: { x: 0, y: 6 } });
    expect(next.chips.find((c) => c.id === 'white-1')).toMatchObject({ position: { x: 0, y: 6 } });
    expect(next.sideToMove).toBe('black');
    // No mutation of the input state.
    expect(state.chips.find((c) => c.id === 'white-1')).toMatchObject({ position: { x: 0, y: 1 } });
    expect(state.sideToMove).toBe('white');
  });

  it('rejects moving on the wrong turn', () => {
    const state = createInitialState(); // white to move
    expect(() => applyMove(state, { chipId: 'black-9', to: { x: 8, y: 1 } })).toThrow('Not black\'s turn');
  });

  it('rejects illegal destinations', () => {
    const state = createInitialState();
    expect(() => applyMove(state, { chipId: 'white-1', to: { x: 0, y: 3 } })).toThrow('Illegal move');
    expect(() => applyMove(state, { chipId: 'white-1', to: { x: 0, y: 7 } })).toThrow('Illegal move'); // black base
  });

  it('rejects unknown chips', () => {
    const state = createInitialState();
    expect(() => applyMove(state, { chipId: 'white-99', to: { x: 0, y: 1 } })).toThrow('No chip');
  });
});

describe('isWin', () => {
  it('is false at the start', () => {
    expect(isWin(createInitialState(), 'white')).toBe(false);
    expect(isWin(createInitialState(), 'black')).toBe(false);
  });

  it('true when all 9 base tiles hold own chips', () => {
    expect(isWin(makeState([...fillBase('white'), ...fillBase('black')]), 'white')).toBe(true);
  });

  it('false when a base tile is missing or holds an enemy chip', () => {
    const chips = fillBase('white', { x: 6, y: 0 });
    expect(chips).toHaveLength(8);
    expect(isWin(makeState(chips), 'white')).toBe(false);

    const withIntruder = [...fillBase('white', { x: 6, y: 0 }), { id: 'black-1', player: 'black' as const, isPower: false, position: { x: 6, y: 0 } }];
    expect(isWin(makeState(withIntruder), 'white')).toBe(false);
  });
});

describe('positionKey', () => {
  it('is identical for identical states in any chip array order', () => {
    const chips: Chip[] = [
      { id: 'white-1', player: 'white', isPower: false, position: { x: 0, y: 1 } },
      { id: 'black-1', player: 'black', isPower: false, position: { x: 7, y: 7 } },
    ];
    expect(positionKey(makeState(chips))).toBe(positionKey(makeState([chips[1], chips[0]])));
  });

  it('changes with the side to move', () => {
    const chips: Chip[] = [{ id: 'white-1', player: 'white', isPower: false, position: { x: 3, y: 3 } }];
    expect(positionKey(makeState(chips, 'white'))).not.toBe(positionKey(makeState(chips, 'black')));
  });
});

describe('evaluateGameEnd', () => {
  it('declares a win when the mover fills their base', () => {
    // White base filled except (8,2); white-9 at (8,3) slides up and stops at (8,2)
    // (blocked by white chips at (8,1) and (8,0)). Now all 9 tiles are filled.
    const chips: Chip[] = [
      ...fillBase('white', { x: 8, y: 2 }),
      { id: 'white-9', player: 'white', isPower: false, position: { x: 8, y: 3 } },
      { id: 'black-1', player: 'black', isPower: false, position: { x: 0, y: 0 } },
    ];
    const state = makeState(chips, 'white');
    const next = applyMove(state, { chipId: 'white-9', to: { x: 8, y: 2 } });
    const result = evaluateGameEnd(next, 'white', []);
    expect(result).toEqual({ status: 'finished', winner: 'white', reason: 'base-filled' });
  });

  it('declares stalemate when the next player has no legal move', () => {
    // Box black in: black-1 at (4,4) surrounded; (a legal white move already made).
    const chips: Chip[] = [
      { id: 'white-1', player: 'white', isPower: false, position: { x: 4, y: 3 } },
      { id: 'white-2', player: 'white', isPower: false, position: { x: 4, y: 5 } },
      { id: 'white-3', player: 'white', isPower: false, position: { x: 3, y: 4 } },
      { id: 'white-4', player: 'white', isPower: false, position: { x: 5, y: 4 } },
      { id: 'black-1', player: 'black', isPower: false, position: { x: 4, y: 4 } },
    ];
    const state = makeState(chips, 'black');
    const result = evaluateGameEnd(state, 'white', []);
    expect(result).toEqual({ status: 'finished', winner: null, reason: 'stalemate' });
  });

  it('declares a draw on threefold repetition', () => {
    const state = createInitialState();
    const key = positionKey(state);
    const result = evaluateGameEnd(state, 'black', [key, key]); // occurred twice before + now = 3
    expect(result).toEqual({ status: 'finished', winner: null, reason: 'repetition' });
  });

  it('does not declare repetition on the second occurrence', () => {
    const state = createInitialState();
    const result = evaluateGameEnd(state, 'black', [positionKey(state)]);
    expect(result.status).toBe('in-progress');
  });

  it('prefers win over stalemate/repetition', () => {
    const chips = [...fillBase('white'), ...fillBase('black')];
    const state = makeState(chips, 'white');
    // black's base is full but black just moved — win should win if white filled... here black filled their base.
    const result = evaluateGameEnd(state, 'black', []);
    expect(result.reason).toBe('base-filled');
  });
});

describe('match-level results', () => {
  it('resignation wins for the opponent', () => {
    expect(resignationResult('white')).toEqual({ status: 'finished', winner: 'black', reason: 'resignation' });
  });

  it('draw by agreement has no winner', () => {
    expect(drawByAgreementResult()).toEqual({ status: 'finished', winner: null, reason: 'agreement' });
  });

  it('baseOwner marks tiles', () => {
    expect(baseOwner({ x: 8, y: 2 })).toBe('white');
    expect(baseOwner({ x: 0, y: 9 })).toBe('black');
    expect(baseOwner({ x: 4, y: 4 })).toBeNull();
  });
});
