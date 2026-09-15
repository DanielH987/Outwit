import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { webSocketService } from '@/services/websocket';
import { effectiveDisplayName, useAuthStore, useGameStore } from '@/stores';
import type { ServerMessage } from '@/types';

interface WebSocketContextValue {
  send: typeof webSocketService.send;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateGameState, addMessage, setActivePlayers, setLastError } = useGameStore();
  const setConnectionId = useAuthStore((s) => s.setConnectionId);

  // `this` is bound and memoized so consumers can pass `send` around without
  // re-creating it each render (which would invalidate every useCallback dep
  // downstream and retrigger effects — see the infinite-join loop).
  const send: WebSocketContextValue['send'] = useMemo(
    () => webSocketService.send.bind(webSocketService),
    []
  );

  useEffect(() => {
    const handler = (message: ServerMessage) => {
      switch (message.type) {
        case 'connected':
          // Server-assigned connection id (reassigned each reconnect).
          setConnectionId((message.payload as { userId: string }).userId);
          break;
        case 'game-state':
          updateGameState(message.payload);
          break;
        case 'chat-message':
          addMessage(message.payload as never);
          break;
        case 'room-update':
          setActivePlayers((message.payload as { players: never }).players);
          break;
        case 'error':
          setLastError((message.payload as { message: string }).message);
          break;
        default:
          break;
      }
    };

    webSocketService.connect();
    const unsubscribe = webSocketService.onMessage(handler);

    return () => {
      unsubscribe();
      webSocketService.disconnect();
    };
  }, [updateGameState, addMessage, setActivePlayers, setLastError, setConnectionId]);

  // Sign-in/out changes the seat id. Re-bind only while waiting for an opponent
  // (≤1 player) — never yank a seat out of a game in progress; the new identity
  // then applies to the next room join.
  useEffect(() => {
    return useAuthStore.subscribe((state, prev) => {
      if (state.userId === prev.userId) return;
      const active = webSocketService.getActiveRoom();
      if (!active) return;
      const players = useGameStore.getState().gameState?.players.length ?? 0;
      if (players >= 2) return;
      const next = { ...active, userId: state.userId, token: state.accessToken, username: effectiveDisplayName() };
      webSocketService.setActiveRoom(next);
      webSocketService.send({ type: 'join-room', payload: next });
    });
  }, []);

  return (
    <WebSocketContext.Provider value={{ send }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
