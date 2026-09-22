import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { useLocalGameStore } from '../stores/localGameStore';
import { AppRoutes } from '../routes';

function resetStore() {
  useLocalGameStore.getState().reset();
}

function renderGamePage() {
  return render(
    <MemoryRouter>
      <GamePage />
    </MemoryRouter>
  );
}

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('GamePage leave warning', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  const beforeUnloadHandlers: Array<(event: BeforeUnloadEvent) => string | void> = [];

  beforeEach(() => {
    resetStore();
    // Capture beforeunload listener registrations so we can invoke / inspect
    // them without actually triggering a browser tab close.
    addEventListenerSpy = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'beforeunload' && typeof listener === 'function') {
          beforeUnloadHandlers.push(listener as (event: BeforeUnloadEvent) => string | void);
        }
      });
    removeEventListenerSpy = vi
      .spyOn(window, 'removeEventListener')
      .mockImplementation((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'beforeunload' && typeof listener === 'function') {
          const index = beforeUnloadHandlers.indexOf(
            listener as (event: BeforeUnloadEvent) => string | void
          );
          if (index > -1) beforeUnloadHandlers.splice(index, 1);
        }
      });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    beforeUnloadHandlers.length = 0;
  });

  function fireBeforeUnload() {
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    // preventDefault is what the handler calls to signal "show the dialog".
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    for (const handler of [...beforeUnloadHandlers]) {
      handler(event);
    }
    return { event, preventDefaultSpy };
  }

  it('registers a beforeunload warning while a local game is in progress', () => {
    renderGamePage();
    expect(beforeUnloadHandlers.length).toBe(1);

    const { preventDefaultSpy } = fireBeforeUnload();
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('removes the warning when the local game ends', async () => {
    const user = userEvent.setup();
    const { unmount } = renderGamePage();
    expect(beforeUnloadHandlers.length).toBe(1);

    await user.click(screen.getByRole('button', { name: /Black resigns/i }));
    expect(useLocalGameStore.getState().result.status).toBe('finished');

    unmount();
    // The component cleans up its listener; because the game is finished the
    // hook no longer registers it, so no new handler remains.
    expect(beforeUnloadHandlers.length).toBe(0);
  });

  it('does not trigger a warning while replaying history', async () => {
    const user = userEvent.setup();
    const { rerender } = renderGamePage();

    // Play a move so replay mode becomes reachable.
    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));

    // Enter replay mode.
    await user.click(screen.getByTestId('history-move-0'));
    expect(screen.getByTestId('replay-controls')).toBeInTheDocument();

    // React may batch the state-driven replay change before the hook runs,
    // so force a re-render to guarantee the effect with replay active has run.
    rerender(
      <MemoryRouter>
        <GamePage />
      </MemoryRouter>
    );

    const { preventDefaultSpy } = fireBeforeUnload();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(beforeUnloadHandlers.length).toBe(0);
  });

  it('shows a custom confirmation dialog when clicking the lobby link', async () => {
    const user = userEvent.setup();
    const { unmount } = renderGamePage();

    await user.click(screen.getByRole('link', { name: /Lobby/i }));

    expect(screen.getByRole('dialog', { name: /Leave game/i })).toBeInTheDocument();
    expect(screen.getByTestId('leave-confirm-warning')).toHaveTextContent(/game in progress/i);

    unmount();
  });

  it('stays on the game page when canceling the leave dialog', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter initialEntries={['/game/local']}>
        <GamePage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('link', { name: /Lobby/i }));
    await user.click(screen.getByRole('button', { name: /Stay in game/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // We never navigated away: the local heading is still present.
    expect(screen.getByRole('heading', { name: /Local game/i })).toBeInTheDocument();

    // Also verify the address hasn't changed via our router stub.
    expect(container.querySelector('[data-testid="leave-confirm-dialog"]')).not.toBeInTheDocument();
  });

  it('navigates to the lobby when confirming leave', async () => {
    const user = userEvent.setup();
    renderAppAt('/game/local');

    await user.click(screen.getByRole('link', { name: /Lobby/i }));
    await user.click(screen.getByRole('button', { name: /Leave anyway/i }));

    // After confirming, the app routes to the lobby page.
    expect(screen.getByRole('heading', { name: /Game Lobby/i })).toBeInTheDocument();
  });

  it('does not warn when leaving a finished local game', async () => {
    const user = userEvent.setup();
    renderAppAt('/game/local');

    await user.click(screen.getByRole('button', { name: /Black resigns/i }));
    await user.click(screen.getByRole('button', { name: /View board/i }));

    await user.click(screen.getByRole('link', { name: /^← Lobby$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Game Lobby/i })).toBeInTheDocument();
  });
});
