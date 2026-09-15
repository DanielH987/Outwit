// Waiting-for-opponent invite card: shows the code, copies the link, and
// degrades gracefully when the clipboard API is unavailable.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitingForOpponent } from '../components/WaitingForOpponent';

/** Replace only navigator.clipboard so user-event keeps working. */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

describe('WaitingForOpponent', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    vi.restoreAllMocks();
  });

  it('shows the room code and the full invite link', () => {
    render(<WaitingForOpponent roomId="K7M2QP" />);
    expect(screen.getByText('K7M2QP')).toBeInTheDocument();
    expect(screen.getByLabelText('Invite link')).toHaveValue(`${window.location.origin}/game/K7M2QP`);
  });

  it('copies the link and shows Copied feedback', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    render(<WaitingForOpponent roomId="K7M2QP" />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/game/K7M2QP`);
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('stays usable when the clipboard write fails', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    stubClipboard(writeText);

    render(<WaitingForOpponent roomId="K7M2QP" />);
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    // No crash, no "Copied" state; the read-only input remains selectable.
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByLabelText('Invite link')).toHaveAttribute('readonly');
  });
});
