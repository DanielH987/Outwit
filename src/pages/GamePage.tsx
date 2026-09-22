import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Board } from '@/components/Board';
import { ChatPanel } from '@/components/ChatPanel';
import { CountryFlag } from '@/components/CountryFlag';
import { FaceOffOverlay } from '@/components/FaceOffOverlay';
import { LeaveConfirmDialog, usePendingLeave } from '@/components/LeaveConfirmDialog';
import { ForfeitCountdownBanner } from '@/components/ForfeitCountdownBanner';
import { GameClocks } from '@/components/GameClocks';
import { GameControls } from '@/components/GameControls';
import { GameOverDialog } from '@/components/GameOverDialog';
import { MoveHistoryPanel } from '@/components/MoveHistoryPanel';
import { ReplayControls } from '@/components/ReplayControls';
import { ServerUnavailable, UNAVAILABLE_AFTER_FAILURES } from '@/components/ServerUnavailable';
import { WaitingForOpponent } from '@/components/WaitingForOpponent';
import { boardAtMove, chipAt, getLegalMoves, samePosition } from '@/engine';
import { useGameStore, useLocalGameStore } from '@/stores';
import type { MoveRecord } from '@/stores/localGameStore';
import { useWebSocketActions } from '@/hooks/useWebSocketActions';
import { useWebSocket } from '@/contexts/WebSocketProvider';
import { useAuthStore } from '@/stores';
import { useGameLeaveWarning } from '@/hooks/useGameLeaveWarning';
import { useReplay } from '@/hooks/useReplay';
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

  const { highlight: hoveredMove, onHighlight } = useBoardHighlight(moveHistory);
  const replay = useReplay(moveHistory);
  const localLeave = usePendingLeave();
  useGameLeaveWarning(result.status === 'in-progress' && !replay.isReplaying);

  // While reviewing, the board shows a reconstructed past position and input is
  // disabled — nothing about the real game changes.
  const viewedState = useMemo(
    () => (replay.isReplaying ? boardAtMove(moveHistory, replay.index!) : state),
    [replay.isReplaying, replay.index, moveHistory, state]
  );
  const viewedMove = replay.isReplaying
    ? replay.index! >= 0
      ? moveHistory[replay.index!]
      : null
    : hoveredMove;

  const handleTileClick = useCallback(
    (pos: Position) => {
      if (replay.isReplaying) return; // reviewing history; ignore board clicks
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
    [replay.isReplaying, result, state, selectedChipId, legalMoves, selectChip, moveSelected, deselect]
  );

  // Show the end dialog once per finished game, until dismissed. Resetting the
  // game (or starting another) re-arms it for the next finish.
  const [dismissedResultKey, setDismissedResultKey] = useState<string | null>(null);
  const resultKey =
    result.status === 'finished'
      ? `${result.reason}:${result.winner ?? 'draw'}:${moveHistory.length}`
      : null;
  const showGameOver = resultKey !== null && resultKey !== dismissedResultKey;

  return (
    <main className="flex flex-1 flex-col lg:h-dvh lg:flex-row lg:items-stretch lg:overflow-hidden">
      {showGameOver && !replay.isReplaying && (
        <GameOverDialog
          result={result}
          primaryLabel="Play again"
          onPrimary={reset}
          onDismiss={() => setDismissedResultKey(resultKey)}
        />
      )}
      {localLeave.pending && (
        <LeaveConfirmDialog
          warning={localLeave.pending.warning}
          onConfirm={localLeave.confirmLeave}
          onCancel={localLeave.cancelLeave}
        />
      )}
      {/* Board column. Desktop: board sized from viewport height (9:10 → ×0.9)
          with a hair of margin, so it nearly touches top and bottom. */}
      <div className="flex flex-1 items-start justify-center px-0 py-2 lg:items-center lg:px-3">
        <div className="w-full max-w-[min(100%,calc((100dvh-15rem)*0.9))] lg:max-w-[min(100%,calc((100dvh-1.5rem)*0.9))]">
          <Board
            state={viewedState}
            selectedChipId={replay.isReplaying ? null : selectedChipId}
            legalMoves={replay.isReplaying ? [] : legalMoves}
            onTileClick={handleTileClick}
            lastMove={viewedMove}
          />
        </div>
      </div>

      {/* Info column: clocks, actions, history. On desktop it's a fixed-width
          right panel that scrolls internally; on phones it stacks under the
          board like chess.com mobile. */}
      <aside className="flex w-full flex-col gap-3 px-4 pb-4 sm:px-6 lg:h-full lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-wood-edge/60 lg:px-4 lg:py-4 xl:w-96">
        <div className="flex items-center justify-between gap-3">
          <LeaveAwareLink
            to="/lobby"
            inProgress={result.status === 'in-progress' && !replay.isReplaying}
            requestLeave={localLeave.requestLeave}
            className="text-sm font-semibold text-taupe transition hover:text-accent"
          >
            ← Lobby
          </LeaveAwareLink>
          <h2 className="text-lg font-bold">Local game</h2>
        </div>
        <p className="hidden text-sm text-taupe lg:block">
          Pass-and-play. Standard chips slide as far as possible; the power chip (★) may stop anywhere.
        </p>
        {!replay.isReplaying && <GameClocks />}
        {replay.isReplaying ? (
          <ReplayControls
            current={replay.index!}
            total={moveHistory.length}
            onChange={replay.goTo}
            onExit={replay.exit}
          />
        ) : (
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
        )}
        <MoveHistoryPanel
          history={moveHistory}
          onHighlight={onHighlight}
          highlightedMove={viewedMove}
          currentMoveIndex={replay.isReplaying ? replay.index : null}
          onSelectMove={replay.goTo}
        />
      </aside>
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
  const { connection, retry } = useWebSocket();
  const { userId } = useAuthStore();
  const [dismissedResultKey, setDismissedResultKey] = useState<string | null>(null);
  const [showFaceOff, setShowFaceOff] = useState(false);
  const faceOffShownRef = useRef(false);
  const navigate = useNavigate();
  const onlineLeave = usePendingLeave();

  useEffect(() => {
    joinRoom(roomId);
    return () => leaveRoom(roomId);
  }, [roomId, joinRoom, leaveRoom]);

  // Clear chat and game state when entering a new room so messages from a
  // previous game don't carry over.
  useEffect(() => {
    useGameStore.setState({ messages: [], gameState: null, selectedChipId: null, lastError: null });
  }, [roomId]);

  useEffect(() => {
    if (!gameState) useGameStore.setState({ selectedChipId: null, lastError: null });
  }, [gameState]);

  // Face-off overlay: show once when both players are seated and no moves
  // have been played yet. A ref prevents re-triggering on subsequent
  // broadcasts (draw offers, state updates) before the first move.
  useEffect(() => {
    if (!gameState) return;
    if (faceOffShownRef.current) return;
    const bothSeated = gameState.players.filter((p) => p.side !== null).length === 2;
    const noMoves = gameState.moveHistory.length === 0;
    const inProgress = gameState.result.status === 'in-progress';
    if (bothSeated && noMoves && inProgress) {
      faceOffShownRef.current = true;
      setShowFaceOff(true);
    }
  }, [gameState]);

  // Reset the face-off ref when entering a new room.
  useEffect(() => {
    faceOffShownRef.current = false;
    setShowFaceOff(false);
  }, [roomId]);

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

  // Stable reference so hooks below don't invalidate every render.
  const history = useMemo(() => gameState?.moveHistory ?? [], [gameState]);
  const { highlight: hoveredMove, onHighlight } = useBoardHighlight(history);
  const replay = useReplay(history);
  useGameLeaveWarning(
    gameState?.result.status === 'in-progress' && !replay.isReplaying
  );

  // Reviewing reconstructs a past position locally; the server state is untouched.
  const viewedState = useMemo(
    () => (replay.isReplaying && boardState ? boardAtMove(history, replay.index!) : boardState),
    [replay.isReplaying, replay.index, history, boardState]
  );
  const viewedMove = replay.isReplaying
    ? replay.index! >= 0
      ? history[replay.index!]
      : null
    : hoveredMove;

  const handleTileClick = useCallback(
    (pos: Position) => {
      if (replay.isReplaying) return; // reviewing history; ignore board clicks
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
    [replay.isReplaying, boardState, gameState, mySide, selected, makeMove, roomId]
  );

  const opponent = gameState?.players.find((p) => p.userId !== userId) ?? null;

  const whitePlayer = gameState?.players.find((p) => p.side === 'white') ?? null;
  const blackPlayer = gameState?.players.find((p) => p.side === 'black') ?? null;

  // One dialog per finished game; dismissing keeps the board readable.
  const finishedResult = gameState?.result.status === 'finished' ? gameState.result : null;
  const resultKey = finishedResult
    ? `${finishedResult.reason}:${finishedResult.winner ?? 'draw'}:${gameState?.moveHistory.length ?? 0}`
    : null;
  const showGameOver = resultKey !== null && resultKey !== dismissedResultKey;

  if (!gameState) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-taupe">
        <ServerUnavailable showLocalHint />
        {connection.failures < UNAVAILABLE_AFTER_FAILURES && <p>Connecting to server...</p>}
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col lg:h-dvh lg:flex-row lg:items-stretch lg:overflow-hidden">
      {showFaceOff && whitePlayer && blackPlayer && (
        <FaceOffOverlay
          white={whitePlayer}
          black={blackPlayer}
          onComplete={() => setShowFaceOff(false)}
        />
      )}
      {showGameOver && !replay.isReplaying && (
        <GameOverDialog
          result={gameState.result}
          perspective={mySide}
          primaryLabel="Back to lobby"
          onPrimary={() => navigate('/lobby')}
          onDismiss={() => setDismissedResultKey(resultKey)}
          detail={opponent ? `vs ${opponent.username ?? opponent.userId}` : null}
        />
      )}
      {onlineLeave.pending && (
        <LeaveConfirmDialog
          warning={onlineLeave.pending.warning}
          onConfirm={onlineLeave.confirmLeave}
          onCancel={onlineLeave.cancelLeave}
        />
      )}
      <div className="flex flex-1 items-start justify-center px-0 py-2 lg:items-center lg:px-3">
        <div className="w-full max-w-[min(100%,calc((100dvh-16rem)*0.9))] lg:max-w-[min(100%,calc((100dvh-1.5rem)*0.9))]">
          <Board
            state={viewedState!}
            selectedChipId={replay.isReplaying ? null : selectedChipId}
            legalMoves={replay.isReplaying ? [] : selected?.legal ?? []}
            onTileClick={handleTileClick}
            lastMove={viewedMove}
          />
        </div>
      </div>

      <aside className="flex w-full flex-col gap-3 px-4 pb-4 sm:px-6 lg:h-full lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-wood-edge/60 lg:px-4 lg:py-4 xl:w-96">
        <div className="flex items-center justify-between gap-3">
          <LeaveAwareLink
            to="/lobby"
            inProgress={gameState.result.status === 'in-progress' && !replay.isReplaying}
            requestLeave={onlineLeave.requestLeave}
            className="text-sm font-semibold text-taupe transition hover:text-accent"
          >
            ← Lobby
          </LeaveAwareLink>
          <h2 className="truncate text-lg font-bold">Room {roomId}</h2>
        </div>
        <p className="text-sm text-taupe">
          {mySide ? `You are ${mySide}. ` : ''}
          {gameState.result.status === 'in-progress'
            ? `${gameState.board.sideToMove === 'white' ? 'White' : 'Black'} to move.`
            : 'Game over.'}
        </p>

        {gameState.players.length < 2 && <WaitingForOpponent roomId={roomId} />}

        {gameState.forfeit && (
          <ForfeitCountdownBanner
            forfeit={gameState.forfeit}
            disconnectedName={
              gameState.players.find((p) => p.side === gameState.forfeit!.side)?.username ?? null
            }
          />
        )}

        {/* Connection lost mid-game: the board freezes on the last known state. */}
        {connection.status !== 'open' && connection.failures >= UNAVAILABLE_AFTER_FAILURES && (
          <div
            role="alert"
            data-testid="connection-lost"
            className="rounded-xl border border-danger/60 bg-danger/15 p-3 text-sm text-parchment shadow-lg shadow-black/30"
          >
            <p className="font-semibold">Connection lost</p>
            <p className="mb-2 text-xs text-parchment/90">
              Reconnecting to the server. The board shows the last position we received.
            </p>
            <button
              type="button"
              onClick={retry}
              className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-primary transition hover:bg-accent-hover"
            >
              Try again
            </button>
          </div>
        )}

        {lastError && (
          <p role="alert" className="rounded-lg bg-danger/25 px-3 py-1 text-sm text-danger">
            {lastError}
          </p>
        )}
        {replay.isReplaying ? (
          <ReplayControls
            current={replay.index!}
            total={history.length}
            onChange={replay.goTo}
            onExit={replay.exit}
          />
        ) : gameState.result.status === 'in-progress' ? (
          <div className="rounded-xl bg-surface p-4 text-sm text-parchment shadow-lg shadow-black/30">
          <p className="mb-2 font-semibold">Players</p>
          <ul className="space-y-1 text-sm text-parchment/90">
            {gameState.players.map((p) => (
              <li key={p.userId} className="flex items-center gap-2">
                <span
                  className={['inline-block h-2 w-2 rounded-full', p.connected ? 'bg-success' : 'bg-wood-edge'].join(' ')}
                  aria-label={p.connected ? 'connected' : 'disconnected'}
                />
                <CountryFlag code={p.countryCode} className="text-base leading-none" />
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
        ) : (
          <div className="rounded-xl bg-surface p-4 text-sm text-parchment shadow-lg shadow-black/30">
            <p className="mb-2 font-semibold">Players</p>
            <ul className="space-y-1 text-sm text-parchment/90">
              {gameState.players.map((p) => (
                <li key={p.userId} className="flex items-center gap-2">
                  <span
                    className={['inline-block h-2 w-2 rounded-full', p.connected ? 'bg-success' : 'bg-wood-edge'].join(' ')}
                    aria-label={p.connected ? 'connected' : 'disconnected'}
                  />
                  <CountryFlag code={p.countryCode} className="text-base leading-none" />
                  {p.username ?? p.userId} — <span className="text-taupe">{p.side}</span>
                  {p.userId === userId && <span className="text-accent">(you)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <MoveHistoryPanel
          history={history}
          onHighlight={onHighlight}
          highlightedMove={viewedMove}
          currentMoveIndex={replay.isReplaying ? replay.index : null}
          onSelectMove={replay.goTo}
        />
        <ChatPanel roomId={roomId} sendChat={sendChat} mySide={mySide} />
      </aside>
    </main>
  );
}

interface LeaveAwareLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  inProgress: boolean;
  requestLeave: (to: string, warning?: string) => void;
}

function LeaveAwareLink({ to, inProgress, requestLeave, children, onClick, ...rest }: LeaveAwareLinkProps) {
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (inProgress) {
          e.preventDefault();
          requestLeave(to, 'You have a game in progress.');
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  if (!gameId || gameId === LOCAL_ID) return <LocalGameView />;
  return <OnlineGameView roomId={gameId} />;
}
