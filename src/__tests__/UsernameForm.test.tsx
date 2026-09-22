// Username settings form: hidden for guests, validates input, and reports
// claim failures (including taken) from the profile service.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsernameForm } from '../components/UsernameForm';
import { useAuthStore } from '../stores/authStore';
import * as profileService from '../services/profile';

vi.mock('@/services/profile', () => ({
  USERNAME_MIN: 3,
  USERNAME_MAX: 20,
  normalizeUsername: (raw: string) => {
    const u = raw.trim();
    return u.length >= 3 && u.length <= 20 && /^[A-Za-z0-9_]+$/.test(u) ? u : null;
  },
  fetchMyProfile: vi.fn(),
  claimUsername: vi.fn(),
}));

describe('UsernameForm', () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false });
    vi.clearAllMocks();
  });

  it('renders nothing for guests', () => {
    useAuthStore.setState({ isAuthenticated: false });
    const { container } = render(<UsernameForm />);
    expect(container.firstChild).toBeNull();
  });

  it('loads the existing username from the profile', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    vi.mocked(profileService.fetchMyProfile).mockResolvedValue({ id: 'u1', username: 'alice' });
    render(<UsernameForm />);
    expect(await screen.findByText(/@alice/i)).toBeInTheDocument();
  });

  it('claims a valid username and confirms it', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    vi.mocked(profileService.fetchMyProfile).mockResolvedValue({ id: 'u1', username: null });
    vi.mocked(profileService.claimUsername).mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<UsernameForm />);
    await user.type(screen.getByLabelText('Username', { selector: 'input' }), 'bob_2');
    await user.click(screen.getByRole('button', { name: /Save username/i }));
    expect(profileService.claimUsername).toHaveBeenCalledWith('bob_2');
    expect(await screen.findByRole('status')).toHaveTextContent(/@bob_2/i);
  });

  it('shows an error when the username is taken', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    vi.mocked(profileService.fetchMyProfile).mockResolvedValue({ id: 'u1', username: null });
    vi.mocked(profileService.claimUsername).mockResolvedValue({ error: 'That username is already taken.' });
    const user = userEvent.setup();
    render(<UsernameForm />);
    await user.type(screen.getByLabelText('Username', { selector: 'input' }), 'taken_name');
    await user.click(screen.getByRole('button', { name: /Save username/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already taken/i);
  });
});
