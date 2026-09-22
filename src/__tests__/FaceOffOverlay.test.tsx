import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FaceOffOverlay } from '../components/FaceOffOverlay';

const whitePlayer = {
  userId: 'user-a',
  username: 'Alice',
  countryCode: 'US',
  side: 'white' as const,
};

const blackPlayer = {
  userId: 'user-b',
  username: 'Bob',
  countryCode: 'GB',
  side: 'black' as const,
};

describe('FaceOffOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders both player names with side labels', () => {
    render(<FaceOffOverlay white={whitePlayer} black={blackPlayer} onComplete={() => {}} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText(/White/i)).toBeInTheDocument();
    expect(screen.getByText(/Black/i)).toBeInTheDocument();
  });

  it('renders a VS divider', () => {
    render(<FaceOffOverlay white={whitePlayer} black={blackPlayer} onComplete={() => {}} />);
    expect(screen.getByText('VS')).toBeInTheDocument();
  });

  it('calls onComplete after the hold duration', () => {
    const onComplete = vi.fn();
    render(<FaceOffOverlay white={whitePlayer} black={blackPlayer} onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders the enter animation class on mount', () => {
    const { container } = render(<FaceOffOverlay white={whitePlayer} black={blackPlayer} onComplete={() => {}} />);
    const overlay = container.querySelector('[data-testid="face-off-overlay"]');
    expect(overlay).not.toBeNull();
  });

  it('falls back to userId when username is null', () => {
    render(
      <FaceOffOverlay
        white={{ ...whitePlayer, username: null }}
        black={blackPlayer}
        onComplete={() => {}}
      />
    );
    expect(screen.getByText('user-a')).toBeInTheDocument();
  });
});