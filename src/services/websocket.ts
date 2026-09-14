import type { ClientMessage, ServerMessage } from '@/types';

const raw: string | undefined = import.meta.env?.VITE_WS_URL as string | undefined;
// Default for local dev; production sets VITE_WS_URL (build-time).
// Strip trailing slashes; append /ws once (accept values with or without it).
const base = (raw && raw.length > 0 ? raw : 'ws://localhost:3001').replace(/\/+$/, '');
const WS_URL = base.endsWith('/ws') ? base : `${base}/ws`;

type MessageHandler = (message: ServerMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    try {
      this.socket = new WebSocket(WS_URL);
    } catch {
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      return;
    }

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
    try {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
      }
    } catch {
      // Drop the message rather than crash if the socket is mid-teardown.
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
