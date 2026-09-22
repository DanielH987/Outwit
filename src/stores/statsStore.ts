// Local match-history stats for the profile page. Pass-and-play results only,
// persisted to localStorage. Multiplayer stats will live on the backend later.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameResult, PlayerId } from '@/engine';
import type { ReplayMove } from '@/engine/replay';

export interface LocalMatchRecord {
  /** ISO timestamp when the match ended. */
  finishedAt: string;
  winner: PlayerId | null;
  reason: NonNullable<GameResult['reason']>;
  moveCount: number;
  whiteSeconds: number;
  blackSeconds: number;
  /** Full move list for replay (chipId + from + to per move). */
  moves: ReplayMove[];
}

export const REASON_LABELS: Record<NonNullable<GameResult['reason']>, string> = {
  'base-filled': 'base filled',
  stalemate: 'stalemate',
  agreement: 'draw by agreement',
  repetition: 'threefold repetition',
  resignation: 'resignation',
  forfeit: 'opponent disconnected',
} as const;

interface StatsState {
  matches: LocalMatchRecord[];
  addMatch: (record: LocalMatchRecord) => void;
  clear: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      matches: [],
      addMatch: (record) => set((state) => ({ matches: [...state.matches, record] })),
      clear: () => set({ matches: [] }),
    }),
    {
      name: 'outwit-local-stats',
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') return persisted as StatsState;
        const state = persisted as Partial<StatsState>;
        if (!Array.isArray(state.matches)) return state as StatsState;
        return {
          ...state,
          matches: state.matches.map((m) => ({
            ...m,
            moves: Array.isArray(m.moves) ? m.moves : [],
          })),
        };
      },
    }
  )
);
