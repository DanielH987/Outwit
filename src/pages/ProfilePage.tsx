import { useEffect, useState } from 'react';
import { IdentityCard } from '@/components/IdentityCard';
import { GameReplayModal } from '@/components/GameReplayModal';
import { fetchMatchesFor, type OnlineMatch } from '@/services/matches';
import { useAuthStore, useStatsStore } from '@/stores';
import { REASON_LABELS } from '@/stores/statsStore';
import type { LocalMatchRecord } from '@/stores/statsStore';

type ReplayableMatch = {
  moves: LocalMatchRecord['moves'];
  winner: 'white' | 'black' | null;
  reason: string;
  moveCount: number;
};

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

/** Result from the signed-in player's perspective. */
function onlineResult(match: OnlineMatch, userId: string): string {
  if (match.winner === null) return 'Draw';
  const mySide = match.whiteId === userId ? 'white' : 'black';
  return match.winner === mySide ? 'Win' : 'Loss';
}

export function ProfilePage() {
  const matches = useStatsStore((s) => s.matches);
  const userId = useAuthStore((s) => s.userId);
  const [onlineMatches, setOnlineMatches] = useState<OnlineMatch[]>([]);
  const [replayMatch, setReplayMatch] = useState<ReplayableMatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMatchesFor(userId).then((rows) => {
      if (!cancelled) setOnlineMatches(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const total = matches.length;
  const whiteWins = matches.filter((m) => m.winner === 'white').length;
  const blackWins = matches.filter((m) => m.winner === 'black').length;
  const draws = total - whiteWins - blackWins;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold">Profile</h2>

      {/* Left: identity (public face + settings). Right: results. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="flex flex-col gap-6">
          <IdentityCard />
          <section aria-label="Local stats" className="grid grid-cols-2 gap-3">
            <StatCard label="Games" value={total} />
            <StatCard label="White wins" value={whiteWins} />
            <StatCard label="Black wins" value={blackWins} />
            <StatCard label="Draws" value={draws} />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-label="Match history">
            <h3 className="mb-3 text-lg font-semibold">Match history</h3>
            {matches.length === 0 ? (
              <p className="rounded-xl bg-surface p-6 text-center text-sm text-taupe shadow-lg shadow-black/30">
                No local games yet. Play a local game from the lobby.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {[...matches].reverse().map((match, i) => {
                  const hasMoves = (match.moves?.length ?? 0) > 0;
                  return (
                    <li key={`${match.finishedAt}-${i}`}>
                      <button
                        type="button"
                        disabled={!hasMoves}
                        onClick={() => hasMoves && setReplayMatch(match)}
                        className="flex w-full items-center justify-between rounded-lg bg-surface px-4 py-3 text-sm transition enabled:hover:bg-surface/80 enabled:hover:ring-1 enabled:hover:ring-accent/40 disabled:cursor-default"
                      >
                        <span className="font-semibold">{resultLabel(match)}</span>
                        <span className="text-taupe">{REASON_LABELS[match.reason]}</span>
                        <span className="font-mono text-xs text-taupe/80">
                          {new Date(match.finishedAt).toLocaleString()} · {match.moveCount} moves · W {formatDuration(match.whiteSeconds)} / B {formatDuration(match.blackSeconds)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Online match history">
            <h3 className="mb-3 text-lg font-semibold">Online games</h3>
            {onlineMatches.length === 0 ? (
              <p className="rounded-xl bg-surface p-6 text-center text-sm text-taupe shadow-lg shadow-black/30">
                No online games recorded yet. Play a room with a friend and the result shows up here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {onlineMatches.map((match) => {
                  const opponent = match.whiteId === userId ? match.blackName : match.whiteName;
                  const result = onlineResult(match, userId);
                  const hasMoves = (match.moves?.length ?? 0) > 0;
                  return (
                    <li key={match.id}>
                      <button
                        type="button"
                        disabled={!hasMoves}
                        onClick={() => hasMoves && setReplayMatch(match)}
                        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-4 py-3 text-sm transition enabled:hover:bg-surface/80 enabled:hover:ring-1 enabled:hover:ring-accent/40 disabled:cursor-default"
                      >
                        <span className={`font-semibold ${result === 'Win' ? 'text-success' : result === 'Loss' ? 'text-danger' : 'text-taupe'}`}>
                          {result}
                        </span>
                        <span className="text-parchment/90">vs {opponent ?? 'someone'}</span>
                        <span className="text-taupe">{REASON_LABELS[match.reason as keyof typeof REASON_LABELS] ?? match.reason}</span>
                        <span className="font-mono text-xs text-taupe/80">
                          {new Date(match.finishedAt).toLocaleString()} · {match.moveCount} moves
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {replayMatch && (
        <GameReplayModal match={replayMatch} onClose={() => setReplayMatch(null)} />
      )}
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
