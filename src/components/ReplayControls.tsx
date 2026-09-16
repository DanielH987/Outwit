// Replay controls (chess.com-style): step backward/forward through the move
// history, jump to the start/end, or scrub with a slider. Purely client-side —
// replay never touches the game state, sends a message, or affects the result.
//
// Keyboard: ← / → step, Home / End jump, Escape exits replay mode.

import { useEffect } from 'react';

interface ReplayControlsProps {
  /** Index of the move being viewed (-1 = before the first move). */
  current: number;
  /** Total number of moves played. */
  total: number;
  onChange: (index: number) => void;
  /** Leave replay and return to the live position. */
  onExit: () => void;
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/** Chevron with a bar: jump to the very first / very latest position. */
function SkipIcon({ toEnd, className }: { toEnd?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {toEnd ? (
        <>
          <path d="M7 6l6 6-6 6" />
          <path d="M17 6v12" />
        </>
      ) : (
        <>
          <path d="M17 6l-6 6 6 6" />
          <path d="M7 6v12" />
        </>
      )}
    </svg>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 flex-1 items-center justify-center rounded-lg border border-wood-edge text-parchment transition hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-wood-edge disabled:hover:text-parchment"
    >
      {children}
    </button>
  );
}

export function ReplayControls({ current, total, onChange, onExit }: ReplayControlsProps) {
  const atStart = current <= -1;
  const atEnd = current >= total - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onChange(Math.max(-1, current - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onChange(Math.min(total - 1, current + 1));
      } else if (event.key === 'Home') {
        event.preventDefault();
        onChange(-1);
      } else if (event.key === 'End') {
        event.preventDefault();
        onChange(total - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, total, onChange, onExit]);

  const label = current < 0 ? 'Starting position' : `Move ${current + 1} of ${total}`;

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-xl border border-accent/40 bg-surface p-3 text-sm text-parchment shadow-lg shadow-black/30"
      data-testid="replay-controls"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold" data-testid="replay-label">
          Reviewing: {label}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-wood-edge px-2 py-1 text-xs font-semibold transition hover:border-accent hover:text-accent"
        >
          Exit
        </button>
      </div>

      <div className="flex gap-1.5">
        <ControlButton label="First move" onClick={() => onChange(-1)} disabled={atStart}>
          <SkipIcon className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Previous move" onClick={() => onChange(Math.max(-1, current - 1))} disabled={atStart}>
          <ChevronIcon className="h-4 w-4" />
        </ControlButton>
        <ControlButton label="Next move" onClick={() => onChange(Math.min(total - 1, current + 1))} disabled={atEnd}>
          <ChevronIcon className="h-4 w-4 rotate-180" />
        </ControlButton>
        <ControlButton label="Latest move" onClick={() => onChange(total - 1)} disabled={atEnd}>
          <SkipIcon toEnd className="h-4 w-4" />
        </ControlButton>
      </div>

      <label className="sr-only" htmlFor="replay-slider">Move position</label>
      <input
        id="replay-slider"
        type="range"
        min={-1}
        max={total - 1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </div>
  );
}
