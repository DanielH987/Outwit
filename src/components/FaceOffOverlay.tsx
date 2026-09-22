// Chess.com-style face-off overlay: shows both players' names, flags, and
// side labels when an online game starts. Slides in, holds ~2s, slides out.
// Pure presentational — the parent controls when to mount/unmount.

import { useEffect, useState } from 'react';
import { CountryFlag } from '@/components/CountryFlag';

interface FaceOffPlayer {
  userId: string;
  username: string | null;
  countryCode?: string | null;
  side: 'white' | 'black' | null;
}

interface FaceOffOverlayProps {
  white: FaceOffPlayer;
  black: FaceOffPlayer;
  onComplete: () => void;
}

const HOLD_MS = 2000;
const EXIT_MS = 1000;

export function FaceOffOverlay({ white, black, onComplete }: FaceOffOverlayProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), HOLD_MS);
    const doneTimer = setTimeout(onComplete, HOLD_MS + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  const whiteName = white.username ?? white.userId;
  const blackName = black.username ?? black.userId;

  return (
    <div
      data-testid="face-off-overlay"
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-black/80',
        'transition-all duration-1000',
        exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
      ].join(' ')}
    >
      <div className="flex items-center gap-8 sm:gap-16">
        <PlayerCard player={white} name={whiteName} />
        <div className="text-4xl font-extrabold text-accent sm:text-6xl">VS</div>
        <PlayerCard player={black} name={blackName} />
      </div>
    </div>
  );
}

function PlayerCard({ player, name }: { player: FaceOffPlayer; name: string }) {
  const isWhite = player.side === 'white';
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={[
          'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold sm:h-24 sm:w-24 sm:text-4xl',
          isWhite
            ? 'bg-parchment text-primary'
            : 'bg-primary text-parchment ring-2 ring-parchment/30',
        ].join(' ')}
      >
        {name.charAt(0).toUpperCase()}
      </div>
      <CountryFlag code={player.countryCode} className="text-2xl sm:text-3xl" />
      <span className="text-lg font-bold text-parchment sm:text-2xl">{name}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-taupe sm:text-sm">
        {isWhite ? 'White' : 'Black'}
      </span>
    </div>
  );
}