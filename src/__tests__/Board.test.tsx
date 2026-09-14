// Board rendering details: clean chips (no numbers), distinct power chip, and
// chess.com-style last-move square highlighting.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board } from '../components/Board';
import { createInitialState } from '../engine';

function renderBoard(overrides: Partial<Parameters<typeof Board>[0]> = {}) {
  return render(
    <Board
      state={createInitialState()}
      selectedChipId={null}
      legalMoves={[]}
      onTileClick={vi.fn()}
      {...overrides}
    />
  );
}

describe('Board chips', () => {
  it('renders standard chips without numbers', () => {
    renderBoard();
    const chip = screen.getByTestId('chip-white-1');
    expect(chip).toBeInTheDocument();
    // No numeric text inside the chip (the id lives in aria-label only).
    expect(chip.textContent?.trim()).toBe('');
  });

  it('marks the power chip with the star glyph only', () => {
    renderBoard();
    expect(screen.getByTestId('chip-white-5').textContent).toContain('★');
  });

  it('exposes chip identity to assistive tech', () => {
    renderBoard();
    expect(screen.getByLabelText('white chip white-1')).toBeInTheDocument();
    expect(screen.getByLabelText('black chip black-5')).toBeInTheDocument();
  });

  it('highlights the from and to squares of the last move', () => {
    renderBoard({ lastMove: { from: { x: 0, y: 1 }, to: { x: 0, y: 6 } } });
    expect(screen.getByTestId('last-move-0,1')).toBeInTheDocument();
    expect(screen.getByTestId('last-move-0,6')).toBeInTheDocument();
    expect(screen.queryByTestId('last-move-0,2')).not.toBeInTheDocument();
  });

  it('adds no highlight when there is no last move', () => {
    renderBoard();
    expect(screen.queryByTestId(/last-move/)).not.toBeInTheDocument();
  });
});
