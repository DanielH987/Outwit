// "Server unavailable" messaging: hidden during normal connects and cold
// starts, shown once attempts repeatedly fail, with a retry action.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerUnavailable, UNAVAILABLE_AFTER_FAILURES } from '../components/ServerUnavailable';

// Control the connection state the component reads.
const state = {
  connection: { status: 'closed' as 'connecting' | 'open' | 'closed', failures: 0 },
  retry: vi.fn(),
};

vi.mock('@/contexts/WebSocketProvider', () => ({
  useOptionalWebSocket: () => state,
}));

function setState(status: 'connecting' | 'open' | 'closed', failures: number) {
  state.connection = { status, failures };
  state.retry = vi.fn();
}

describe('ServerUnavailable', () => {
  it('stays hidden while connecting normally', () => {
    setState('connecting', 0);
    render(<ServerUnavailable />);
    expect(screen.queryByTestId('server-unavailable')).not.toBeInTheDocument();
  });

  it('stays hidden during a slow cold start (a few failed attempts)', () => {
    setState('closed', UNAVAILABLE_AFTER_FAILURES - 1);
    render(<ServerUnavailable />);
    expect(screen.queryByTestId('server-unavailable')).not.toBeInTheDocument();
  });

  it('appears once the server is clearly unreachable', () => {
    setState('closed', UNAVAILABLE_AFTER_FAILURES);
    render(<ServerUnavailable />);
    const alert = screen.getByTestId('server-unavailable');
    expect(alert).toHaveTextContent(/Online play is unavailable/i);
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
  });

  it('disappears again when the connection recovers', () => {
    setState('closed', UNAVAILABLE_AFTER_FAILURES);
    const { rerender } = render(<ServerUnavailable />);
    expect(screen.getByTestId('server-unavailable')).toBeInTheDocument();

    setState('open', 0);
    rerender(<ServerUnavailable />);
    expect(screen.queryByTestId('server-unavailable')).not.toBeInTheDocument();
  });

  it('offers a retry that triggers a reconnect', async () => {
    const user = userEvent.setup();
    setState('closed', UNAVAILABLE_AFTER_FAILURES);
    render(<ServerUnavailable />);

    await user.click(screen.getByRole('button', { name: /Try again/i }));
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it('points to local play when asked', () => {
    setState('closed', UNAVAILABLE_AFTER_FAILURES);
    render(<ServerUnavailable showLocalHint />);
    expect(screen.getByRole('link', { name: '/game/local' })).toHaveAttribute('href', '/game/local');
  });

  it('omits the local-play hint by default', () => {
    setState('closed', UNAVAILABLE_AFTER_FAILURES);
    render(<ServerUnavailable />);
    expect(screen.queryByRole('link', { name: '/game/local' })).not.toBeInTheDocument();
  });
});
