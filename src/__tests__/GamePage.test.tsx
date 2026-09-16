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
    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    expect(useLocalGameStore.getState().selectedChipId).toBe('white-1');
    expect(useLocalGameStore.getState().legalMoves).toEqual([{ x: 0, y: 6 }]);
  });

  it('completes a local move and switches turn to black', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));

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
    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    expect(useLocalGameStore.getState().selectedChipId).toBeNull();
  });

  it('offers and accepts a draw', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('button', { name: /Offer draw/i }));
    expect(useLocalGameStore.getState().pendingDrawOfferFrom).toBe('white');
    await user.click(screen.getByRole('button', { name: /Accept/i }));
    expect(useLocalGameStore.getState().clockStartedAt).toBeNull(); // clocks frozen
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

    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));
    await user.click(screen.getByRole('button', { name: /New local game/i }));

    const store = useLocalGameStore.getState();
    expect(store.state.chips.find((c) => c.id === 'white-1')).toMatchObject({ position: { x: 0, y: 1 } });
    expect(store.state.sideToMove).toBe('white');
    expect(store.moveHistory).toHaveLength(0);
  });

  it('appends move history with full-move numbers', async () => {
    const user = userEvent.setup();
    renderGamePage();

    // White move 1: chip 1 from (0,1) slides down to (0,6).
    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));

    // Black move 1: chip 9 at (8,8) slides up to (8,3).
    await user.click(screen.getByRole('gridcell', { name: 'tile i2' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile i7' }));

    const history = useLocalGameStore.getState().moveHistory;
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      number: 1,
      player: 'white',
      notation: '1 a9→a4',
    });
    expect(history[1]).toMatchObject({
      number: 1,
      player: 'black',
      notation: '9 i2→i7',
    });

    const panel = screen.getByTestId('move-history');
    expect(panel).toHaveTextContent('1 a9→a4');
    expect(panel).toHaveTextContent('9 i2→i7');
  });

  it('pauses clocks when the game ends', async () => {
    const user = userEvent.setup();
    renderGamePage();

    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));
    await user.click(screen.getByRole('button', { name: /White resigns/i }));

    const store = useLocalGameStore.getState();
    expect(store.result.status).toBe('finished');
    expect(store.clockStartedAt).toBeNull();
  });

  it('shows clocks', () => {
    renderGamePage();
    expect(screen.getByTestId('clock-white')).toBeInTheDocument();
    expect(screen.getByTestId('clock-black')).toBeInTheDocument();
  });
});

