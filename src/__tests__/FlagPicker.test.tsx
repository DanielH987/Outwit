// Flag modal: searchable country grid, pick to save, remove to clear, and
// Escape / backdrop-click to dismiss. The flag is device-wide (guest-friendly).
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlagPicker } from '../components/FlagPicker';
import { useProfileStore } from '../stores/profileStore';

function renderOpen(onClose = vi.fn()) {
  const utils = render(<FlagPicker open onClose={onClose} />);
  return { ...utils, onClose };
}

describe('FlagPicker modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<FlagPicker open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the searchable grid and picks a country to save', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen();
    expect(screen.getByRole('dialog', { name: /Where are you from/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search countries'), 'kingdom');
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /United Kingdom/i }));

    expect(useProfileStore.getState().countryCode).toBe('GB');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters to no-match state', async () => {
    const user = userEvent.setup();
    renderOpen();
    await user.type(screen.getByLabelText('Search countries'), 'zzzzz');
    expect(screen.getByText(/No countries match/i)).toBeInTheDocument();
  });

  it('removes the current flag', async () => {
    useProfileStore.setState({ countryCode: 'FR' });
    const user = userEvent.setup();
    const { onClose } = renderOpen();
    await user.click(screen.getByRole('button', { name: /Remove flag/i }));
    expect(useProfileStore.getState().countryCode).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOpen();
    await user.click(screen.getByTestId('flag-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
