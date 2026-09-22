import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface LeaveConfirmDialogProps {
  /** Called when the user confirms they want to leave the ongoing game. */
  onConfirm: () => void;
  /** Called when the user decides to stay and keep playing. */
  onCancel: () => void;
  /** Optional context-specific message (e.g. "You will lose by abandonment"). */
  warning?: string;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * In-app confirmation shown when the player tries to navigate away from an
 * ongoing game. Unlike the browser's generic beforeunload prompt, this can show
 * custom text and offer both "Leave" and "Stay" actions.
 */
export function LeaveConfirmDialog({
  onConfirm,
  onCancel,
  warning = 'You have a game in progress.',
}: LeaveConfirmDialogProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);

  // Focus the "Stay" button by default so a hasty Enter/Space keeps the game alive.
  useEffect(() => {
    stayRef.current?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
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
    [onCancel]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm motion-safe:animate-[fadeIn_150ms_ease-out]"
      data-testid="leave-confirm-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        data-testid="leave-confirm-dialog"
        className="w-full max-w-sm rounded-2xl border border-wood-edge bg-surface p-6 text-center text-parchment shadow-2xl shadow-black/60 motion-safe:animate-[popIn_180ms_ease-out]"
      >
        <p className="mb-1 text-4xl" aria-hidden>
          ⚠️
        </p>
        <h2 id={titleId} className="text-2xl font-bold" data-testid="leave-confirm-title">
          Leave game?
        </h2>
        <p className="mt-2 text-sm text-taupe" data-testid="leave-confirm-warning">
          {warning}
        </p>
        <p className="mt-1 text-sm text-parchment/90">
          Leaving now will abandon the match.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={stayRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg bg-accent px-4 py-2.5 font-semibold text-primary transition hover:bg-accent-hover"
          >
            Stay in game
          </button>
          <button
            type="button"
            onClick={() => {
              // If the caller didn't provide a concrete destination, just
              // close the dialog so the user can keep playing.
              onConfirm();
            }}
            className="rounded-lg border border-wood-edge px-4 py-2.5 font-semibold transition hover:border-danger hover:text-danger"
          >
            Leave anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export interface PendingLeave {
  to: string;
  warning?: string;
}

/**
 * Hook that keeps track of a pending internal navigation and resolves it once
 * the user confirms. If the user cancels, the pending navigation is cleared.
 */
export function usePendingLeave() {
  const [pending, setPending] = useState<PendingLeave | null>(null);
  const navigate = useNavigate();

  const requestLeave = useCallback((to: string, warning?: string) => {
    setPending({ to, warning });
  }, []);

  const confirmLeave = useCallback(() => {
    if (!pending) return;
    const destination = pending.to;
    setPending(null);
    navigate(destination);
  }, [navigate, pending]);

  const cancelLeave = useCallback(() => {
    setPending(null);
  }, []);

  return { pending, requestLeave, confirmLeave, cancelLeave };
}
