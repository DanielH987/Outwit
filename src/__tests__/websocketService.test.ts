// Regression tests for the online-play bugs fixed 2026-09-14:
// 1. Messages sent before the socket opens must be queued and flushed.
// 2. Reconnect must re-send join-room exactly once (seat re-bind), even if a
//    join was queued before the first open.
// 3. disconnect() clears state and stops reconnecting.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocketService } from '../services/websocket';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

describe('WebSocketService', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('queues messages sent before the socket opens and flushes them on open', () => {
    const service = new WebSocketService();
    service.connect();

    service.send({ type: 'join-room', payload: { roomId: 'r1', userId: 'u1', username: null } });
    const socket = FakeWebSocket.instances[0];
    expect(socket.sent).toHaveLength(0);

    socket.open();
    expect(socket.sent).toHaveLength(1);
    expect(JSON.parse(socket.sent[0])).toMatchObject({ type: 'join-room' });
  });

  it('re-sends join-room exactly once after a reconnect (no duplicate from queue + rejoin)', () => {
    vi.useFakeTimers();
    const service = new WebSocketService();
    service.connect();

    // Join while connecting: goes to the queue.
    service.setActiveRoom({ roomId: 'r1', userId: 'u1', username: null });
    service.send({ type: 'join-room', payload: { roomId: 'r1', userId: 'u1', username: null } });
    const first = FakeWebSocket.instances[0];
    first.open();

    // Queue join + activeRoom rejoin must not double-send.
    const joinsFirst = first.sent.filter((m) => JSON.parse(m).type === 'join-room');
    expect(joinsFirst).toHaveLength(1);

    // Socket drops; reconnect after the backoff.
    first.readyState = FakeWebSocket.CLOSED;
    first.onclose?.();
    vi.advanceTimersByTime(3000);
    const second = FakeWebSocket.instances[1];
    second.open();

    const joinsSecond = second.sent.filter((m) => JSON.parse(m).type === 'join-room');
    expect(joinsSecond).toHaveLength(1);
    expect(JSON.parse(joinsSecond[0]).payload).toMatchObject({ roomId: 'r1', userId: 'u1' });
  });

  it('clears the active room on disconnect and stops reconnecting', () => {
    vi.useFakeTimers();
    const service = new WebSocketService();
    service.connect();
    const socket = FakeWebSocket.instances[0];
    socket.open();
    service.setActiveRoom({ roomId: 'r1', userId: 'u1', username: null });

    service.disconnect();
    socket.onclose?.();
    vi.advanceTimersByTime(10_000);

    expect(FakeWebSocket.instances).toHaveLength(1);

    // New connection after disconnect should not auto-rejoin the old room.
    service.connect();
    const fresh = FakeWebSocket.instances[1];
    fresh.open();
    expect(fresh.sent.filter((m) => JSON.parse(m).type === 'join-room')).toHaveLength(0);
  });
});
