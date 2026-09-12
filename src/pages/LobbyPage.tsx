import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { webSocketService } from '@/services/websocket';
import { useLocalGameStore } from '@/stores';
import type { GameRoom } from '@/types';

export function LobbyPage() {
  const [rooms] = useState<GameRoom[]>([]);
  const localResult = useLocalGameStore((s) => s.result);
  const localMoves = useLocalGameStore((s) => s.moveHistory.length);
  const localInProgress = localResult.status === 'in-progress' && localMoves > 0;

  useEffect(() => {
    webSocketService.connect();
    // TODO: fetch room list from server once backend exists
    return () => {};
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold">Game Lobby</h2>

      {/* Pass-and-play is always available — one device, two players. */}
      <section aria-label="Local pass-and-play" className="mb-10 rounded-xl bg-surface p-6 shadow-lg">
        <h3 className="mb-1 text-xl font-semibold">Local pass-and-play</h3>
        <p className="mb-4 text-sm text-slate-400">
          Two players, one device. White moves first and slides chips home to the top-right base;
          black races to the bottom-left.
        </p>
        <div className="flex gap-3">
          <Link
            to="/game/local"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-sky-300"
          >
            {localInProgress ? 'Resume local game' : 'Play now'}
          </Link>
          <Link
            to="/profile/guest"
            className="rounded-lg border border-slate-500 px-6 py-3 font-semibold text-slate-200 transition hover:border-accent hover:text-accent"
          >
            View profile
          </Link>
        </div>
      </section>

      <section aria-label="Online rooms">
        <h3 className="mb-4 text-xl font-semibold">Online rooms</h3>
        {rooms.length === 0 ? (
          <div className="rounded-xl bg-surface p-8 text-center text-slate-400">
            <p className="mb-1 font-semibold text-slate-200">Online multiplayer is coming in Phase 5.</p>
            <p className="text-sm">For now, use local pass-and-play above.</p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <li key={room.id} className="rounded-xl bg-surface p-4">
                <h4 className="font-semibold">{room.name}</h4>
                <p className="text-sm text-slate-400">{room.players.length} / 2 players</p>
                <Link
                  to={`/game/${room.id}`}
                  className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-primary"
                >
                  Join
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
