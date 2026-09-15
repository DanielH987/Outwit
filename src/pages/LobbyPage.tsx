import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { webSocketService } from '@/services/websocket';
import { useLocalGameStore, useProfileStore } from '@/stores';
import { generateInviteCode, isValidInviteCode, normalizeInviteCode } from '@/utils/inviteCode';
import type { GameRoom } from '@/types';

export function LobbyPage() {
  const [rooms] = useState<GameRoom[]>([]);
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();
  const localResult = useLocalGameStore((s) => s.result);
  const localMoves = useLocalGameStore((s) => s.moveHistory.length);
  const localInProgress = localResult.status === 'in-progress' && localMoves > 0;
  const displayName = useProfileStore((s) => s.displayName);
  const guestName = useProfileStore((s) => s.guestName);
  const ensureGuestName = useProfileStore((s) => s.ensureGuestName);

  useEffect(() => {
    webSocketService.connect();
    return () => {};
  }, []);

  // Name shown in the "you'll play as" line (persisted guest name until set).
  const playingAs = displayName ?? guestName ?? ensureGuestName();

  const createGame = () => {
    navigate(`/game/${generateInviteCode()}`);
  };

  const joinOnline = () => {
    const raw = roomName.trim();
    if (!raw) return;
    // Codes are normalized; anything else stays a free-text room name.
    const roomId = isValidInviteCode(raw) ? normalizeInviteCode(raw) : raw;
    navigate(`/game/${encodeURIComponent(roomId)}`);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold">Game Lobby</h2>

      {/* Pass-and-play is always available — one device, two players. */}
      <section aria-label="Local pass-and-play" className="mb-10 rounded-xl bg-surface p-6 shadow-lg shadow-black/30">
        <h3 className="mb-1 text-xl font-semibold">Local pass-and-play</h3>
        <p className="mb-4 text-sm text-taupe">
          Two players, one device. White moves first and slides chips home to the top-right base;
          black races to the bottom-left.
        </p>
        <div className="flex gap-3">
          <Link
            to="/game/local"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-accent-hover"
          >
            {localInProgress ? 'Resume local game' : 'Play now'}
          </Link>
          <Link
            to="/profile/guest"
            className="rounded-lg border border-wood-edge px-6 py-3 font-semibold text-parchment transition hover:border-accent hover:text-accent"
          >
            View profile
          </Link>
        </div>
      </section>

      {/* Online multiplayer: create a game and share the link, or join by code. */}
      <section aria-label="Online rooms" className="mb-10 rounded-xl bg-surface p-6 shadow-lg shadow-black/30">
        <h3 className="mb-1 text-xl font-semibold">Play with a friend</h3>
        <p className="mb-4 text-sm text-taupe">
          The first player to join is White, the second is Black. Rooms are live; the first connection
          may take up to a minute while the server wakes.
        </p>

        {/* Name lives in Profile (chess.com-style: settings, not the lobby). */}
        <p className="mb-4 text-xs text-taupe" data-testid="playing-as">
          Playing as <span className="font-semibold text-parchment">{playingAs}</span>.{' '}
          <Link to="/profile/guest" className="text-accent hover:underline">
            Change name
          </Link>
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <div className="flex flex-1 flex-col rounded-xl border border-wood-edge bg-primary/40 p-4">
            <h4 className="mb-1 font-semibold text-parchment">Create a room</h4>
            <p className="mb-4 flex-1 text-sm text-taupe">
              You'll get a link and code to send your friend.
            </p>
            <button
              type="button"
              onClick={createGame}
              className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-accent-hover"
            >
              Create room
            </button>
          </div>

          <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-wide text-taupe">
            or
          </div>

          <form
            className="flex flex-1 flex-col rounded-xl border border-wood-edge bg-primary/40 p-4"
            onSubmit={(e) => { e.preventDefault(); joinOnline(); }}
          >
            <h4 className="mb-1 font-semibold text-parchment">Join a room</h4>
            <p className="mb-4 flex-1 text-sm text-taupe">
              Enter the code your friend shared with you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="room-name">Room code or name</label>
              <input
                id="room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Room code"
                className="min-w-0 flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-accent-hover"
              >
                Join room
              </button>
            </div>
          </form>
        </div>

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
