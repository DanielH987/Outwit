import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent, trackPageView } from '../services/analytics';

describe('analytics', () => {
  let trackSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    trackSpy = vi.fn();
    vi.stubGlobal('window', { umami: { track: trackSpy } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks a named event with properties', () => {
    trackEvent('create_room', { mode: 'online' });
    expect(trackSpy).toHaveBeenCalledWith('create_room', { mode: 'online' });
  });

  it('tracks a named event without properties', () => {
    trackEvent('join_room');
    expect(trackSpy).toHaveBeenCalledWith('join_room', {});
  });

  it('tracks a manual page view', () => {
    trackPageView('/lobby');
    expect(trackSpy).toHaveBeenCalledWith('pageview', { path: '/lobby' });
  });

  it('does nothing when umami is unavailable', () => {
    vi.stubGlobal('window', {});
    expect(() => trackEvent('create_room')).not.toThrow();
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('swallow umami errors so gameplay is unaffected', () => {
    vi.stubGlobal('window', {
      umami: { track: vi.fn(() => { throw new Error('network'); }) },
    });
    expect(() => trackEvent('create_room')).not.toThrow();
  });
});
