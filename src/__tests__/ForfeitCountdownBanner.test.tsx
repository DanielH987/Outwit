// Forfeit countdown banner: live ticking, urgent state, progress, and server
// clock-skew correction.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ForfeitCountdownBanner } from '../components/ForfeitCountdownBanner';
import type { ForfeitCountdown } from '../types';

function payload(overrides: Partial<ForfeitCountdown> = {}): ForfeitCountdown {
  const serverNow = 1_000_000;
  return {
    side: 'black',
    serverNow,
    deadline: serverNow + 60_000,
    graceSeconds: 60,
    ...overrides,
  };
}

describe('ForfeitCountdownBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the disconnected player and the remaining seconds', () => {
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    expect(screen.getByText('Bob disconnected')).toBeInTheDocument();
    expect(screen.getByTestId('forfeit-remaining')).toHaveTextContent('60s');
  });

  it('falls back to the side name when no username is known', () => {
    render(<ForfeitCountdownBanner forfeit={payload({ side: 'white' })} disconnectedName={null} />);
    expect(screen.getByText('White disconnected')).toBeInTheDocument();
  });

  it('counts down as time passes', () => {
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByTestId('forfeit-remaining')).toHaveTextContent('50s');
  });

  it('never goes below zero', () => {
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    act(() => {
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByTestId('forfeit-remaining')).toHaveTextContent('0s');
  });

  it('grows the progress bar as the grace period elapses', () => {
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    expect(screen.getByTestId('forfeit-progress').style.width).toBe('0%');
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByTestId('forfeit-progress').style.width).toBe('50%');
  });

  it('switches to the urgent style near the deadline', () => {
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    // Not urgent at 60s...
    expect(screen.getByTestId('forfeit-remaining').className).toContain('text-accent');
    act(() => {
      vi.advanceTimersByTime(50_000); // 10s left
    });
    expect(screen.getByTestId('forfeit-remaining').className).toContain('text-danger');
    expect(screen.getByRole('status').className).toContain('border-danger/60');
  });

  it('corrects for client clock skew using the server timestamp', () => {
    // Device clock is 5 minutes fast; a naive implementation would show 0s.
    vi.setSystemTime(1_300_000);
    render(<ForfeitCountdownBanner forfeit={payload()} disconnectedName="Bob" />);
    expect(screen.getByTestId('forfeit-remaining')).toHaveTextContent('60s');
  });
});
