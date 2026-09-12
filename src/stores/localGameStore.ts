// Zustand store for a local pass-and-play game, driven by the pure engine
// in src/engine/. Keeps board state, selection, legal destinations, move
// history, and match-level actions (resign, draw). See docs/RULES.md.

import { create } from 'zustand';
import {
  applyMove,
  createInitialState,
  drawByAgreementResult,
  evaluateGameEnd,
  getLegalMoves,
  positionKey,
  resignationResult,
} from '@/engine';
import type { BoardState, GameResult, MoveRequest, PlayerId, Position } from '@/engine';

interface LocalGameState {
  state: BoardState;
  selectedChipId: string | null;
  legalMoves: Position[];
  positionHistory: string[];
  result: GameResult;
  pendingDrawOfferFrom: PlayerId | null;
  moveCount: number;

  /** Select a chip of the side to move; clicking a legal destination moves there. */
  selectChip: (chipId: string) => void;
  /** Attempt a move to a destination for the currently selected chip. */
  moveSelected: (to: Position) => boolean;
  deselect: () => void;
  resign: (player: PlayerId) => void;
  offerDraw: (player: PlayerId) => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  reset: () => void;
}

export const useLocalGameStore = create<LocalGameState>((set, get) => ({
  state: createInitialState(),
  selectedChipId: null,
  legalMoves: [],
  positionHistory: [],
  result: { status: 'in-progress', winner: null, reason: null },
  pendingDrawOfferFrom: null,
  moveCount: 0,

  selectChip: (chipId) => {
    const { state, result } = get();
    if (result.status !== 'in-progress') return;
    const chip = state.chips.find((c) => c.id === chipId);
    if (!chip || chip.player !== state.sideToMove) return;
    set({ selectedChipId: chipId, legalMoves: getLegalMoves(state, chipId) });
  },

  moveSelected: (to) => {
    const { state, selectedChipId, positionHistory, moveCount } = get();
    if (!selectedChipId) return false;
    const move: MoveRequest = { chipId: selectedChipId, to };
    let next: BoardState;
    try {
      next = applyMove(state, move);
    } catch {
      return false;
    }
    const mover = state.sideToMove;
    const result = evaluateGameEnd(next, mover, positionHistory);
    set({
      state: next,
      selectedChipId: null,
      legalMoves: [],
      positionHistory: [...positionHistory, positionKey(state)],
      result,
      moveCount: moveCount + 1,
    });
    return true;
  },

  deselect: () => set({ selectedChipId: null, legalMoves: [] }),

  resign: (player) =>
    set({ result: resignationResult(player), selectedChipId: null, legalMoves: [] }),

  offerDraw: (player) => {
    const { result } = get();
    if (result.status !== 'in-progress') return;
    set({ pendingDrawOfferFrom: player });
  },

  acceptDraw: () => {
    const { pendingDrawOfferFrom, result } = get();
    if (pendingDrawOfferFrom === null || result.status !== 'in-progress') return;
    set({ result: drawByAgreementResult(), pendingDrawOfferFrom: null });
  },

  declineDraw: () => set({ pendingDrawOfferFrom: null }),

  reset: () =>
    set({
      state: createInitialState(),
      selectedChipId: null,
      legalMoves: [],
      positionHistory: [],
      result: { status: 'in-progress', winner: null, reason: null },
      pendingDrawOfferFrom: null,
      moveCount: 0,
    }),
}));
