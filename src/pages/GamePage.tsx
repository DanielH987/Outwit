import { useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Board } from '@/components/Board';
import { GameClocks } from '@/components/GameClocks';
import { GameControls } from '@/components/GameControls';
import { MoveHistoryPanel } from '@/components/MoveHistoryPanel';
import { chipAt, getLegalMoves, samePosition } from '@/engine';
import { useGameStore, useLocalGameStore } from '@/stores';
import { useWebSocketActions } from '@/hooks/useWebSocketActions';
import { useAuthStore } from '@/stores';
import type { Position } from '@/engine';

const LOCAL_ID = 'local';

/**
 * Local pass-and-play game screen, driven by the pure engine + localGameStore.
 * Ignores WebSocket entirely.
 */
function LocalGameView() {
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

/**
 * Online game screen. Server broadcasts authoritative state; clicks send
 * make-move / resign / offer-draw messages, and incoming game-state replaces
 * the local store. For now, clocks come from the server; local clocks are
 * unused until time-control is defined.
 */
function OnlineGameView({ roomId }: { roomId: string }) {
  const { gameState, selectedChipId, lastError } = useGameStore();
  const { joinRoom, leaveRoom, makeMove, resign: sendResign, offerDraw: sendOfferDraw } = useWebSocketActions();
  const { username } = useAuthStore();
  const clientId = useAuthStore((s) => s.userId) ?? 'anon';

  useEffect(() => {
    joinRoom(roomId);
    return () => leaveRoom(roomId);
  }, [roomId, joinRoom, leaveRoom]);

  const me = gameState?.players.find((p) => p.userId === clientId) ?? null;
  const mySide = me?.side ?? null;

  const selected = useMemo(() => {
    if (!gameState || !selectedChipId) return null;
    const chip = gameState.board.chips.find((c) => c.id === selectedChipId) ?? null;
    return chip ? { chip, legal: getLegalMoves(gameState.board as any, chip.id) } : null;
  }, [gameState, selectedChipId]);

  const handleTileClick = useCallback(
    (pos: Position) => {
      if (!gameState || gameState.result.status !== 'in-progress') return;
      if (!mySide || mySide !== gameState.board.sideToMove) return;
      const chip = chipAt(gameState.board as any, pos);
      if (selected && selected.legal.some((m: Position) => samePosition(m, pos))) {
        makeMove(roomId, { chipId: selected.chip.id, to: pos });
        useGameStore.getState().setSelectedChip(null);
        return;
      }
      if (chip) {
        if (chip.id.split('-')[0] === mySide) useGameStore.getState().setSelectedChip(chip.id);
        else useGameStore.getState().setSelectedChip(null);
        return;
      }
      useGameStore.getState().setSelectedChip(null);
    },
    [gameState, mySide, selected, makeMove, roomId]
  );

  if (!gameState) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        <p>Connecting to server...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-4 py-8">
      <h2 className="text-2xl font-bold">Room {roomId}</h2>
      <p className="text-sm text-slate-400">
        {mySide ? `You are ${mySide}. ` : ''}
        {username ? `Logged in as ${username}. ` : ''}
        {gameState.result.status === 'in-progress'
          ? `${gameState.board.sideToMove === 'white' ? 'White' : 'Black'} to move.`
          : 'Game over.'}
      </p>
      {lastError && (
        <p role="alert" className="rounded-lg bg-red-900/50 px-3 py-1 text-sm text-red-300">
          {lastError}
        </p>
      )}
      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <Board state={gameState.board as any} selectedChipId={selectedChipId} legalMoves={selected?.legal ?? []} onTileClick={handleTileClick} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface p-4 text-sm text-slate-200 shadow-lg">
            <p className="mb-2 font-semibold">Players</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {gameState.players.map((p) => (
                <li key={p.userId}>
                  {p.username ?? p.userId} — <span className="text-slate-500">{p.side}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-500 px-3 py-2 text-sm hover:border-red-400 hover:text-red-400"
                onClick={() => sendResign(roomId)}
              >
                Resign
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-500 px-3 py-2 text-sm hover:border-accent hover:text-accent"
                onClick={() => sendOfferDraw(roomId)}
              >
                Offer draw
              </button>
            </div>
          </div>
          <MoveHistoryPanel history={gameState.moveHistory} />
        </div>
      </div>
    </main>
  );
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId || gameId === LOCAL_ID) return <LocalGameView />;
  return <OnlineGameView roomId={gameId} />;
}
