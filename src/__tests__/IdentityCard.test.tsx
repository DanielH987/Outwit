// IdentityCard: the public face (flag + one name) is the header. Clicking the
// name opens the editor inline — username for signed-in accounts, display name
// for guests. Clicking the flag opens the modal. Account sign-in is the footer.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IdentityCard } from '../components/IdentityCard';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';

vi.mock('@/contexts/AccountProvider', () => ({
  useAccount: () => ({ available: true, ready: true }),
}));

vi.mock('@/services/account', () => ({
  signInWithGoogle: vi.fn().mockResolvedValue({ error: null }),
  signInWithMagicLink: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/profile', () => ({
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  normalizeUsername: (raw: string) => {
    const u = raw.trim();
    return u.length >= 3 && u.length <= 20 && /^[A-Za-z0-9_]+$/.test(u) ? u : null;
  },
  fetchMyProfile: vi.fn().mockResolvedValue({ id: 'u1', username: null }),
  claimUsername: vi.fn().mockResolvedValue({ error: null }),
}));

describe('IdentityCard', () => {
  beforeEach(() => {
    useProfileStore.setState({ accountUsername: null, displayName: null, guestName: null, countryCode: null });
    useAuthStore.setState({ isAuthenticated: false, accountId: null, email: null });
  });

  it('shows the guest name with the flag inline in the header', () => {
    useProfileStore.getState().setDisplayName('Alice');
    useProfileStore.getState().setCountryCode('US');
    render(<IdentityCard />);
    expect(screen.getByTestId('identity-name')).toHaveTextContent('Alice');
    expect(screen.getByTestId('country-flag')).toHaveTextContent('🇺🇸');
    expect(screen.getByText(/This device-wide name is shown to your opponent/i)).toBeInTheDocument();
  });

  it('shows the account username in the header when signed in', () => {
    useAuthStore.setState({ isAuthenticated: true, accountId: 'u1', email: 'a@b.com' });
    useProfileStore.getState().setAccountUsername('alice');
    render(<IdentityCard />);
    expect(screen.getByTestId('identity-name')).toHaveTextContent('alice');
    expect(screen.getByText(/Your unique username is your name everywhere you play/i)).toBeInTheDocument();
  });

  it('adds a flag via the name editor (no header placeholder)', async () => {
    const user = userEvent.setup();
    render(<IdentityCard />);
    // No flag button in the header when unset — only the name.
    expect(screen.queryByRole('button', { name: 'Edit flag' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open the name editor (guest path) and add a flag from there.
    await user.click(screen.getByRole('button', { name: 'Edit name' }));
    await user.click(screen.getByRole('button', { name: /Add flag/i }));
    expect(screen.getByRole('dialog', { name: /Where are you from/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Search countries'), 'states');
    await user.click(screen.getByRole('button', { name: /United States/i }));
    expect(useProfileStore.getState().countryCode).toBe('US');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The flag now shows in the header (and the modal picker closed back to name editing).
    expect(screen.getAllByTestId('country-flag').length).toBeGreaterThan(0);
  });

  it('opens the flag modal from the header once a flag is set', async () => {
    useProfileStore.getState().setCountryCode('FR');
    const user = userEvent.setup();
    render(<IdentityCard />);
    expect(screen.getByTestId('country-flag')).toHaveTextContent('🇫🇷');

    await user.click(screen.getByRole('button', { name: 'Edit flag' }));
    expect(screen.getByRole('dialog', { name: /Where are you from/i })).toBeInTheDocument();
  });

  it('opens the display-name editor for guests from the header', async () => {
    const user = userEvent.setup();
    render(<IdentityCard />);
    expect(screen.queryByTestId('display-name-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit name' }));
    expect(screen.getByTestId('display-name-form')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Display name', { selector: 'input' }), 'Alice');
    await user.click(screen.getByRole('button', { name: /Save name/i }));
    expect(screen.getByTestId('identity-name')).toHaveTextContent('Alice');
  });

  it('opens the username editor for signed-in accounts from the header', async () => {
    useAuthStore.setState({ isAuthenticated: true, accountId: 'u1', email: 'a@b.com' });
    const user = userEvent.setup();
    render(<IdentityCard />);
    expect(screen.queryByTestId('username-form')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit username' }));
    expect(screen.getByTestId('username-form')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Username', { selector: 'input' }), 'alice');
    await user.click(screen.getByRole('button', { name: /Save username/i }));
    expect(useProfileStore.getState().accountUsername).toBe('alice');
    expect(screen.getByTestId('identity-name')).toHaveTextContent('alice');
  });

  it('hides username editing for guests and shows the account sign-in', () => {
    render(<IdentityCard />);
    expect(screen.queryByTestId('username-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue with Google/i })).toBeInTheDocument();
  });
});
