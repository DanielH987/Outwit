// Move-history panel, chess.com style: two columns (White / Black) with
// full-move numbers. Read-only; GamePage owns the store.

import type { MoveRecord } from '@/stores/localGameStore';

interface MoveHistoryPanelProps {
  history: MoveRecord[];
}

export function MoveHistoryPanel({ history }: MoveHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <div className="w-full rounded-xl bg-surface p-4 text-sm text-slate-400 shadow-lg" data-testid="move-history">
        No moves yet.
      </div>
    );
  }

  const rows: { number: number; white?: string; black?: string }[] = [];
  for (const move of history) {
    if (move.player === 'white') rows.push({ number: move.number, white: move.notation });
    else rows[rows.length - 1].black = move.notation;
  }

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
              <td className="py-1.5 font-mono">{row.white ?? ''}</td>
              <td className="py-1.5 font-mono text-slate-300">{row.black ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
