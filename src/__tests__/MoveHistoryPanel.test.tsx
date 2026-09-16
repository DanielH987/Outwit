// Move-history panel: rendering, hover highlight, and replay selection.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveHistoryPanel } from '../components/MoveHistoryPanel';
import type { MoveRecord } from '../stores/localGameStore';

const history: MoveRecord[] = [
  { number: 1, player: 'white', chipId: 'white-1', from: { x: 0, y: 1 }, to: { x: 0, y: 6 }, notation: '1 a9→a4' },
  { number: 1, player: 'black', chipId: 'black-9', from: { x: 8, y: 8 }, to: { x: 8, y: 3 }, notation: '9 i2→i7' },
  { number: 2, player: 'white', chipId: 'white-2', from: { x: 1, y: 2 }, to: { x: 1, y: 6 }, notation: '2 b8→b4' },
];

describe('MoveHistoryPanel', () => {
  it('shows an empty state with no moves', () => {
    render(<MoveHistoryPanel history={[]} />);
    expect(screen.getByTestId('move-history')).toHaveTextContent('No moves yet.');
  });

  it('renders moves in White/Black columns with move numbers', () => {
    render(<MoveHistoryPanel history={history} />);
    expect(screen.getByTestId('move-history')).toHaveTextContent('1 a9→a4');
    expect(screen.getByTestId('move-history')).toHaveTextContent('9 i2→i7');
    expect(screen.getByTestId('move-history')).toHaveTextContent('2 b8→b4');
  });

  it('highlights the hovered move and clears on leave', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<MoveHistoryPanel history={history} onHighlight={onHighlight} />);

    await user.hover(screen.getByTestId('history-move-0'));
    expect(onHighlight).toHaveBeenCalledWith(history[0]);
  });

  it('reports the clicked move index for replay', async () => {
    const user = userEvent.setup();
    const onSelectMove = vi.fn();
    render(<MoveHistoryPanel history={history} onSelectMove={onSelectMove} />);

    await user.click(screen.getByTestId('history-move-1'));
    expect(onSelectMove).toHaveBeenCalledWith(1);
  });

  it('marks the move being reviewed in replay', () => {
    render(<MoveHistoryPanel history={history} onSelectMove={vi.fn()} currentMoveIndex={2} />);
    expect(screen.getByTestId('history-move-2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('history-move-0')).not.toHaveAttribute('aria-current');
  });
});
