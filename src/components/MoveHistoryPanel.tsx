// Move-history panel, chess.com style: two columns (White / Black) with
// full-move numbers. Read-only; GamePage owns the store.
//
// Hovering (or focusing) a move lets the parent spotlight its from/to squares
// on the board; clicking pins the highlight.

import type { MoveRecord } from '@/stores/localGameStore';

interface MoveHistoryPanelProps {
  history: MoveRecord[];
  /** Called with the hovered/focused move (null when leaving) for board highlighting. */
  onHighlight?: (move: MoveRecord | null) => void;
  /** Move currently highlighted on the board (pinned by click or hover). */
  highlightedMove?: MoveRecord | null;
}

export function MoveHistoryPanel({ history, onHighlight, highlightedMove }: MoveHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="w-full rounded-xl bg-surface p-4 text-sm text-slate-400 shadow-lg" data-testid="move-history">
        No moves yet.
      </div>
    );
  }

  const rows: { number: number; white?: MoveRecord; black?: MoveRecord }[] = [];
  for (const move of history) {
    if (move.player === 'white') rows.push({ number: move.number, white: move });
    else rows[rows.length - 1].black = move;
  }

  const cell = (move?: MoveRecord, className = '') => {
    if (!move) return <td className={`py-1.5 font-mono ${className}`} />;
    const isHighlighted = highlightedMove === move;
    return (
      <td className={`py-1.5 font-mono ${className}`}>
        <button
          type="button"
          className={[
            'rounded px-1 text-left transition',
            isHighlighted ? 'bg-amber-300/25 text-amber-100' : 'hover:bg-slate-700',
          ].join(' ')}
          onMouseEnter={() => onHighlight?.(move)}
          onMouseLeave={() => onHighlight?.(null)}
          onFocus={() => onHighlight?.(move)}
          onBlur={() => onHighlight?.(null)}
          onClick={() => onHighlight?.(move)}
        >
          {move.notation}
        </button>
      </td>
    );
  };

  return (
    <div className="w-full max-h-64 overflow-y-auto rounded-xl bg-surface p-4 shadow-lg" data-testid="move-history">
      <table className="w-full text-left text-sm text-slate-200">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="w-8 pb-2 font-semibold">#</th>
            <th className="pb-2 font-semibold">White</th>
            <th className="pb-2 font-semibold">Black</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.number} className="border-t border-slate-700">
              <td className="py-1.5 font-mono text-slate-500">{row.number}</td>
              {cell(row.white)}
              {cell(row.black, 'text-slate-300')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
