// Zustand store for a local pass-and-play game, driven by the pure engine
// in src/engine/. Keeps board state, selection, legal destinations, move
// history (for replay + threefold repetition), clocks, and match-level
// actions (resign, draw). See docs/RULES.md.
//
// Clocks are untimed "elapsed" timers: they count up from zero per player.
// There is no lose-on-time rule (docs/RULES.md has no time control yet);
// clocks are for information only (chess.com-style "time used").

import { create } from 'zustand';
import {
  applyMove,
  createInitialState,
  drawByAgreementResult,
  evaluateGameEnd,
  formatMove,
  getLegalMoves,
  positionKey,
  resignationResult,
} from '@/engine';
import type { BoardState, GameResult, MoveRequest, PlayerId, Position } from '@/engine';
import { useStatsStore } from '@/stores/statsStore';

/** Records a finished game in local stats once per finished game. */
function recordFinishedGame(result: GameResult, elapsedSeconds: Record<PlayerId, number>, moveHistory: MoveRecord[]) {
  if (result.status !== 'finished' || result.reason === null) return;
  useStatsStore.getState().addMatch({
    finishedAt: new Date().toISOString(),
    winner: result.winner,
    reason: result.reason,
    moveCount: moveHistory.length,
    whiteSeconds: elapsedSeconds.white,
    blackSeconds: elapsedSeconds.black,
  });
}

export interface MoveRecord {
  /** 1-based, full-move number (increments after Black's move, chess-style). */
  number: number;
  player: PlayerId;
  chipId: string;
  from: Position;
  to: Position;
  notation: string;
}

interface LocalGameState {
  state: BoardState;
  selectedChipId: string | null;
  legalMoves: Position[];
  positionHistory: string[];
  result: GameResult;
  pendingDrawOfferFrom: PlayerId | null;
  moveHistory: MoveRecord[];
  /** Elapsed seconds per player. Untimed, informational only. */
  elapsedSeconds: Record<PlayerId, number>;
  /** Unix ms of the last clock tick; used to accumulate per-player time. */
  clockStartedAt: number | null;

  /** Select a chip of the side to move; clicking a legal destination moves there. */
  selectChip: (chipId: string) => void;
  /** Attempt a move to a destination for the currently selected chip. */
  moveSelected: (to: Position) => boolean;
  deselect: () => void;
  resign: (player: PlayerId) => void;
  offerDraw: (player: PlayerId) => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  /** Called on each timer tick while the game is in progress. */
  tick: (nowMs: number) => void;
  reset: () => void;
}

function freshGame(): Pick<
  LocalGameState,
  'state' | 'selectedChipId' | 'legalMoves' | 'positionHistory' | 'result' | 'pendingDrawOfferFrom' | 'moveHistory' | 'elapsedSeconds' | 'clockStartedAt'
> {
  return {
    state: createInitialState(),
    selectedChipId: null,
    legalMoves: [],
    positionHistory: [],
    result: { status: 'in-progress', winner: null, reason: null },
    pendingDrawOfferFrom: null,
    moveHistory: [],
    elapsedSeconds: { white: 0, black: 0 },
    clockStartedAt: Date.now(),
  };
}

export const useLocalGameStore = create<LocalGameState>((set, get) => ({
  ...freshGame(),

  selectChip: (chipId) => {
    const { state, result } = get();
    if (result.status !== 'in-progress') return;
    const chip = state.chips.find((c) => c.id === chipId);
    if (!chip || chip.player !== state.sideToMove) return;
    set({ selectedChipId: chipId, legalMoves: getLegalMoves(state, chipId) });
  },

  moveSelected: (to) => {
    const { state, selectedChipId, positionHistory, moveHistory } = get();
    if (!selectedChipId) return false;
    const chip = state.chips.find((c) => c.id === selectedChipId);
    if (!chip) return false;

    const move: MoveRequest = { chipId: selectedChipId, to };
    let next: BoardState;
    try {
      next = applyMove(state, move);
    } catch {
      return false;
    }
    const mover = state.sideToMove;
    const result = evaluateGameEnd(next, mover, positionHistory);

    // Chess-style full-move numbers: White and Black of the same turn share a number.
    const number = Math.floor(moveHistory.length / 2) + 1;
    const record: MoveRecord = {
      number,
      player: mover,
      chipId: selectedChipId,
      from: { ...chip.position },
      to: { ...to },
      notation: formatMove(selectedChipId, chip.position, to),
    };

    const finalMoveHistory = [...moveHistory, record];
    if (result.status === 'finished') {
      recordFinishedGame(result, get().elapsedSeconds, finalMoveHistory);
    }

    set({
      state: next,
      selectedChipId: null,
      legalMoves: [],
      positionHistory: [...positionHistory, positionKey(state)],
      result,
      moveHistory: finalMoveHistory,
      // Freeze clocks when the game ends.
      clockStartedAt: result.status === 'finished' ? null : get().clockStartedAt,
    });
    return true;
  },

  deselect: () => set({ selectedChipId: null, legalMoves: [] }),

  resign: (player) => {
    const result = resignationResult(player);
    recordFinishedGame(result, get().elapsedSeconds, get().moveHistory);
    set({
      result,
      selectedChipId: null,
      legalMoves: [],
      clockStartedAt: null,
    });
  },

  offerDraw: (player) => {
    const { result } = get();
    if (result.status !== 'in-progress') return;
    set({ pendingDrawOfferFrom: player });
  },

  acceptDraw: () => {
    const { pendingDrawOfferFrom, result } = get();
    if (pendingDrawOfferFrom === null || result.status !== 'in-progress') return;
    const next = drawByAgreementResult();
    recordFinishedGame(next, get().elapsedSeconds, get().moveHistory);
    set({ result: next, pendingDrawOfferFrom: null, clockStartedAt: null });
  },

  declineDraw: () => set({ pendingDrawOfferFrom: null }),

  tick: (nowMs) => {
    const { result, clockStartedAt, elapsedSeconds, state } = get();
    if (result.status === 'finished' || clockStartedAt === null) return;
    const delta = Math.max(0, Math.floor((nowMs - clockStartedAt) / 1000));
    if (delta === 0) return;
    set({
      elapsedSeconds: {
        ...elapsedSeconds,
        [state.sideToMove]: elapsedSeconds[state.sideToMove] + delta,
      },
      clockStartedAt: nowMs - ((nowMs - clockStartedAt) % 1000),
    });
  },

  reset: () => set(freshGame()),
}));
