// App shell navigation: persistent nav on all pages, active link highlighting,
// and a mobile tab bar. Uses MemoryRouter per project testing conventions.
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../routes';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('app navigation', () => {
  it('shows the wordmark and main nav links on the home page', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Outwit home' })).toHaveAttribute('href', '/');
    const navs = screen.getAllByRole('navigation', { name: 'Main' });
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) {
      expect(within(nav).getByRole('link', { name: 'Play' })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    }
  });

  it('marks the active nav link with aria-current', () => {
    renderAt('/lobby');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(nav).getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  });

  it('navigates between pages via the nav links', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    await user.click(within(nav).getByRole('link', { name: 'Profile' }));
    expect(screen.getByRole('heading', { name: 'guest' })).toBeInTheDocument();
  });

  it('leaves a local game back to the lobby', async () => {
    const user = userEvent.setup();
    renderAt('/game/local');
    expect(screen.getByRole('heading', { name: /Local game/i })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Lobby/i }));
    expect(screen.getByRole('heading', { name: /Game Lobby/i })).toBeInTheDocument();
  });

  it('renders a not-found page inside the shell', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Outwit home' })).toBeInTheDocument();
  });

  it('links the privacy policy and terms from every page', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  });

  it('renders the privacy and terms pages inside the shell', () => {
    renderAt('/privacy');
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    renderAt('/terms');
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
  });
});
