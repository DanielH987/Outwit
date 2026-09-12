import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { webSocketService } from '@/services/websocket';
import { useLocalGameStore } from '@/stores';
import type { GameRoom } from '@/types';

export function LobbyPage() {
  const [rooms] = useState<GameRoom[]>([]);
  const [roomName, setRoomName] = useState('quick-match');
  const navigate = useNavigate();
  const localResult = useLocalGameStore((s) => s.result);
  const localMoves = useLocalGameStore((s) => s.moveHistory.length);
  const localInProgress = localResult.status === 'in-progress' && localMoves > 0;

  useEffect(() => {
    webSocketService.connect();
    return () => {};
  }, []);

  const joinOnline = () => {
    const name = roomName.trim();
    if (!name) return;
    navigate(`/game/${encodeURIComponent(name)}`);
  };

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

      {/* Online multiplayer: run `npm run server`, then join any room name. */}
      <section aria-label="Online rooms" className="mb-10 rounded-xl bg-surface p-6 shadow-lg">
        <h3 className="mb-1 text-xl font-semibold">Online room</h3>
        <p className="mb-4 text-sm text-slate-400">
          Requires the server (<code className="rounded bg-primary px-1 py-0.5">npm run server</code>).
          Two players connect to the same room name; first joiner is White. Anyone opening
          <code className="mx-1 rounded bg-primary px-1 py-0.5">/game/&lt;room&gt;</code> joins.
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); joinOnline(); }}
        >
          <label className="sr-only" htmlFor="room-name">Room name</label>
          <input
            id="room-name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name"
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-sky-300"
          >
            Join online room
          </button>
        </form>

        {rooms.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <li key={room.id} className="rounded-xl bg-surface p-4">
                <h4 className="font-semibold">{room.name}</h4>
                <Link to={`/game/${room.id}`} className="text-accent">Join</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
