// Modal for replaying a finished game's moves from the profile page.
// Uses the same Board + ReplayControls + MoveHistoryPanel as the live game,
// but over a persisted move list (from statsStore or Supabase).

import { useMemo, useState } from 'react';
import { Board } from '@/components/Board';
import { MoveHistoryPanel } from '@/components/MoveHistoryPanel';
import { ReplayControls } from '@/components/ReplayControls';
import { boardAtMove } from '@/engine';
import type { Position, ReplayMove } from '@/engine';
import type { MoveRecord } from '@/stores/localGameStore';

interface GameReplayModalProps {
  /** The match to replay (local or online). */
  match: {
    moves: ReplayMove[];
    winner: 'white' | 'black' | null;
    reason: string;
    moveCount: number;
  };
  onClose: () => void;
}

/** Converts ReplayMove[] to MoveRecord[] for MoveHistoryPanel compatibility. */
function toMoveRecords(moves: ReplayMove[]): MoveRecord[] {
  return moves.map((m, i) => ({
    number: Math.floor(i / 2) + 1,
    player: i % 2 === 0 ? 'white' : 'black',
    chipId: m.chipId,
    from: m.from,
    to: m.to,
    notation: `${m.chipId.split('-')[1]} ${formatPos(m.from)}→${formatPos(m.to)}`,
  }));
}

function formatPos(p: Position): string {
  const files = 'abcdefghi';
  return `${files[p.x]}${10 - p.y}`;
}

export function GameReplayModal({ match, onClose }: GameReplayModalProps) {
  const moves = match.moves;
  const [index, setIndex] = useState<number>(moves.length > 0 ? moves.length - 1 : -1);
  const [hovered, setHovered] = useState<MoveRecord | null>(null);

  const moveRecords = useMemo(() => toMoveRecords(moves), [moves]);
  const viewedState = useMemo(() => boardAtMove(moves, index), [moves, index]);
  const viewedMove = index >= 0 ? moveRecords[index] : null;
  const highlight = hovered ?? viewedMove;

  const goTo = (next: number) => setIndex(Math.max(-1, Math.min(next, moves.length - 1)));
  const handleTileClick = () => {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game replay"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-primary p-4 shadow-2xl lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg border border-wood-edge px-2 py-1 text-xs font-semibold text-taupe transition hover:border-accent hover:text-accent"
        >
          ✕
        </button>

        {/* Board */}
        <div className="flex flex-1 items-center justify-center p-2">
          <div className="w-full max-w-[min(100%,calc(60dvh*0.9))]">
            <Board
              state={viewedState}
              selectedChipId={null}
              legalMoves={[]}
              onTileClick={handleTileClick}
              lastMove={viewedMove}
            />
          </div>
        </div>

        {/* Side panel: controls + history */}
        <aside className="flex w-full flex-col gap-3 p-2 lg:w-80">
          {moves.length > 0 && (
            <ReplayControls
              current={index}
              total={moves.length}
              onChange={goTo}
              onExit={onClose}
            />
          )}
          <MoveHistoryPanel
            history={moveRecords}
            onHighlight={setHovered}
            highlightedMove={highlight}
            currentMoveIndex={index >= 0 ? index : null}
            onSelectMove={goTo}
          />
        </aside>
      </div>
    </div>
  );
}