// Shared replay hook for reviewing move history. Extracted from GamePage so
// the profile replay modal can reuse the same logic.
//
// `-1` means "before any move"; otherwise the index of the move being viewed.
// `null` means replay is off (live position).

import { useEffect, useState } from 'react';
import type { MoveRecord } from '@/stores/localGameStore';

export function useReplay(moveHistory: MoveRecord[]) {
  const [index, setIndex] = useState<number | null>(null);

  // Leaving/shrinking the history (new game, reset) exits replay.
  useEffect(() => {
    setIndex((current) => {
      if (current === null) return null;
      if (moveHistory.length === 0) return null;
      return Math.min(current, moveHistory.length - 1);
    });
  }, [moveHistory.length]);

  const isReplaying = index !== null;

  return {
    isReplaying,
    index,
    start: () => setIndex(Math.max(0, moveHistory.length - 1)),
    exit: () => setIndex(null),
    goTo: (next: number) => setIndex(Math.max(-1, Math.min(next, moveHistory.length - 1))),
  };
}