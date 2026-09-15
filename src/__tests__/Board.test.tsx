// Board rendering details: clean chips (no numbers), distinct power chip,
// chess.com-style last-move square highlighting, and the sliding chip layer.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Board, SLIDE_BASE_MS, SLIDE_MAX_MS, SLIDE_PER_TILE_MS } from '../components/Board';
import { applyMove, createInitialState } from '../engine';

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

describe('board slide animation', () => {
  it('renders chips in a dedicated layer keyed by id (so they can animate)', () => {
    renderBoard();
    const layer = screen.getByTestId('chip-layer');
    expect(layer).toBeInTheDocument();
    // All 18 chips live in the layer as persistent, id-keyed nodes.
    expect(layer.querySelectorAll('[data-testid^="chip-"]')).toHaveLength(18);
  });

  it('positions a chip by tile percentages, not by nesting it in a tile', () => {
    renderBoard();
    const chip = screen.getByTestId('chip-black-1'); // starts at (0,0) → a10
    expect(chip).toHaveAttribute('data-position', 'a10');
    expect(chip.style.left).toBe('0%');
    expect(chip.style.top).toBe('0%');
    expect(chip.style.width).toBe(`${100 / 9}%`);
    expect(chip.style.height).toBe(`${100 / 10}%`);
  });

  it('sets a distance-aware transition duration only on the move that changed', () => {
    const initial = createInitialState();
    const moved = applyMove(initial, { chipId: 'white-1', to: { x: 0, y: 6 } });
    const { rerender } = renderBoard({ state: initial });
    expect(screen.getByTestId('chip-white-1').style.transitionDuration).toBe('');

    rerender(
      <Board state={moved} selectedChipId={null} legalMoves={[]} onTileClick={vi.fn()} />
    );
    const chip = screen.getByTestId('chip-white-1');
    expect(chip).toHaveAttribute('data-position', 'a4');
    // 5-tile slide: 160 + 18*5 = 250ms, under the 320ms cap.
    expect(chip.style.transitionDuration).toBe(`${SLIDE_BASE_MS + SLIDE_PER_TILE_MS * 5}ms`);

    // A later rerender with no movement must not re-trigger the transition.
    rerender(
      <Board state={moved} selectedChipId="white-1" legalMoves={[]} onTileClick={vi.fn()} />
    );
    expect(screen.getByTestId('chip-white-1').style.transitionDuration).toBe('');
  });

  it('caps the duration for very long slides', () => {
    const initial = createInitialState();
    // White moves first, then black-9 slides up 5 tiles.
    const afterWhite = applyMove(initial, { chipId: 'white-1', to: { x: 0, y: 6 } });
    const afterBlack = applyMove(afterWhite, { chipId: 'black-9', to: { x: 8, y: 3 } });
    const { rerender } = renderBoard({ state: afterWhite });
    rerender(<Board state={afterBlack} selectedChipId={null} legalMoves={[]} onTileClick={vi.fn()} />);
    const duration = parseInt(screen.getByTestId('chip-black-9').style.transitionDuration, 10);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThanOrEqual(SLIDE_MAX_MS);
  });
});
