import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { webSocketService } from '@/services/websocket';
import type { GameRoom } from '@/types';

export function LobbyPage() {
  const [rooms] = useState<GameRoom[]>([]);

  useEffect(() => {
    webSocketService.connect();
    // TODO: fetch room list from server once backend exists
    return () => {};
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold">Game Lobby</h2>
      {rooms.length === 0 ? (
        <div className="rounded-xl bg-surface p-8 text-center text-slate-400">
          <p className="mb-4">No active rooms yet.</p>
          <button className="rounded-lg bg-accent px-4 py-2 font-medium text-primary">
            Create Game
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id} className="rounded-xl bg-surface p-4">
              <h3 className="font-semibold">{room.name}</h3>
              <p className="text-sm text-slate-400">
                {room.players.length} / 2 players
              </p>
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
    </main>
  );
}
