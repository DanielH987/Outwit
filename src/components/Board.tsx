// Renders the 9x10 board: tiles, base zones, chips, and move targets.
// Presentation is read-only w.r.t. the store; GamePage owns interaction.
//
// Layout: origin top-left — y grows downwards (docs/RULES.md §1).
// We render black (Player 2) at the top so white (Player 1) sits at the
// bottom... which would flip bases. Instead we keep the rule orientation:
// White base top-right, Black base bottom-left.
//
// Chips render in an absolutely-positioned layer above the grid, keyed by chip
// id, so a move only changes their `left`/`top` — CSS transitions them smoothly
// (chess.com-style) instead of teleporting between tiles.

import { useEffect, useRef } from 'react';
import type { BoardState, Chip, PlayerId, Position } from '@/engine';
import { BOARD_HEIGHT, BOARD_WIDTH, baseOwner, fileLabel, formatPosition, rankLabel } from '@/engine';

interface BoardProps {
  state: BoardState;
  selectedChipId: string | null;
  legalMoves: Position[];
  onTileClick: (pos: Position) => void;
  /** Squares of the most recent move, highlighted like chess.com. */
  lastMove?: { from: Position; to: Position } | null;
}

/**
 * Slide timing. ~160 ms feels instant but visible; +18 ms per tile keeps long
 * slides readable without dragging (a 5-tile slide ≈ 250 ms, capped at 320 ms).
 */
export const SLIDE_BASE_MS = 160;
export const SLIDE_PER_TILE_MS = 18;
export const SLIDE_MAX_MS = 320;

function slideDuration(from: Position, to: Position): number {
  const distance = Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y));
  return Math.min(SLIDE_MAX_MS, SLIDE_BASE_MS + SLIDE_PER_TILE_MS * distance);
}

interface ChipViewProps {
  chip: Chip;
  isSelected: boolean;
  /** Non-null only on the render where this chip moved; drives the transition. */
  durationMs: number | null;
}

function ChipView({ chip, isSelected, durationMs }: ChipViewProps) {
  return (
    <span
      data-testid={`chip-${chip.id}`}
      data-position={formatPosition(chip.position)}
      aria-label={`${chip.player} chip ${chip.id}`}
      className="chip-slide pointer-events-none absolute flex items-center justify-center"
      style={{
        left: `${(chip.position.x / BOARD_WIDTH) * 100}%`,
        top: `${(chip.position.y / BOARD_HEIGHT) * 100}%`,
        width: `${100 / BOARD_WIDTH}%`,
        height: `${100 / BOARD_HEIGHT}%`,
        ...(durationMs !== null
          ? { transitionDuration: `${durationMs}ms`, zIndex: 5 }
          : {}),
      }}
    >
      <span
        className={[
          'flex h-4/5 w-4/5 items-center justify-center rounded-full border-2 shadow-md shadow-black/30',
          chip.player === 'white'
            ? 'border-[#D9C3AC] bg-chip-white text-[#2A1F1B]'
            : 'border-[#2A1F1B] bg-chip-black text-parchment',
          isSelected ? 'ring-4 ring-accent shadow-lg shadow-accent/50' : '',
          chip.isPower ? 'border-dashed border-accent' : '',
        ].join(' ')}
      >
        {chip.isPower && (
          <span className="text-[0.6rem] leading-none sm:text-sm" aria-hidden>
            ★
          </span>
        )}
      </span>
    </span>
  );
}

