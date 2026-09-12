import { useCallback } from 'react';
import { Board } from '@/components/Board';
import { GameClocks } from '@/components/GameClocks';
import { GameControls } from '@/components/GameControls';
import { MoveHistoryPanel } from '@/components/MoveHistoryPanel';
import { chipAt, samePosition } from '@/engine';
import { useLocalGameStore } from '@/stores';
import type { Position } from '@/engine';

/**
 * Local pass-and-play game screen. Ignores WebSocket for now (multiplayer
 * is Phase 5); two players share one device.
 */
export function GamePage() {
  const {
    state,
    selectedChipId,
    legalMoves,
    result,
    pendingDrawOfferFrom,
    moveHistory,
    selectChip,
    moveSelected,
    deselect,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    reset,
  } = useLocalGameStore();

  const handleTileClick = useCallback(
    (pos: Position) => {
      if (result.status !== 'in-progress') return;
      const chip = chipAt(state, pos);

      if (selectedChipId && legalMoves.some((m) => samePosition(m, pos))) {
        moveSelected(pos);
        return;
      }
      if (chip) {
        if (chip.player === state.sideToMove) selectChip(chip.id);
        else deselect();
        return;
      }
      deselect();
    },
    [result, state, selectedChipId, legalMoves, selectChip, moveSelected, deselect]
  );

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-4 py-8">
      <h2 className="text-2xl font-bold">Local game</h2>
      <p className="max-w-md text-center text-sm text-slate-400">
        Pass-and-play. White (Player 1) moves first. Standard chips must slide as far as possible; the
        power chip (★) may stop anywhere along its line.
      </p>
      <GameClocks />
      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <Board state={state} selectedChipId={selectedChipId} legalMoves={legalMoves} onTileClick={handleTileClick} />
        </div>
        <div className="flex flex-col gap-4">
          <GameControls
            result={result}
            sideToMove={state.sideToMove}
            pendingDrawOfferFrom={pendingDrawOfferFrom}
            onResign={resign}
            onOfferDraw={offerDraw}
            onAcceptDraw={acceptDraw}
            onDeclineDraw={declineDraw}
            onReset={reset}
          />
          <div className="lg:flex-1">
            <MoveHistoryPanel history={moveHistory} />
          </div>
        </div>
      </div>
    </main>
  );
}
