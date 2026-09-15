// End-of-game dialog: a center-screen modal so the result is unmissable, with
// a headline tailored to the viewer, the reason, and next-step actions.
//
// Accessibility: real dialog semantics, focus moves into the dialog on open,
// Tab is trapped, Escape and backdrop clicks dismiss (the board stays visible
// behind a translucent backdrop so the final position can be studied).

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import type { GameResult, PlayerId } from '@/engine';
import { resultHeadline, resultReason } from '@/utils/gameResultText';

export interface GameOverDialogProps {
  result: GameResult;
  /** When set, the headline speaks to this player ("You won"). */
  perspective?: PlayerId | null;
  /** Primary action label, e.g. `Play again` / `Back to lobby`. */
  primaryLabel: string;
  onPrimary: () => void;
  /** Secondary dismiss action; usually "view the board". */
  onDismiss: () => void;
  /** Optional extra line under the reason, e.g. the opponent's name. */
  detail?: ReactNode;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function GameOverDialog({
  result,
  perspective = null,
  primaryLabel,
  onPrimary,
  onDismiss,
  detail,
}: GameOverDialogProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog once opened.
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab') return;
      // Simple focus trap: cycle within the dialog.
      const nodes = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onDismiss]
  );

  const headline = resultHeadline(result, perspective);
  const reason = resultReason(result);
  const won = perspective ? result.winner === perspective : result.winner !== null;
  const isDraw = result.winner === null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-[fadeIn_150ms_ease-out]"
      data-testid="game-over-backdrop"
      onClick={(e) => {
        // Backdrop click dismisses; clicks inside the card stop propagation.
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        data-testid="game-over-dialog"
        className="w-full max-w-sm rounded-2xl border border-wood-edge bg-surface p-6 text-center text-parchment shadow-2xl shadow-black/60 motion-safe:animate-[popIn_180ms_ease-out]"
      >
        <p className="mb-1 text-4xl" aria-hidden>
          {isDraw ? '🤝' : won ? '🏆' : '💔'}
        </p>
        <h2 id={titleId} className="text-2xl font-bold" data-testid="game-over-headline">
          {headline}
        </h2>
        {reason && (
          <p className="mt-1 text-sm text-taupe" data-testid="game-over-reason">
            {reason}
          </p>
        )}
        {detail && <div className="mt-2 text-sm text-parchment/90">{detail}</div>}

        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={primaryRef}
            type="button"
            onClick={onPrimary}
            className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-primary transition hover:bg-accent-hover"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-wood-edge px-4 py-2.5 font-semibold transition hover:border-accent hover:text-accent"
          >
            View board
          </button>
        </div>
      </div>
    </div>
  );
}
