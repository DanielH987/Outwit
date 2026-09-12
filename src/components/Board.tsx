// Renders the 9x10 board: tiles, base zones, chips, and move targets.
// Presentation is read-only w.r.t. the store; GamePage owns interaction.
//
// Layout: origin top-left — y grows downwards (docs/RULES.md §1).
// We render black (Player 2) at the top so white (Player 1) sits at the
// bottom... which would flip bases. Instead we keep the rule orientation:
// White base top-right, Black base bottom-left.

import type { BoardState, PlayerId, Position } from '@/engine';
import { baseOwner } from '@/engine';

interface BoardProps {
  state: BoardState;
  selectedChipId: string | null;
  legalMoves: Position[];
  onTileClick: (pos: Position) => void;
}

export function Board({ state, selectedChipId, legalMoves, onTileClick }: BoardProps) {
  const rows = Array.from({ length: 10 }, (_, y) => y);
  const cols = Array.from({ length: 9 }, (_, x) => x);

  const selected = selectedChipId
    ? state.chips.find((c) => c.id === selectedChipId) ?? null
    : null;

  const isTarget = (pos: Position) => legalMoves.some((m) => m.x === pos.x && m.y === pos.y);

  return (
    <div
      className="grid aspect-[9/10] w-full select-none overflow-hidden rounded-xl shadow-lg"
      style={{ gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gridTemplateRows: 'repeat(10, minmax(0, 1fr))' }}
      role="grid"
      aria-label="Outwit board"
    >
      {rows.map((y) =>
        cols.map((x) => {
          const pos = { x, y };
          const owner: PlayerId | null = baseOwner(pos);
          const chip = state.chips.find((c) => c.position.x === x && c.position.y === y);
          const isSelected = chip && chip.id === selectedChipId;
          const isLegalTarget = !chip && isTarget(pos);
          const light = (x + y) % 2 === 0;

          return (
            <button
              key={`${x},${y}`}
              type="button"
              role="gridcell"
              aria-label={`tile ${x},${y}`}
              onClick={() => onTileClick(pos)}
              className={[
                'relative flex items-center justify-center border border-primary/60 transition',
                light ? 'bg-slate-700' : 'bg-slate-800',
                owner === 'white' ? 'bg-sky-950' : '',
                owner === 'black' ? 'bg-amber-900/60' : '',
                isLegalTarget ? 'cursor-pointer' : '',
              ].join(' ')}
            >
              {isLegalTarget && (
                <span className="absolute h-3 w-3 rounded-full bg-accent/90 ring-2 ring-accent/60" aria-hidden />
              )}
              {chip && (
                <span
                  data-testid={`chip-${chip.id}`}
                  aria-label={`${chip.player} chip ${chip.id}`}
                  className={[
                    'pointer-events-none flex h-4/5 w-4/5 items-center justify-center rounded-full border-2 text-[0.55rem] font-bold sm:text-xs',
                    chip.player === 'white'
                      ? 'border-slate-100 bg-slate-100 text-slate-900'
                      : 'border-slate-900 bg-slate-950 text-slate-100',
                    isSelected ? 'ring-4 ring-accent shadow-lg shadow-accent/50' : '',
                    chip.isPower ? 'ring-2 ring-amber-400' : '',
                  ].join(' ')}
                >
                  {chip.isPower ? '★' : chip.id.split('-')[1]}
                </span>
              )}
              {isSelected && (
                <span className="sr-only">selected{selected ? ` at ${selected.position.x},${selected.position.y}` : ''}</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
