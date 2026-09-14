import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Board } from '@/components/Board';
import { ChatPanel } from '@/components/ChatPanel';
import { GameClocks } from '@/components/GameClocks';
import { GameControls } from '@/components/GameControls';
import { MoveHistoryPanel } from '@/components/MoveHistoryPanel';
import { chipAt, getLegalMoves, samePosition } from '@/engine';
import { useGameStore, useLocalGameStore } from '@/stores';
import type { MoveRecord } from '@/stores/localGameStore';
import { useWebSocketActions } from '@/hooks/useWebSocketActions';
import { useAuthStore } from '@/stores';
import type { Position } from '@/engine';

const LOCAL_ID = 'local';

/**
 * Latest-move highlight shown on the board: defaults to the most recent move,
 * while hovering history entries temporarily previews their squares.
 */
function useBoardHighlight(moveHistory: MoveRecord[]) {
  const [hovered, setHovered] = useState<MoveRecord | null>(null);
  const latest = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;
  return { highlight: hovered ?? latest, onHighlight: setHovered };
}

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

  const { highlight: lastMove, onHighlight } = useBoardHighlight(moveHistory);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-4 py-8">
      <h2 className="text-2xl font-bold">Local game</h2>
      <p className="max-w-md text-center text-sm text-taupe">
        Pass-and-play. White (Player 1) moves first. Standard chips must slide as far as possible; the
        power chip (★) may stop anywhere along its line.
      </p>
      <GameClocks />
      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <Board
            state={state}
            selectedChipId={selectedChipId}
            legalMoves={legalMoves}
            onTileClick={handleTileClick}
            lastMove={lastMove}
          />
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
            <MoveHistoryPanel history={moveHistory} onHighlight={onHighlight} highlightedMove={lastMove} />
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
  const { joinRoom, leaveRoom, makeMove, sendChat, resign: sendResign, offerDraw: sendOfferDraw, respondDraw } = useWebSocketActions();
  const { username, userId } = useAuthStore();

  useEffect(() => {
    joinRoom(roomId);
    return () => leaveRoom(roomId);
  }, [roomId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!gameState) useGameStore.setState({ selectedChipId: null, lastError: null });
  }, [gameState]);

  // "Me" is the seat whose userId matches our stable client identity. The
  // server-assigned connectionId changes on every reconnect and must not be
  // used for seat matching.
  const me = gameState?.players.find((p) => p.userId === userId) ?? null;
  const mySide = me?.side ?? null;
  const pendingDrawFrom = gameState?.pendingDrawFrom ?? null;
  const pendingFromMe = pendingDrawFrom !== null && pendingDrawFrom === mySide;
  const pendingFromOpponent = pendingDrawFrom !== null && !pendingFromMe;

  const boardState = useMemo(
    () => (gameState ? { chips: gameState.board.chips, sideToMove: gameState.board.sideToMove } satisfies import('@/engine').BoardState : null),
    [gameState]
  );

  const selected = useMemo(() => {
    if (!boardState || !selectedChipId) return null;
    const chip = boardState.chips.find((c) => c.id === selectedChipId) ?? null;
    return chip ? { chip, legal: getLegalMoves(boardState, chip.id) } : null;
  }, [boardState, selectedChipId]);

  const handleTileClick = useCallback(
    (pos: Position) => {
      if (!gameState || gameState.result.status !== 'in-progress') return;
      if (!mySide || mySide !== gameState.board.sideToMove) return;
      const chip = chipAt(boardState!, pos);
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
    [boardState, gameState, mySide, selected, makeMove, roomId]
  );

  const { highlight: lastMove, onHighlight } = useBoardHighlight(gameState?.moveHistory ?? []);

  if (!gameState) {
    return (
      <main className="flex min-h-screen items-center justify-center text-taupe">
        <p>Connecting to server...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 px-4 py-8">
      <h2 className="text-2xl font-bold">Room {roomId}</h2>
      <p className="text-sm text-taupe">
        {mySide ? `You are ${mySide}. ` : ''}
        {username ? `Logged in as ${username}. ` : ''}
        {gameState.result.status === 'in-progress'
          ? `${gameState.board.sideToMove === 'white' ? 'White' : 'Black'} to move.`
          : 'Game over.'}
      </p>
      {lastError && (
        <p role="alert" className="rounded-lg bg-danger/25 px-3 py-1 text-sm text-danger">
          {lastError}
        </p>
      )}
      <div className="grid w-full max-w-4xl gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <Board
            state={boardState!}
            selectedChipId={selectedChipId}
            legalMoves={selected?.legal ?? []}
            onTileClick={handleTileClick}
            lastMove={lastMove}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-surface p-4 text-sm text-parchment shadow-lg shadow-black/30">
            <p className="mb-2 font-semibold">Players</p>
            <ul className="space-y-1 text-sm text-parchment/90">
              {gameState.players.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  <span
                    className={['inline-block h-2 w-2 rounded-full', p.connected ? 'bg-success' : 'bg-wood-edge'].join(' ')}
                    aria-label={p.connected ? 'connected' : 'disconnected'}
                  />
                  {p.username ?? p.userId} — <span className="text-taupe">{p.side}</span>
                  {p.userId === userId && <span className="text-accent">(you)</span>}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-danger hover:text-danger"
                onClick={() => sendResign(roomId)}
              >
                Resign
              </button>
              {pendingFromOpponent && mySide ? (
                <>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-primary transition hover:bg-accent-hover"
                    onClick={() => respondDraw(roomId, true)}
                  >
                    Accept draw
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-danger hover:text-danger"
                    onClick={() => respondDraw(roomId, false)}
                  >
                    Decline
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-accent hover:text-accent disabled:opacity-50"
                  disabled={pendingFromMe}
                  onClick={() => sendOfferDraw(roomId)}
                >
                  Offer draw
                </button>
              )}
            </div>
          </div>
          <MoveHistoryPanel history={gameState.moveHistory} onHighlight={onHighlight} highlightedMove={lastMove} />
          <ChatPanel roomId={roomId} sendChat={sendChat} mySide={mySide} />
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
