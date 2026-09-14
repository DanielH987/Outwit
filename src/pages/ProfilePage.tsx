import { useParams } from 'react-router-dom';
import { useStatsStore } from '@/stores';
import { REASON_LABELS } from '@/stores/statsStore';
import type { LocalMatchRecord } from '@/stores/statsStore';

function resultLabel(record: LocalMatchRecord): string {
  if (record.winner === 'white') return 'White won';
  if (record.winner === 'black') return 'Black won';
  return 'Draw';
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ProfilePage() {
  const { username = 'guest' } = useParams<{ username: string }>();
  const matches = useStatsStore((s) => s.matches);

  const total = matches.length;
  const whiteWins = matches.filter((m) => m.winner === 'white').length;
  const blackWins = matches.filter((m) => m.winner === 'black').length;
  const draws = total - whiteWins - blackWins;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h2 className="mb-1 text-2xl font-bold">{username}</h2>
      <p className="mb-6 text-sm text-taupe">Local pass-and-play stats (this device only, until multiplayer arrives).</p>

      <section aria-label="Local stats" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Games" value={total} />
        <StatCard label="White wins" value={whiteWins} />
        <StatCard label="Black wins" value={blackWins} />
        <StatCard label="Draws" value={draws} />
      </section>

      <section aria-label="Match history">
        <h3 className="mb-3 text-lg font-semibold">Match history</h3>
        {matches.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-taupe shadow-lg shadow-black/30">
            No games yet. Play a local game from the lobby.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...matches].reverse().map((match, i) => (
              <li key={`${match.finishedAt}-${i}`} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 text-sm">
                <span className="font-semibold">{resultLabel(match)}</span>
                <span className="text-taupe">{REASON_LABELS[match.reason]}</span>
                <span className="font-mono text-xs text-taupe/80">
                  {new Date(match.finishedAt).toLocaleString()} · {match.moveCount} moves · W {formatDuration(match.whiteSeconds)} / B {formatDuration(match.blackSeconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface p-4 text-center">
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-xs uppercase tracking-wide text-taupe">{label}</div>
    </div>
  );
}
