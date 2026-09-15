// Account card: two clearly separated sign-in options (Google primary, email
// magic link secondary), signed-in state, and guest-only hiding.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountCard } from '../components/AccountCard';
import { useAuthStore } from '../stores/authStore';

// `authEnabled` is derived from env vars at module load; mock the services so
// the card renders its enabled state, and mock the provider's availability.
vi.mock('@/contexts/AccountProvider', () => ({
  useAccount: () => ({ available: true, ready: true }),
}));

const signInWithGoogle = vi.fn().mockResolvedValue({ error: null });
const signInWithMagicLink = vi.fn().mockResolvedValue({ error: null });
const signOut = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/account', () => ({
  signInWithGoogle: (...args: unknown[]) => signInWithGoogle(...args),
  signInWithMagicLink: (...args: unknown[]) => signInWithMagicLink(...args),
  signOut: (...args: unknown[]) => signOut(...args),
}));

describe('AccountCard', () => {
  beforeEach(() => {
    signInWithGoogle.mockClear();
    signInWithMagicLink.mockClear();
    signOut.mockClear();
    useAuthStore.setState({ isAuthenticated: false, email: null, accountId: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows both sign-in options as separate labelled actions', () => {
    render(<AccountCard />);
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Email me a link/i })).toBeInTheDocument();
    // The divider communicates they are alternatives, not steps.
    expect(screen.getByText('or')).toBeInTheDocument();
  });

  it('uses Google as the primary one-click action', async () => {
    const user = userEvent.setup();
    render(<AccountCard />);
    await user.click(screen.getByRole('button', { name: /Continue with Google/i }));
    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(signInWithMagicLink).not.toHaveBeenCalled();
  });

  it('submits the email form and shows confirmation', async () => {
    const user = userEvent.setup();
    render(<AccountCard />);
    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /Email me a link/i }));
    expect(signInWithMagicLink).toHaveBeenCalledWith('player@example.com');
    expect(await screen.findByText(/Check your email for a sign-in link/i)).toBeInTheDocument();
  });

  it('keeps the email action disabled until an address is typed', async () => {
    const user = userEvent.setup();
    render(<AccountCard />);
    const emailButton = screen.getByRole('button', { name: /Email me a link/i });
    expect(emailButton).toBeDisabled();
    await user.type(screen.getByLabelText('Email'), 'a');
    expect(emailButton).toBeEnabled();
  });

  it('surfaces service errors', async () => {
    signInWithMagicLink.mockResolvedValueOnce({ error: 'Rate limited' });
    const user = userEvent.setup();
    render(<AccountCard />);
    await user.type(screen.getByLabelText('Email'), 'player@example.com');
    await user.click(screen.getByRole('button', { name: /Email me a link/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Rate limited');
  });

  it('shows the signed-in state with a sign-out action and no sign-in options', async () => {
    useAuthStore.setState({ isAuthenticated: true, email: 'me@example.com' });
    const user = userEvent.setup();
    render(<AccountCard />);
    expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with Google/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
