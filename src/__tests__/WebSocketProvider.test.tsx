// WebSocketProvider message handling: an error banner set by the server must
// clear when the next authoritative game-state arrives (e.g. the opponent
// joins after a "Waiting for a second player" error), instead of lingering
// until a page reload.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { WebSocketProvider } from '../contexts/WebSocketProvider';
import { webSocketService } from '../services/websocket';
import { useAuthStore, useGameStore } from '../stores';

vi.mock('@/services/websocket', () => {
  const handlers: Array<(m: unknown) => void> = [];
  const stateHandlers: Array<(s: unknown) => void> = [];
  return {
    webSocketService: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      onMessage: vi.fn((h: unknown) => {
        handlers.push(h as never);
        return () => {};
      }),
      onStateChange: vi.fn((h: unknown) => {
        stateHandlers.push(h as never);
        return () => {};
      }),
      getConnectionState: vi.fn(() => ({ status: 'open', failures: 0 })),
      getActiveRoom: vi.fn(() => null),
      setActiveRoom: vi.fn(),
      send: vi.fn(),
      // Test hooks to drive the mocked service.
      __emit: (message: unknown) => handlers.forEach((h) => (h as (m: unknown) => void)(message)),
      __setState: (state: unknown) => stateHandlers.forEach((h) => (h as (s: unknown) => void)(state)),
    },
  };
});

describe('WebSocketProvider error clearing', () => {
  afterEach(() => {
    useGameStore.getState().reset();
  });

  it('clears lastError when a game-state arrives after an error', async () => {
    useAuthStore.setState({ userId: 'u1', isAuthenticated: false });
    await act(async () => {
      render(<WebSocketProvider><div /></WebSocketProvider>);
    });

    const emit = (webSocketService as unknown as { __emit: (m: unknown) => void }).__emit;

    // 1. Server rejects a move while alone in the room.
    await act(async () => {
      emit({ type: 'error', payload: { message: 'Waiting for a second player.' } });
    });
    expect(useGameStore.getState().lastError).toBe('Waiting for a second player.');

    // 2. The opponent joins: the server broadcasts a fresh game-state.
    await act(async () => {
      emit({
        type: 'game-state',
        payload: {
          roomId: 'r1',
          board: { chips: [], sideToMove: 'white' },
          players: [
            { userId: 'u1', username: 'A', side: 'white', connected: true },
            { userId: 'u2', username: 'B', side: 'black', connected: true },
          ],
          moveHistory: [],
          result: { status: 'in-progress', winner: null, reason: null },
          pendingDrawFrom: null,
          forfeit: null,
        },
      });
    });

    // The stale banner is gone without any page reload.
    expect(useGameStore.getState().lastError).toBeNull();
    expect(useGameStore.getState().gameState?.players).toHaveLength(2);
  });
});
