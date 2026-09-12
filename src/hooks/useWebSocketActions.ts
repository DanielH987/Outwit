import { useWebSocket } from '@/contexts/WebSocketProvider';
import { useAuthStore } from '@/stores';
import type { ClientMessage } from '@/types';

export function useWebSocketActions() {
  const { send } = useWebSocket();
  const { userId, username } = useAuthStore();

  const joinRoom = (roomId: string) => {
    send({ type: 'join-room', payload: { roomId, userId, username } });
  };

  const leaveRoom = (roomId: string) => {
    send({ type: 'leave-room', payload: { roomId, userId } });
  };

  const makeMove = (roomId: string, move: unknown) => {
    send({ type: 'make-move', payload: { roomId, userId, move } });
  };

  const sendChat = (roomId: string, text: string) => {
    const message: ClientMessage = {
      type: 'send-chat',
      payload: { roomId, userId, username, text },
    };
    send(message);
  };

  const resign = (roomId: string) => {
    send({ type: 'resign', payload: { roomId, userId } });
  };

  const offerDraw = (roomId: string) => {
    send({ type: 'offer-draw', payload: { roomId, userId } });
  };

  const respondDraw = (roomId: string, accepted: boolean) => {
    send({ type: 'respond-draw', payload: { roomId, userId, accepted } });
  };

  return { joinRoom, leaveRoom, makeMove, sendChat, resign, offerDraw, respondDraw };
}
