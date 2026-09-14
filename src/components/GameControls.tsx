// Status bar + match actions for a local game: turn indicator, result banner,
// draw offer flow, resign, reset.

import type { GameResult, PlayerId } from '@/engine';

interface GameControlsProps {
  result: GameResult;
  sideToMove: PlayerId;
  pendingDrawOfferFrom: PlayerId | null;
  onResign: (player: PlayerId) => void;
  onOfferDraw: (player: PlayerId) => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onReset: () => void;
}

const PLAYER_LABEL: Record<PlayerId, string> = { white: 'White', black: 'Black' };

function resultText(result: GameResult): string | null {
  if (result.status !== 'finished') return null;
  switch (result.reason) {
    case 'base-filled':
      return `${PLAYER_LABEL[result.winner!]} wins! Base filled.`;
    case 'resignation':
      return `${PLAYER_LABEL[result.winner!]} wins by resignation.`;
    case 'forfeit':
      return `${PLAYER_LABEL[result.winner!]} wins — opponent disconnected.`;
    case 'stalemate':
      return 'Draw — stalemate.';
    case 'repetition':
      return 'Draw — threefold repetition.';
    case 'agreement':
      return 'Draw by mutual agreement.';
    default:
      return 'Game over.';
  }
}

export function GameControls({
  result,
  sideToMove,
  pendingDrawOfferFrom,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onReset,
}: GameControlsProps) {
  const finished = result.status === 'finished';
  const message = resultText(result);

  return (
    <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl bg-surface p-4 text-parchment shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-taupe">
          {finished ? 'Game over' : `${PLAYER_LABEL[sideToMove]} to move`}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-wood-edge px-3 py-1 text-xs font-semibold transition hover:border-accent hover:text-accent"
        >
          New local game
        </button>
      </div>

      {message && (
        <p role="status" className="rounded-lg bg-primary px-3 py-2 text-center font-bold text-accent">
          {message}
        </p>
      )}

      {!finished && pendingDrawOfferFrom && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary px-3 py-2 text-sm">
          <span>{PLAYER_LABEL[pendingDrawOfferFrom]} offers a draw.</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={onAcceptDraw}
              className="rounded bg-accent px-3 py-1 font-semibold text-primary transition hover:bg-accent-hover"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onDeclineDraw}
              className="rounded border border-wood-edge px-3 py-1 font-semibold transition hover:border-parchment"
            >
              Decline
            </button>
          </span>
        </div>
      )}

      {!finished && !pendingDrawOfferFrom && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onResign('white')}
            className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-danger hover:text-danger"
          >
            White resigns
          </button>
          <button
            type="button"
            onClick={() => onOfferDraw(sideToMove)}
            className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
            Offer draw
          </button>
          <button
            type="button"
            onClick={() => onResign('black')}
            className="flex-1 rounded-lg border border-wood-edge px-3 py-2 text-sm transition hover:border-danger hover:text-danger"
          >
            Black resigns
          </button>
        </div>
      )}
    </div>
  );
}
