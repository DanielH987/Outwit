import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { webSocketService } from '@/services/websocket';
import { useGameStore } from '@/stores';
import type { ServerMessage } from '@/types';

interface WebSocketContextValue {
  send: typeof webSocketService.send;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { updateGameState, addMessage, setActivePlayers } = useGameStore();

  useEffect(() => {
    const handler = (message: ServerMessage) => {
      switch (message.type) {
        case 'game-state':
          updateGameState(message.payload);
          break;
        case 'chat-message':
          addMessage(message.payload as never);
          break;
        case 'room-update':
          setActivePlayers((message.payload as { players: never }).players);
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
  }, [updateGameState, addMessage, setActivePlayers]);

  return (
    <WebSocketContext.Provider value={{ send: webSocketService.send }}>
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
