import type { ClientMessage, ServerMessage } from '@/types';

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
}

interface ImportMetaWithEnv extends ImportMeta {
  readonly env: ImportMetaEnv;
}

const WS_URL = (import.meta as unknown as ImportMetaWithEnv).env.VITE_WS_URL ?? 'wss://localhost:3001';

type MessageHandler = (message: ServerMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(WS_URL);

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handlers.forEach((handler) => handler(message));
    };

    this.socket.onclose = () => {
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }
}

export const webSocketService = new WebSocketService();
