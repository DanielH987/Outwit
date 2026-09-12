import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { useLocalGameStore } from '../stores/localGameStore';

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

describe('GamePage local play', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders board and turn indicator', () => {
    renderGamePage();
    expect(screen.getByRole('grid', { name: /outwit board/i })).toBeInTheDocument();
    expect(screen.getByText(/White to move/i)).toBeInTheDocument();
  });

  it('selecting a white chip highlights legal targets', async () => {
    const user = userEvent.setup();
    renderGamePage();

    // white-1 sits at (0,1); click its tile.
    await user.click(screen.getByRole('gridcell', { name: 'tile 0,1' }));
    expect(useLocalGameStore.getState().selectedChipId).toBe('white-1');
    expect(useLocalGameStore.getState().legalMoves).toEqual([{ x: 0, y: 6 }]);
  });

  it('completes a local move and switches turn to black', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('gridcell', { name: 'tile 0,1' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile 0,6' }));

    const store = useLocalGameStore.getState();
    expect(store.state.chips.find((c) => c.id === 'white-1')).toMatchObject({ position: { x: 0, y: 6 } });
    expect(store.state.sideToMove).toBe('black');
    expect(store.selectedChipId).toBeNull();
    expect(store.result.status).toBe('in-progress');
  });

  it('ignores selecting a chip when the game is over', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('button', { name: /White resigns/i }));
    await user.click(screen.getByRole('gridcell', { name: 'tile 0,1' }));
    expect(useLocalGameStore.getState().selectedChipId).toBeNull();
  });

  it('offers and accepts a draw', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('button', { name: /Offer draw/i }));
    expect(useLocalGameStore.getState().pendingDrawOfferFrom).toBe('white');
    await user.click(screen.getByRole('button', { name: /Accept/i }));
    expect(useLocalGameStore.getState().result).toEqual({
      status: 'finished',
      winner: null,
      reason: 'agreement',
    });
    expect(screen.getByRole('status')).toHaveTextContent(/mutual agreement/i);
  });

  it('resign ends the game', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('button', { name: /Black resigns/i }));
    expect(useLocalGameStore.getState().result).toEqual({
      status: 'finished',
      winner: 'white',
      reason: 'resignation',
    });
  });

  it('reset creates a fresh game', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('gridcell', { name: 'tile 0,1' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile 0,6' }));
    await user.click(screen.getByRole('button', { name: /New local game/i }));

    const store = useLocalGameStore.getState();
    expect(store.state.chips.find((c) => c.id === 'white-1')).toMatchObject({ position: { x: 0, y: 1 } });
    expect(store.state.sideToMove).toBe('white');
    expect(store.moveCount).toBe(0);
  });
});
