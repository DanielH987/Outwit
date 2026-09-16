// Replay controls: stepping, jumping, slider, keyboard, and exit.
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplayControls } from '../components/ReplayControls';

function setup(current = 1, total = 5) {
  const onChange = vi.fn();
  const onExit = vi.fn();
  render(<ReplayControls current={current} total={total} onChange={onChange} onExit={onExit} />);
  return { onChange, onExit };
}

describe('ReplayControls', () => {
  it('shows which move is being reviewed', () => {
    setup(2, 5);
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Move 3 of 5');
  });

  it('labels the position before the first move', () => {
    setup(-1, 5);
    expect(screen.getByTestId('replay-label')).toHaveTextContent('Starting position');
  });

  it('steps backward and forward', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(2, 5);

    await user.click(screen.getByRole('button', { name: 'Previous move' }));
    expect(onChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: 'Next move' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('jumps to the first and latest move', async () => {
    const user = userEvent.setup();
    const { onChange } = setup(2, 5);

    await user.click(screen.getByRole('button', { name: 'First move' }));
    expect(onChange).toHaveBeenCalledWith(-1);

    await user.click(screen.getByRole('button', { name: 'Latest move' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('disables stepping past either end', () => {
    const { unmount } = render(
      <ReplayControls current={-1} total={5} onChange={vi.fn()} onExit={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'First move' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous move' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next move' })).toBeEnabled();
    unmount();

    render(<ReplayControls current={4} total={5} onChange={vi.fn()} onExit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next move' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Latest move' })).toBeDisabled();
  });

  it('scrubs with the slider (including the -1 starting position)', () => {
    const { onChange } = setup(2, 5);
    const slider = screen.getByLabelText('Move position');
    expect(slider).toHaveAttribute('min', '-1');
    expect(slider).toHaveAttribute('max', '4');

    fireEvent.change(slider, { target: { value: '-1' } });
    expect(onChange).toHaveBeenCalledWith(-1);

    fireEvent.change(slider, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('exits replay', async () => {
    const user = userEvent.setup();
    const { onExit } = setup();
    await user.click(screen.getByRole('button', { name: 'Exit' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation: arrows, Home/End, Escape', async () => {
    const user = userEvent.setup();
    const { onChange, onExit } = setup(2, 5);

    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith(1);

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(3);

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenCalledWith(-1);

    await user.keyboard('{End}');
    expect(onChange).toHaveBeenCalledWith(4);

    await user.keyboard('{Escape}');
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
