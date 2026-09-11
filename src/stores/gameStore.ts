import { create } from 'zustand';
import type { GameRoom, Player, ChatMessage } from '@/types';

interface GameState {
  currentRoom: GameRoom | null;
  gameState: unknown | null;
  messages: ChatMessage[];
  activePlayers: Player[];
  setCurrentRoom: (room: GameRoom | null) => void;
  updateGameState: (state: unknown) => void;
  addMessage: (message: ChatMessage) => void;
  setActivePlayers: (players: Player[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentRoom: null,
  gameState: null,
  messages: [],
  activePlayers: [],
  setCurrentRoom: (room) => set({ currentRoom: room }),
  updateGameState: (state) => set({ gameState: state }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setActivePlayers: (players) => set({ activePlayers: players }),
  reset: () =>
    set({ currentRoom: null, gameState: null, messages: [], activePlayers: [] }),
}));
