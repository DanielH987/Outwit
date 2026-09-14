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
    expect(screen.getByTestId('last-move-a9')).toBeInTheDocument();
    expect(screen.getByTestId('last-move-a4')).toBeInTheDocument();
    expect(screen.queryByTestId('last-move-a8')).not.toBeInTheDocument();
  });

  it('adds no highlight when there is no last move', () => {
    renderBoard();
    expect(screen.queryByTestId(/last-move/)).not.toBeInTheDocument();
  });

  it('embeds files a–i in the bottom rank and ranks 10–1 in the left file', () => {
    renderBoard();
    // Files along the bottom row (y=9).
    for (const f of 'abcdefghi') {
      expect(screen.getByTestId(`file-label-${f}`)).toBeInTheDocument();
    }
    // Ranks on the left column (x=0), rank 1 at the bottom, 10 at the top.
    expect(screen.getByTestId('rank-label-10')).toBeInTheDocument();
    expect(screen.getByTestId('rank-label-1')).toBeInTheDocument();
    // No standalone label strips outside the grid anymore.
    expect(screen.queryByTestId('rank-labels')).not.toBeInTheDocument();
    expect(screen.queryByTestId('file-labels')).not.toBeInTheDocument();
  });

  it('addresses tiles by chess.com coordinates with rank 1 at the bottom', () => {
    renderBoard();
    expect(screen.getByRole('gridcell', { name: 'tile a10' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'tile a1' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'tile i1' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'tile i10' })).toBeInTheDocument();
  });
});
