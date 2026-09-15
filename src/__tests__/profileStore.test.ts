// Device-wide display name: validation, persistence, and a stable guest fallback.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  effectiveDisplayName,
  guestDisplayName,
  normalizeDisplayName,
  resetGuestFallback,
  useProfileStore,
} from '../stores/profileStore';

describe('profile display name', () => {
  beforeEach(() => {
    useProfileStore.setState({ displayName: null });
    resetGuestFallback();
  });

  it('trims and accepts names within the length bounds', () => {
    expect(normalizeDisplayName('  Alice  ')).toBe('Alice');
    expect(normalizeDisplayName('A'.repeat(DISPLAY_NAME_MAX))).toBe('A'.repeat(DISPLAY_NAME_MAX));
    expect(normalizeDisplayName('A'.repeat(DISPLAY_NAME_MIN))).toBe('A'.repeat(DISPLAY_NAME_MIN));
  });

  it('rejects names that are too short, too long, or blank', () => {
    expect(normalizeDisplayName('A')).toBeNull();
    expect(normalizeDisplayName('   ')).toBeNull();
    expect(normalizeDisplayName('A'.repeat(DISPLAY_NAME_MAX + 1))).toBeNull();
  });

  it('stores a valid name and reports success', () => {
    expect(useProfileStore.getState().setDisplayName('  Bob ')).toBe(true);
    expect(useProfileStore.getState().displayName).toBe('Bob');
  });

  it('does not store invalid names', () => {
    expect(useProfileStore.getState().setDisplayName('x')).toBe(false);
    expect(useProfileStore.getState().displayName).toBeNull();
  });

  it('falls back to a generated Guest name and keeps it stable per tab', () => {
    const first = effectiveDisplayName();
    expect(first).toMatch(/^Guest \d{4}$/);
    expect(effectiveDisplayName()).toBe(first);
  });

  it('prefers the stored name over the fallback', () => {
    useProfileStore.getState().setDisplayName('Carol');
    expect(effectiveDisplayName()).toBe('Carol');
  });

  it('generates distinct guest names', () => {
    const names = new Set(Array.from({ length: 30 }, guestDisplayName));
    expect(names.size).toBeGreaterThan(1);
  });
});