export function Board({ state, selectedChipId, legalMoves, onTileClick, lastMove = null }: BoardProps) {
  const rows = Array.from({ length: 10 }, (_, y) => y);
  const cols = Array.from({ length: 9 }, (_, x) => x);

  const isTarget = (pos: Position) => legalMoves.some((m) => m.x === pos.x && m.y === pos.y);
  const isLastMoveSquare = (pos: Position) =>
    lastMove !== null &&
    ((pos.x === lastMove.from.x && pos.y === lastMove.from.y) ||
      (pos.x === lastMove.to.x && pos.y === lastMove.to.y));

  // Compare with the last committed positions to find the chip that just moved
  // (works for local play and online snapshots alike). The ref updates only
  // after commit, so StrictMode's double render still detects the move.
  const prevPositions = useRef<Map<string, Position>>(new Map());
  const durations = new Map<string, number>();
  for (const chip of state.chips) {
    const prev = prevPositions.current.get(chip.id);
    if (prev && (prev.x !== chip.position.x || prev.y !== chip.position.y)) {
      durations.set(chip.id, slideDuration(prev, chip.position));
    }
  }

  useEffect(() => {
    const next = new Map<string, Position>();
    for (const chip of state.chips) next.set(chip.id, { ...chip.position });
    prevPositions.current = next;
  }, [state.chips]);

  return (
    // Width-driven at every size: the wrapper in GamePage caps the width by the
    // viewport height on desktop (`calc((100dvh - reserve) * 0.9)`, our 9:10
    // aspect), so the whole board fits without scrolling. Do NOT make this
    // height-driven: `h-full` + aspect can overflow the wrapper and overlap the
    // sidebar on tall screens.
    <div className="board-container mx-auto w-full rounded-xl bg-board-frame p-2 shadow-xl shadow-black/40">
      <div className="relative">
        <div
          className="grid aspect-[9/10] w-full select-none overflow-hidden rounded-md ring-1 ring-black/30"
          style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gridTemplateRows: 'repeat(10, minmax(0, 1fr))' }}
          role="grid"
          aria-label="Outwit board"
        >
          {rows.map((y) =>
            cols.map((x) => {
              const pos = { x, y };
              const owner: PlayerId | null = baseOwner(pos);
              const hasChip = state.chips.some((c) => c.position.x === x && c.position.y === y);
              const isLegalTarget = !hasChip && isTarget(pos);
              const light = (x + y) % 2 === 0;
              const lastMoveSquare = isLastMoveSquare(pos);
              // chess.com-style embedded coordinates: rank on the leftmost file,
              // file on the bottom rank, colored to contrast the tile background
              // (bases override the checkerboard, so pick light/dark per owner).
              const coordinateColor =
                owner === 'black'
                  ? 'text-parchment/80'
                  : owner === 'white'
                    ? 'text-[#4A2E17]/80'
                    : light
                      ? 'text-board-dark'
                      : 'text-board-light';

              return (
                <button
                  key={`${x},${y}`}
                  type="button"
                  role="gridcell"
                  aria-label={`tile ${formatPosition(pos)}`}
                  onClick={() => onTileClick(pos)}
                  className={[
                    'relative flex items-center justify-center border border-black/10 transition',
                    owner === 'white' ? 'bg-base-white' : owner === 'black' ? 'bg-base-black' : light ? 'bg-board-light' : 'bg-board-dark',
                    isLegalTarget ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  {lastMoveSquare && (
                    <span
                      className="pointer-events-none absolute inset-0 bg-accent/30"
                      data-testid={`last-move-${formatPosition(pos)}`}
                      aria-hidden
                    />
                  )}
                  {x === 0 && (
                    <span
                      className={`board-coord pointer-events-none absolute left-0.5 top-0 font-bold leading-tight ${coordinateColor}`}
                      data-testid={`rank-label-${rankLabel(y)}`}
                      aria-hidden
                    >
                      {rankLabel(y)}
                    </span>
                  )}
                  {y === 9 && (
                    <span
                      className={`board-coord pointer-events-none absolute bottom-0 right-0.5 font-bold leading-tight ${coordinateColor}`}
                      data-testid={`file-label-${fileLabel(x)}`}
                      aria-hidden
                    >
                      {fileLabel(x)}
                    </span>
                  )}
                  {isLegalTarget && (
                    <span className="absolute h-3 w-3 rounded-full bg-accent/90 ring-2 ring-accent/50" aria-hidden />
                  )}
                  {hasChip && chipSelectionText(state, pos, selectedChipId) && (
                    <span className="sr-only">{chipSelectionText(state, pos, selectedChipId)}</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Chip layer: keyed by chip id so DOM nodes persist across moves and
            the left/top transition plays. Non-interactive (tiles are beneath). */}
        <div className="pointer-events-none absolute inset-0" data-testid="chip-layer">
          {state.chips.map((chip) => (
            <ChipView
              key={chip.id}
              chip={chip}
              isSelected={chip.id === selectedChipId}
              durationMs={durations.get(chip.id) ?? null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Screen-reader hint for the selected chip, rendered inside its tile. */
function chipSelectionText(state: BoardState, pos: Position, selectedChipId: string | null): string | null {
  const chip = state.chips.find((c) => c.position.x === pos.x && c.position.y === pos.y);
  if (!chip || chip.id !== selectedChipId) return null;
  return `selected at ${formatPosition(pos)}`;
}
