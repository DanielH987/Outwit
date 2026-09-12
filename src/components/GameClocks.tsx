// Elapsed-time clocks for local play. Counts up for the side to move;
// informational only (no lose-on-time rule — docs/RULES.md has none).

import { useEffect } from 'react';
import type { PlayerId } from '@/engine';
import { useLocalGameStore } from '@/stores';

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface ClockBadgeProps {
  player: PlayerId;
  isActive: boolean;
}

function ClockBadge({ player, isActive }: ClockBadgeProps) {
  const label = player === 'white' ? 'White' : 'Black';
  const seconds = useLocalGameStore((s) => s.elapsedSeconds[player]);
  return (
    <div
      data-testid={`clock-${player}`}
      className={[
        'flex flex-col items-center gap-1 rounded-lg px-4 py-2 font-mono',
        isActive ? 'bg-accent text-primary' : 'bg-primary text-slate-300',
      ].join(' ')}
    >
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-xl tabular-nums">{formatClock(seconds)}</span>
    </div>
  );
}

/** Runs the per-second timer and shows both clocks. */
export function GameClocks() {
  const result = useLocalGameStore((s) => s.result);
  const sideToMove = useLocalGameStore((s) => s.state.sideToMove);
  const inProgress = result.status === 'in-progress';

  useEffect(() => {
    if (!inProgress) return;
    const id = setInterval(() => useLocalGameStore.getState().tick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inProgress]);

  return (
    <div className="flex w-full max-w-lg justify-between gap-4">
      <ClockBadge player="white" isActive={inProgress && sideToMove === 'white'} />
      <ClockBadge player="black" isActive={inProgress && sideToMove === 'black'} />
    </div>
  );
}
