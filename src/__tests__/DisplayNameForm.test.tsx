// Display-name settings form (lives on the Profile page, chess.com-style).
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisplayNameForm } from '../components/DisplayNameForm';
import { useProfileStore } from '../stores/profileStore';

describe('DisplayNameForm', () => {
  beforeEach(() => {
    useProfileStore.setState({ displayName: null, guestName: null });
  });

  it('shows the guest name when no explicit name is set', () => {
    render(<DisplayNameForm />);
    expect(screen.getByText(/You're playing as/i)).toBeInTheDocument();
    expect(screen.getByText(/Guest \d{4}/)).toBeInTheDocument();
    expect(screen.getByText(/until you set one/i)).toBeInTheDocument();
  });

  it('saves a valid name and confirms it', async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm />);
    await user.type(screen.getByLabelText('Display name', { selector: 'input' }), 'Alice');
    await user.click(screen.getByRole('button', { name: /Save name/i }));

    expect(useProfileStore.getState().displayName).toBe('Alice');
    expect(screen.getByRole('status')).toHaveTextContent(/You'll play as Alice/i);
  });

  it('rejects an invalid name without storing it', async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm />);
    await user.type(screen.getByLabelText('Display name', { selector: 'input' }), 'x');
    await user.click(screen.getByRole('button', { name: /Save name/i }));

    expect(useProfileStore.getState().displayName).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/2–20 characters/i);
  });

  it('keeps Save disabled until something is typed', async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm />);
    const save = screen.getByRole('button', { name: /Save name/i });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Display name', { selector: 'input' }), 'A');
    expect(save).toBeEnabled();
  });

  it('updates the summary after saving', async () => {
    const user = userEvent.setup();
    render(<DisplayNameForm />);
    await user.type(screen.getByLabelText('Display name', { selector: 'input' }), 'Bob');
    await user.click(screen.getByRole('button', { name: /Save name/i }));
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/until you set one/i)).not.toBeInTheDocument();
  });
});
