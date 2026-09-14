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
      <div className="w-full rounded-xl bg-surface p-4 text-sm text-taupe shadow-lg shadow-black/30" data-testid="move-history">
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
            isHighlighted ? 'bg-accent/30 text-parchment' : 'hover:bg-wood-edge/60',
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
    <div className="w-full max-h-64 overflow-y-auto rounded-xl bg-surface p-4 shadow-lg shadow-black/30" data-testid="move-history">
      <table className="w-full text-left text-sm text-parchment">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-taupe">
            <th className="w-8 pb-2 font-semibold">#</th>
            <th className="pb-2 font-semibold">White</th>
            <th className="pb-2 font-semibold">Black</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.number} className="border-t border-wood-edge">
              <td className="py-1.5 font-mono text-taupe">{row.number}</td>
              {cell(row.white)}
              {cell(row.black, 'text-parchment/80')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
