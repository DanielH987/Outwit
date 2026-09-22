// Device-wide name: one name per player. A signed-in account's unique
// username wins; guests fall back to a chosen name, then an auto-generated
// Guest ####. Plus the country flag.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  clearAccountUsername,
  effectiveCountryCode,
  effectiveDisplayName,
  guestDisplayName,
  hasAccountName,
  hasChosenName,
  normalizeDisplayName,
  suggestUsernameFromAccount,
  syncAccountUsername,
  useProfileStore,
} from '../stores/profileStore';

describe('profile display name', () => {
  beforeEach(() => {
    useProfileStore.setState({ accountUsername: null, displayName: null, guestName: null, countryCode: null });
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

  it('auto-generates a guest name and keeps it stable across calls', () => {
    const first = effectiveDisplayName();
    expect(first).toMatch(/^Guest \d{4}$/);
    expect(effectiveDisplayName()).toBe(first);
    expect(useProfileStore.getState().guestName).toBe(first);
  });

  it('generates distinct guest names', () => {
    const names = new Set(Array.from({ length: 30 }, guestDisplayName));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('one name per player (account vs guest)', () => {
  beforeEach(() => {
    useProfileStore.setState({ accountUsername: null, displayName: null, guestName: null });
  });

  it('the account username is the effective name while signed in', () => {
    useProfileStore.getState().ensureGuestName();
    useProfileStore.getState().setDisplayName('Carol');
    syncAccountUsername('carol');
    expect(effectiveDisplayName()).toBe('carol');
    expect(hasAccountName()).toBe(true);
    expect(hasChosenName()).toBe(true);
  });

  it('falls back to the guest name when the account has no username', () => {
    useProfileStore.getState().setDisplayName('Carol');
    expect(effectiveDisplayName()).toBe('Carol');
    expect(hasAccountName()).toBe(false);
    expect(hasChosenName()).toBe(true);
  });

  it('clearing the account username restores the guest name', () => {
    syncAccountUsername('carol');
    clearAccountUsername();
    expect(effectiveDisplayName()).toMatch(/^Guest \d{4}$/);
    expect(hasAccountName()).toBe(false);
  });

  it('suggests a handle from the email when the account has none', () => {
    expect(suggestUsernameFromAccount('alice@example.com')).toBe('alice');
    expect(suggestUsernameFromAccount('a@example.com')).toBeNull();
    expect(suggestUsernameFromAccount(null)).toBeNull();
    // An account that already has a name never re-suggests.
    syncAccountUsername('chosen');
    expect(suggestUsernameFromAccount('other@example.com')).toBeNull();
  });
});

describe('profile country flag', () => {
  beforeEach(() => {
    useProfileStore.setState({ countryCode: null });
  });

  it('normalizes and stores a valid code', () => {
    expect(useProfileStore.getState().setCountryCode('  gb ')).toBe(true);
    expect(useProfileStore.getState().countryCode).toBe('GB');
    expect(effectiveCountryCode()).toBe('GB');
  });

  it('rejects invalid codes without storing them', () => {
    expect(useProfileStore.getState().setCountryCode('USA')).toBe(false);
    expect(useProfileStore.getState().setCountryCode('x')).toBe(false);
    expect(useProfileStore.getState().countryCode).toBeNull();
    expect(effectiveCountryCode()).toBeNull();
  });

  it('clears by setting null', () => {
    useProfileStore.getState().setCountryCode('FR');
    useProfileStore.setState({ countryCode: null });
    expect(effectiveCountryCode()).toBeNull();
  });
});
