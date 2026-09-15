import { useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketProvider';
import { webSocketService } from '@/services/websocket';
import { effectiveDisplayName, useAuthStore } from '@/stores';
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
    const { userId, accessToken } = useAuthStore.getState();
    // Display name comes from profileStore (device-wide); falls back to a
    // generated Guest name when the player never set one. The access token is
    // present only when signed in; the server verifies it and derives our seat.
    return { userId: userId ?? null, username: effectiveDisplayName(), token: accessToken };
  }, []);

  const joinRoom = useCallback(
    (roomId: string) => {
      const { userId, username, token } = getAuth();
      // Remember for auto-rejoin after a reconnect (seat re-bind).
      webSocketService.setActiveRoom({ roomId, userId, username, token });
      send({ type: 'join-room', payload: { roomId, userId, username, token } });
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
