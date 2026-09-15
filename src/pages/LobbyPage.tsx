import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { webSocketService } from '@/services/websocket';
import { useLocalGameStore, useProfileStore } from '@/stores';
import { generateInviteCode, isValidInviteCode, normalizeInviteCode } from '@/utils/inviteCode';
import type { GameRoom } from '@/types';

export function LobbyPage() {
  const [rooms] = useState<GameRoom[]>([]);
  const [roomName, setRoomName] = useState('quick-match');
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const navigate = useNavigate();
  const localResult = useLocalGameStore((s) => s.result);
  const localMoves = useLocalGameStore((s) => s.moveHistory.length);
  const localInProgress = localResult.status === 'in-progress' && localMoves > 0;
  const displayName = useProfileStore((s) => s.displayName);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);

  useEffect(() => {
    webSocketService.connect();
    return () => {};
  }, []);

  const saveName = (): boolean => {
    // Nothing typed: keep the current name (or the generated guest fallback).
    if (nameDraft.trim() === '' && displayName) return true;
    const value = nameDraft.trim() === '' ? displayName ?? '' : nameDraft;
    if (value === '') return true;
    const ok = setDisplayName(value);
    setNameError(ok ? null : 'Name must be 2–20 characters.');
    return ok;
  };

  const createGame = () => {
    if (!saveName()) return;
    navigate(`/game/${generateInviteCode()}`);
  };

  const joinOnline = () => {
    if (!saveName()) return;
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
          Create a game and share the link, or enter a friend's room code. The first player to join is
          White, the second is Black. Rooms are live; the first connection may take up to a minute
          while the server wakes.
        </p>

        <div className="mb-4 flex max-w-sm flex-col gap-1">
          <label htmlFor="display-name" className="text-xs font-semibold uppercase tracking-wide text-taupe">
            Your name
          </label>
          <input
            id="display-name"
            value={nameDraft}
            onChange={(e) => { setNameDraft(e.target.value); setNameError(null); }}
            placeholder={displayName ?? 'Guest ####'}
            maxLength={20}
            className="rounded-lg bg-primary px-3 py-2 text-sm text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
          />
          {nameError && <p role="alert" className="text-xs text-danger">{nameError}</p>}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <button
            type="button"
            onClick={createGame}
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-primary transition hover:bg-accent-hover"
          >
            Create game
          </button>
          <form
            className="flex flex-1 flex-col gap-3 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); joinOnline(); }}
          >
            <label className="sr-only" htmlFor="room-name">Room code or name</label>
            <input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room code"
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-parchment outline-none placeholder:text-taupe focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              className="rounded-lg border border-wood-edge px-6 py-3 font-semibold text-parchment transition hover:border-accent hover:text-accent"
            >
              Join room
            </button>
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