describe('GamePage replay (reviewing move history)', () => {
  beforeEach(() => {
    resetStore();
  });

  /** Play two moves: white a9→a4, black i2→i7. */
  async function playTwoMoves(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('gridcell', { name: 'tile a9' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile i2' }));
    await user.click(screen.getByRole('gridcell', { name: 'tile i7' }));
  }

  /** Which board coordinate a chip is rendered at (chips live in a layer, not tiles). */
  const chipPosition = (chipId: string) =>
    screen.getByTestId(`chip-${chipId}`).getAttribute('data-position');

  it('clicking a history move enters replay and shows the board as it was', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);

    // Live board: white-1 is at a4, black-9 has moved to i7.
    expect(chipPosition('white-1')).toBe('a4');
    expect(chipPosition('black-9')).toBe('i7');

    // Click the first move (white a9→a4): black-9 should be back at i2.
    await user.click(screen.getByTestId('history-move-0'));

    expect(screen.getByTestId('replay-controls')).toBeInTheDocument();
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Move 1 of 2');
    expect(chipPosition('black-9')).toBe('i2');
  });

  it('does not change the actual game state while replaying', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);

    const before = JSON.stringify(useLocalGameStore.getState().state);
    const historyLength = useLocalGameStore.getState().moveHistory.length;

    await user.click(screen.getByTestId('history-move-0'));
    await user.click(screen.getByRole('button', { name: 'Previous move' }));
    await user.click(screen.getByRole('button', { name: 'Next move' }));

    // Store untouched: same board, same history, still Black to move.
    expect(JSON.stringify(useLocalGameStore.getState().state)).toBe(before);
    expect(useLocalGameStore.getState().moveHistory).toHaveLength(historyLength);
    expect(useLocalGameStore.getState().state.sideToMove).toBe('white');
  });

  it('blocks board clicks while reviewing', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);

    await user.click(screen.getByTestId('history-move-0'));
    const stateBefore = JSON.stringify(useLocalGameStore.getState().state);

    // Try to select and move a chip while in replay — nothing should happen.
    await user.click(screen.getByRole('gridcell', { name: 'tile a4' }));
    expect(useLocalGameStore.getState().selectedChipId).toBeNull();
    expect(JSON.stringify(useLocalGameStore.getState().state)).toBe(stateBefore);
  });

  it('steps backward to the starting position and forward again', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);
    await user.click(screen.getByTestId('history-move-0'));

    await user.click(screen.getByRole('button', { name: 'First move' }));
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Starting position');
    // Both chips back where they started.
    expect(chipPosition('white-1')).toBe('a9');
    expect(chipPosition('black-9')).toBe('i2');

    await user.click(screen.getByRole('button', { name: 'Next move' }));
    expect(chipPosition('white-1')).toBe('a4');

    await user.click(screen.getByRole('button', { name: 'Latest move' }));
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Move 2 of 2');
    expect(chipPosition('black-9')).toBe('i7');
  });

  it('exits replay and restores the live position (and controls)', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);
    await user.click(screen.getByTestId('history-move-0'));

    await user.click(screen.getByRole('button', { name: 'Exit' }));

    expect(screen.queryByTestId('replay-controls')).not.toBeInTheDocument();
    expect(chipPosition('black-9')).toBe('i7'); // live again
    // Game controls are back.
    expect(screen.getByRole('button', { name: /White resigns/i })).toBeInTheDocument();
  });

  it('leaves replay when the game is reset', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);
    await user.click(screen.getByTestId('history-move-0'));
    expect(screen.getByTestId('replay-controls')).toBeInTheDocument();

    // Exit replay to reach the controls, then reset.
    await user.click(screen.getByRole('button', { name: 'Exit' }));
    await user.click(screen.getByRole('button', { name: /New local game/i }));

    expect(screen.queryByTestId('replay-controls')).not.toBeInTheDocument();
    expect(useLocalGameStore.getState().moveHistory).toHaveLength(0);
  });

  it('supports arrow-key navigation in a real game', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await playTwoMoves(user);
    await user.click(screen.getByTestId('history-move-0'));

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Starting position');

    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Move 1 of 2');

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('replay-controls')).not.toBeInTheDocument();
  });
});

describe('GamePage end-of-game dialog', () => {
  beforeEach(() => {
    resetStore();
  });

  it('pops a modal when the game ends', async () => {
    const user = userEvent.setup();
    renderGamePage();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Black resigns/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('game-over-headline')).toHaveTextContent('White won');
    expect(screen.getByTestId('game-over-reason')).toHaveTextContent('By resignation');
  });

  it('dismisses to view the final board, without losing the banner', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await user.click(screen.getByRole('button', { name: /Black resigns/i }));

    await user.click(screen.getByRole('button', { name: /View board/i }));

    expect(screen.queryByTestId('game-over-dialog')).not.toBeInTheDocument();
    // Board still visible and the status banner still explains the result.
    expect(screen.getByRole('grid', { name: /outwit board/i })).toBeInTheDocument();
    expect(screen.getByText(/White wins by resignation/i)).toBeInTheDocument();
  });

  it('starts a fresh game from the dialog and re-arms it for the next finish', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await user.click(screen.getByRole('button', { name: /Black resigns/i }));

    await user.click(screen.getByRole('button', { name: /Play again/i }));

    expect(screen.queryByTestId('game-over-dialog')).not.toBeInTheDocument();
    expect(useLocalGameStore.getState().result.status).toBe('in-progress');
    expect(useLocalGameStore.getState().moveHistory).toHaveLength(0);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderGamePage();
    await user.click(screen.getByRole('button', { name: /Black resigns/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('game-over-dialog')).not.toBeInTheDocument();
  });
});
