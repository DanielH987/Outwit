// End-of-game dialog: perspective-aware headline, reason, actions, dismissal,
// and focus/keyboard behavior.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameOverDialog } from '../components/GameOverDialog';
import type { GameResult } from '../engine';

const win: GameResult = { status: 'finished', winner: 'white', reason: 'resignation' };
const loss: GameResult = { status: 'finished', winner: 'black', reason: 'base-filled' };
const draw: GameResult = { status: 'finished', winner: null, reason: 'agreement' };

function renderDialog(overrides: Partial<Parameters<typeof GameOverDialog>[0]> = {}) {
  const onPrimary = vi.fn();
  const onDismiss = vi.fn();
  render(
    <GameOverDialog
      result={win}
      primaryLabel="Play again"
      onPrimary={onPrimary}
      onDismiss={onDismiss}
      {...overrides}
    />
  );
  return { onPrimary, onDismiss };
}

describe('GameOverDialog', () => {
  it('announces itself as a modal dialog and autofocuses the primary action', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveFocus();
  });

  it('shows the winner when there is no perspective (pass-and-play)', () => {
    renderDialog();
    expect(screen.getByTestId('game-over-headline')).toHaveTextContent('White won');
    expect(screen.getByTestId('game-over-reason')).toHaveTextContent('By resignation');
  });

  it('speaks to the viewer when a perspective is given', () => {
    renderDialog({ result: win, perspective: 'white' });
    expect(screen.getByTestId('game-over-headline')).toHaveTextContent('You won');
  });

  it('says You lost when the perspective lost', () => {
    renderDialog({ result: loss, perspective: 'white' });
    expect(screen.getByTestId('game-over-headline')).toHaveTextContent('You lost');
    expect(screen.getByTestId('game-over-reason')).toHaveTextContent('Base filled');
  });

  it('shows a Draw headline for draws', () => {
    renderDialog({ result: draw, perspective: 'black' });
    expect(screen.getByTestId('game-over-headline')).toHaveTextContent('Draw');
    expect(screen.getByTestId('game-over-reason')).toHaveTextContent('By agreement');
  });

  it('renders optional detail (opponent name)', () => {
    renderDialog({ detail: 'vs ProdBob' });
    expect(screen.getByText('vs ProdBob')).toBeInTheDocument();
  });

  it('invokes the primary action', async () => {
    const user = userEvent.setup();
    const { onPrimary } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('dismisses via the secondary button, Escape, and backdrop click', async () => {
    const user = userEvent.setup();

    const withButton = renderDialog();
    await user.click(screen.getByRole('button', { name: 'View board' }));
    expect(withButton.onDismiss).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    const viaKey = renderDialog();
    await user.keyboard('{Escape}');
    expect(viaKey.onDismiss).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '';
    const viaBackdrop = renderDialog();
    await user.click(screen.getByTestId('game-over-backdrop'));
    expect(viaBackdrop.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss when clicking inside the dialog card', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderDialog();
    await user.click(screen.getByRole('dialog'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('traps Tab focus within the dialog', async () => {
    const user = userEvent.setup();
    renderDialog();
    const primary = screen.getByRole('button', { name: 'Play again' });
    const secondary = screen.getByRole('button', { name: 'View board' });
    expect(primary).toHaveFocus();
    await user.tab();
    expect(secondary).toHaveFocus();
  });
});
