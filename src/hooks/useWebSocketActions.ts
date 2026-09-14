import { useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketProvider';
import { webSocketService } from '@/services/websocket';
import { useAuthStore } from '@/stores';
import type { ClientMessage } from '@/types';

/**
 * Online-room action helpers.
 *
 * IMPORTANT: every returned function is stable (useCallback) because
 * OnlineGameView passes `joinRoom`/`leaveRoom` into a `useEffect` dependency
 * array. Unstable references used to trigger an infinite join→broadcast→render
 * loop that grew server memory to OOM on Render's free tier.
 */
export function useWebSocketActions() {
  const { send } = useWebSocket();

  const getAuth = useCallback(() => {
    const { userId, username } = useAuthStore.getState();
    return { userId: userId ?? null, username: username ?? null };
  }, []);

  const joinRoom = useCallback(
    (roomId: string) => {
      const { userId, username } = getAuth();
      // Remember for auto-rejoin after a reconnect (seat re-bind).
      webSocketService.setActiveRoom({ roomId, userId, username });
      send({ type: 'join-room', payload: { roomId, userId, username } });
    },
    [send, getAuth]
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      const { userId } = getAuth();
      webSocketService.setActiveRoom(null);
      send({ type: 'leave-room', payload: { roomId, userId } });
    },
    [send, getAuth]
  );

  const makeMove = useCallback(
    (roomId: string, move: unknown) => {
      const { userId } = getAuth();
      send({ type: 'make-move', payload: { roomId, userId, move } });
    },
    [send, getAuth]
  );

  const sendChat = useCallback(
    (roomId: string, text: string) => {
      const { userId, username } = getAuth();
      const message: ClientMessage = {
        type: 'send-chat',
        payload: { roomId, userId, username, text },
      };
      send(message);
    },
    [send, getAuth]
  );

  const resign = useCallback(
    (roomId: string) => {
      const { userId } = getAuth();
      send({ type: 'resign', payload: { roomId, userId } });
    },
    [send, getAuth]
  );

  const offerDraw = useCallback(
    (roomId: string) => {
      const { userId } = getAuth();
      send({ type: 'offer-draw', payload: { roomId, userId } });
    },
    [send, getAuth]
  );

  const respondDraw = useCallback(
    (roomId: string, accepted: boolean) => {
      const { userId } = getAuth();
      send({ type: 'respond-draw', payload: { roomId, userId, accepted } });
    },
    [send, getAuth]
  );

  return { joinRoom, leaveRoom, makeMove, sendChat, resign, offerDraw, respondDraw };
}
