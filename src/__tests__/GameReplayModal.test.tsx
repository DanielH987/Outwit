import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GameReplayModal } from '../components/GameReplayModal';
import { useStatsStore } from '../stores/statsStore';
import type { LocalMatchRecord } from '../stores/statsStore';

const sampleMoves: LocalMatchRecord['moves'] = [
  { chipId: 'white-1', from: { x: 0, y: 1 }, to: { x: 0, y: 6 } },
  { chipId: 'black-9', from: { x: 8, y: 8 }, to: { x: 8, y: 3 } },
];

function makeMatch(overrides: Partial<LocalMatchRecord> = {}): LocalMatchRecord {
  return {
    finishedAt: '2026-09-22T12:00:00Z',
    winner: 'white',
    reason: 'base-filled',
    moveCount: 2,
    whiteSeconds: 60,
    blackSeconds: 45,
    moves: sampleMoves,
    ...overrides,
  };
}

describe('GameReplayModal', () => {
  beforeEach(() => {
    useStatsStore.getState().clear();
  });

  it('renders the board and move history', () => {
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole('grid', { name: /outwit board/i })).toBeInTheDocument();
    expect(screen.getByTestId('move-history')).toBeInTheDocument();
  });

  it('shows replay controls starting at the latest position', () => {
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch()} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('replay-controls')).toBeInTheDocument();
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Move 2 of 2');
  });

  it('steps backward to the starting position', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch()} onClose={() => {}} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'First move' }));
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Starting position');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch()} onClose={onClose} />
      </MemoryRouter>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch()} onClose={onClose} />
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders without moves (empty replay)', () => {
    render(
      <MemoryRouter>
        <GameReplayModal match={makeMatch({ moves: [], moveCount: 0 })} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole('grid', { name: /outwit board/i })).toBeInTheDocument();
    expect(screen.getByTestId('move-history')).toHaveTextContent('No moves yet');
  });
});