// Replay engine: reconstructing historical board positions from move history.
import { describe, expect, it } from 'vitest';
import { applyMove, boardAtMove, createInitialState } from '../../engine';

/** Play a legal sequence, returning the move list and the states it produced. */
function playMoves() {
  let state = createInitialState();
  const states = [state];
  const moves = [
    { chipId: 'white-1', to: { x: 0, y: 6 } },
    { chipId: 'black-9', to: { x: 8, y: 3 } },
    { chipId: 'white-2', to: { x: 1, y: 6 } },
  ].map((m) => {
    const chip = state.chips.find((c) => c.id === m.chipId)!;
    const from = { ...chip.position };
    state = applyMove(state, m);
    states.push(state);
    return { chipId: m.chipId, from, to: { ...m.to } };
  });
  return { moves, states };
}

const pos = (state: ReturnType<typeof createInitialState>, id: string) =>
  state.chips.find((c) => c.id === id)!.position;

describe('boardAtMove', () => {
  it('returns the initial position for -1', () => {
    const { moves } = playMoves();
    const initial = boardAtMove(moves, -1);
    expect(pos(initial, 'white-1')).toEqual({ x: 0, y: 1 });
    expect(pos(initial, 'black-9')).toEqual({ x: 8, y: 8 });
    expect(initial.sideToMove).toBe('white');
  });

  it('returns the position after each move', () => {
    const { moves, states } = playMoves();

    const after1 = boardAtMove(moves, 0);
    expect(pos(after1, 'white-1')).toEqual({ x: 0, y: 6 });
    expect(after1.sideToMove).toBe('black');
    expect(after1).toEqual(states[1]);

    const after2 = boardAtMove(moves, 1);
    expect(pos(after2, 'black-9')).toEqual({ x: 8, y: 3 });
    expect(after2.sideToMove).toBe('white');
    expect(after2).toEqual(states[2]);

    const after3 = boardAtMove(moves, 2);
    expect(pos(after3, 'white-2')).toEqual({ x: 1, y: 6 });
    expect(after3).toEqual(states[3]);
  });

  it('clamps out-of-range indices', () => {
    const { moves, states } = playMoves();
    expect(boardAtMove(moves, 999)).toEqual(states[states.length - 1]);
    expect(boardAtMove(moves, -5)).toEqual(states[0]);
  });

  it('handles an empty history', () => {
    expect(boardAtMove([], 0)).toEqual(createInitialState());
    expect(boardAtMove([], -1)).toEqual(createInitialState());
  });

  it('does not mutate the array or the original state', () => {
    const { moves } = playMoves();
    const snapshot = JSON.parse(JSON.stringify(moves));
    boardAtMove(moves, 1);
    expect(moves).toEqual(snapshot);
  });

  it('degrades gracefully on malformed history instead of throwing', () => {
    const bad = [{ chipId: 'nope', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }];
    expect(() => boardAtMove(bad, 0)).not.toThrow();
    // Illegal entries are skipped, leaving the initial position.
    expect(pos(boardAtMove(bad, 0), 'white-1')).toEqual({ x: 0, y: 1 });
  });
});
