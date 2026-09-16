import type { ClientMessage, JoinRoomPayload, ServerMessage } from '@/types';

const raw: string | undefined = import.meta.env?.VITE_WS_URL as string | undefined;
// Default for local dev; production sets VITE_WS_URL (build-time).
// Strip trailing slashes; append /ws once (accept values with or without it).
const base = (raw && raw.length > 0 ? raw : 'ws://localhost:3001').replace(/\/+$/, '');
const WS_URL = base.endsWith('/ws') ? base : `${base}/ws`;

type MessageHandler = (message: ServerMessage) => void;

/** Observable connection state so the UI can explain outages instead of hanging. */
export interface ConnectionState {
  status: 'connecting' | 'open' | 'closed';
  /** Consecutive failed attempts; reset on a successful open. */
  failures: number;
}

type ConnectionStateHandler = (state: ConnectionState) => void;

const MAX_QUEUED = 50;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private stateHandlers: ConnectionStateHandler[] = [];
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  /** Messages sent before the socket opens; flushed on open. */
  private queue: ClientMessage[] = [];
  /** Last joined room; re-sent on reconnect so the server re-binds our seat. */
  private activeRoom: JoinRoomPayload | null = null;
  private manuallyClosed = false;
  private state: ConnectionState = { status: 'closed', failures: 0 };

  private setState(next: Partial<ConnectionState>) {
    this.state = { ...this.state, ...next };
    this.stateHandlers.forEach((handler) => handler(this.state));
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  connect() {
    this.manuallyClosed = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setState({ status: 'connecting' });

    try {
      this.socket = new WebSocket(WS_URL);
    } catch {
      this.setState({ status: 'closed', failures: this.state.failures + 1 });
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.setState({ status: 'open', failures: 0 });
      const pending = this.queue;
      this.queue = [];
      for (const message of pending) {
        // Skip queued joins; the activeRoom rejoin below supersedes them.
        if (this.activeRoom && message.type === 'join-room') continue;
        this.rawSend(message);
      }
      if (this.activeRoom) {
        this.rawSend({ type: 'join-room', payload: this.activeRoom });
      }
    };

    this.socket.onmessage = (event) => {
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      // App-level heartbeat: answer immediately so the server knows we're alive.
      // (WS-level ping/pong control frames do not survive Render's proxy.)
      if (message.type === 'ping') {
        this.rawSend({ type: 'pong', payload: {} });
        return;
      }
      this.handlers.forEach((handler) => handler(message));
    };

    this.socket.onclose = () => {
      // A close before opening counts as a failed attempt (server down, 503,
      // network error, cold start timeout). Reset by `onopen`.
      if (this.state.status !== 'open') {
        this.setState({ status: 'closed', failures: this.state.failures + 1 });
      } else {
        this.setState({ status: 'closed' });
      }
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
  }

  /** Retry immediately instead of waiting for the reconnect timer. */
  retryNow() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.socket?.close();
    this.socket = null;
    this.connect();
  }

  disconnect() {
    this.manuallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.socket?.close();
    this.socket = null;
    this.queue = [];
    this.activeRoom = null;
  }

  /** Remember the active room so a reconnect re-binds the same seat. */
  setActiveRoom(payload: JoinRoomPayload | null) {
    this.activeRoom = payload;
  }

  /** The room this client is currently bound to (for identity-change rejoins). */
  getActiveRoom(): JoinRoomPayload | null {
    return this.activeRoom;
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.rawSend(message);
      return;
    }
    // Socket not open yet (first load or mid-reconnect): queue it.
    if (this.queue.length < MAX_QUEUED) this.queue.push(message);
    this.connect();
  }

  private rawSend(message: ClientMessage) {
    try {
      this.socket?.send(JSON.stringify(message));
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

  /** Subscribe to connection-state changes (for "server unavailable" UI). */
  onStateChange(handler: ConnectionStateHandler) {
    this.stateHandlers.push(handler);
    return () => {
      this.stateHandlers = this.stateHandlers.filter((h) => h !== handler);
    };
  }
}

export const webSocketService = new WebSocketService();
