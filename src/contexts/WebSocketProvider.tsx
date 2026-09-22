import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { webSocketService, type ConnectionState } from '@/services/websocket';
import { effectiveCountryCode, effectiveDisplayName, useAuthStore, useGameStore } from '@/stores';
import type { ServerMessage } from '@/types';

interface WebSocketContextValue {
  send: typeof webSocketService.send;
  /** Live connection state; drives the "server unavailable" messaging. */
  connection: ConnectionState;
  /** Retry immediately rather than waiting for the next scheduled attempt. */
  retry: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateGameState, addMessage, setActivePlayers, setLastError } = useGameStore();
  const setConnectionId = useAuthStore((s) => s.setConnectionId);
  const [connection, setConnection] = useState<ConnectionState>(() =>
    webSocketService.getConnectionState()
  );

  // `this` is bound and memoized so consumers can pass `send` around without
  // re-creating it each render (which would invalidate every useCallback dep
  // downstream and retrigger effects — see the infinite-join loop).
  const send: WebSocketContextValue['send'] = useMemo(
    () => webSocketService.send.bind(webSocketService),
    []
  );

  const retry = useMemo(() => () => webSocketService.retryNow(), []);

  useEffect(() => {
    const unsubscribeState = webSocketService.onStateChange(setConnection);
    setConnection(webSocketService.getConnectionState());
    return unsubscribeState;
  }, []);

  useEffect(() => {
    const handler = (message: ServerMessage) => {
      switch (message.type) {
        case 'connected':
          // Server-assigned connection id (reassigned each reconnect).
          setConnectionId((message.payload as { userId: string }).userId);
          break;
        case 'game-state':
          // A fresh authoritative state means the server moved on (a player
          // joined, a move landed, etc.) — clear any stale error banner so it
          // doesn't linger after the condition that caused it is resolved.
          updateGameState(message.payload);
          setLastError(null);
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
      const next = { ...active, userId: state.userId, token: state.accessToken, username: effectiveDisplayName(), countryCode: effectiveCountryCode() };
      webSocketService.setActiveRoom(next);
      webSocketService.send({ type: 'join-room', payload: next });
    });
  }, []);

  return (
    <WebSocketContext.Provider value={{ send, connection, retry }}>
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

/**
 * Connection info that is safe to read without a provider. Used by UI that can
 * render anywhere (e.g. `ServerUnavailable`), so it never crashes a page that
 * isn't wired to the socket yet.
 */
export function useOptionalWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  return (
    context ?? {
      send: () => {},
      connection: { status: 'closed', failures: 0 },
      retry: () => {},
    }
  );
}
