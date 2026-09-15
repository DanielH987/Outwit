// Shown in an online room while waiting for the second player: the room code,
// a copyable invite link, and a native share button where available.

import { useState } from 'react';
import { inviteUrl } from '@/utils/inviteCode';

interface WaitingForOpponentProps {
  roomId: string;
}

export function WaitingForOpponent({ roomId }: WaitingForOpponentProps) {
  const url = inviteUrl(roomId);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): the input below
      // stays selectable so the link can still be copied by hand.
      setCopied(false);
    }
  };

  const share = async () => {
    if (typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ title: 'Play Outwit', text: `Join my Outwit game: ${roomId}`, url });
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <div
      className="rounded-xl border border-wood-edge bg-surface p-4 text-sm text-parchment shadow-lg shadow-black/30"
      data-testid="waiting-for-opponent"
    >
      <p className="mb-1 font-semibold">Waiting for opponent</p>
      <p className="mb-3 text-taupe">Share this link — the first to join plays White, the second Black.</p>

      <p className="mb-2 text-center font-mono text-lg tracking-[0.25em] text-accent" data-testid="room-code">
        {roomId}
      </p>

      <div className="mb-3 flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Invite link"
          data-testid="invite-link"
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-lg bg-primary px-3 py-2 text-xs text-taupe outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-primary transition hover:bg-accent-hover"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
        <button
          type="button"
          onClick={share}
          className="w-full rounded-lg border border-wood-edge px-3 py-2 text-xs font-semibold transition hover:border-accent hover:text-accent"
        >
          Share…
        </button>
      )}
    </div>
  );
}
