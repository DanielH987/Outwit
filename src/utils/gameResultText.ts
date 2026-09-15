// Shared game-result wording used by the in-game banner (GameControls) and the
// end-of-game dialog. Keeping both here avoids the two drifting apart.

import type { GameResult, PlayerId } from '@/engine';

const PLAYER_LABEL: Record<PlayerId, string> = { white: 'White', black: 'Black' };

/** Full sentence for the always-visible status banner. */
export function resultDescription(result: GameResult): string | null {
  if (result.status !== 'finished') return null;
  const winner = result.winner ? PLAYER_LABEL[result.winner] : null;
  switch (result.reason) {
    case 'base-filled':
      return `${winner} wins! Base filled.`;
    case 'resignation':
      return `${winner} wins by resignation.`;
    case 'forfeit':
      return `${winner} wins — opponent disconnected.`;
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

/**
 * Short headline for the dialog. With a perspective (online play) it speaks to
 * the viewer ("You won"); without one (pass-and-play, spectators) it names the
 * winner instead.
 */
export function resultHeadline(result: GameResult, perspective?: PlayerId | null): string {
  if (result.status !== 'finished') return '';
  if (result.winner === null) return 'Draw';
  if (perspective === 'white' || perspective === 'black') {
    return result.winner === perspective ? 'You won' : 'You lost';
  }
  return `${PLAYER_LABEL[result.winner]} won`;
}

/** Short reason phrase, e.g. `By resignation`, `Base filled`. */
export function resultReason(result: GameResult): string | null {
  if (result.status !== 'finished') return null;
  switch (result.reason) {
    case 'base-filled':
      return 'Base filled';
    case 'resignation':
      return 'By resignation';
    case 'forfeit':
      return 'Opponent disconnected';
    case 'stalemate':
      return 'Stalemate';
    case 'repetition':
      return 'Threefold repetition';
    case 'agreement':
      return 'By agreement';
    default:
      return null;
  }
}
