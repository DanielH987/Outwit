import { create } from 'zustand';
import type { ChatMessage, GameRoom, GameStatePayload, Player } from '@/types';

interface GameState {
  currentRoom: GameRoom | null;
  gameState: GameStatePayload | null;
  selectedChipId: string | null;
  lastError: string | null;
  messages: ChatMessage[];
  activePlayers: Player[];
  setCurrentRoom: (room: GameRoom | null) => void;
  updateGameState: (state: unknown) => void;
  /** Selection state for local-style highlighting on the online board. */
  setSelectedChip: (chipId: string | null) => void;
  setLastError: (message: string | null) => void;
  addMessage: (message: ChatMessage) => void;
  setActivePlayers: (players: Player[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentRoom: null,
  gameState: null,
  selectedChipId: null,
  lastError: null,
  messages: [],
  activePlayers: [],
  setCurrentRoom: (room) => set({ currentRoom: room }),
  updateGameState: (state) => set({ gameState: state as GameStatePayload }),
  setSelectedChip: (chipId) => set({ selectedChipId: chipId }),
  setLastError: (message) => set({ lastError: message }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setActivePlayers: (players) => set({ activePlayers: players }),
  reset: () =>
    set({
      currentRoom: null,
      gameState: null,
      selectedChipId: null,
      lastError: null,
      messages: [],
      activePlayers: [],
    }),
}));
