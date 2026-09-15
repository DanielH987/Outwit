// Disconnect-forfeit countdown: while an opponent's connection is gone, the
// server keeps a grace-period timer running before awarding the win. This shows
// a live countdown so the remaining player knows exactly what is about to
// happen (chess.com-style).
//
// Timing comes from the server (absolute `deadline` + `serverNow`), so the
// countdown stays correct across reconnects and despite client clock skew: we
// measure the offset once per payload and tick locally between broadcasts.

import { useEffect, useState } from 'react';
import type { ForfeitCountdown } from '@/types';

interface ForfeitCountdownBannerProps {
  forfeit: ForfeitCountdown;
  /** Display name of the disconnected player when known. */
  disconnectedName: string | null;
}

function formatSeconds(total: number): string {
  const secs = Math.max(0, Math.ceil(total));
  return `${secs}s`;
}

export function ForfeitCountdownBanner({ forfeit, disconnectedName }: ForfeitCountdownBannerProps) {
  // Offset between the server clock and this device's clock, captured from the
  // payload. Recomputed whenever a new payload arrives.
  const [offset] = useState(() => Date.now() - forfeit.serverNow);
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, forfeit.deadline - forfeit.serverNow));

  useEffect(() => {
    const tick = () => {
      const serverNow = Date.now() - offset;
      setRemainingMs(Math.max(0, forfeit.deadline - serverNow));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [forfeit.deadline, offset]);

  const secondsLeft = remainingMs / 1000;
  const urgent = secondsLeft <= 15;
  const elapsedRatio = Math.min(1, Math.max(0, 1 - secondsLeft / forfeit.graceSeconds));

  const who = forfeit.side === 'white' ? 'White' : 'Black';
  const name = disconnectedName ?? who;

  return (
    <div
      role="status"
      data-testid="forfeit-countdown"
      className={[
        'rounded-xl border p-3 text-sm shadow-lg shadow-black/30',
        urgent ? 'border-danger/60 bg-danger/15 text-parchment' : 'border-wood-edge bg-surface text-parchment',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold" data-testid="forfeit-who">
            {name} disconnected
          </p>
          <p className="text-xs text-taupe">
            {urgent ? 'Forfeiting' : `${who} forfeits`} in
          </p>
        </div>
        <span
          className={[
            'shrink-0 font-mono text-2xl font-bold tabular-nums',
            urgent ? 'text-danger' : 'text-accent',
          ].join(' ')}
          data-testid="forfeit-remaining"
          aria-live={urgent ? 'assertive' : 'polite'}
        >
          {formatSeconds(secondsLeft)}
        </span>
      </div>

      {/* Progress bar: fills as the grace period elapses. */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/70" aria-hidden>
        <div
          className={['h-full transition-[width] duration-300 ease-linear', urgent ? 'bg-danger' : 'bg-accent'].join(' ')}
          style={{ width: `${Math.round(elapsedRatio * 100)}%` }}
          data-testid="forfeit-progress"
        />
      </div>
    </div>
  );
}
