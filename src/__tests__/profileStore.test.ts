// Device-wide display name: validation, persistence, the persisted guest
// fallback, and seeding from a signed-in account.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  effectiveDisplayName,
  guestDisplayName,
  normalizeDisplayName,
  seedDisplayNameFromAccount,
  useProfileStore,
} from '../stores/profileStore';

describe('profile display name', () => {
  beforeEach(() => {
    useProfileStore.setState({ displayName: null, guestName: null });
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
    // ...and it is persisted, so a reload (fresh store read) keeps it.
    expect(useProfileStore.getState().guestName).toBe(first);
  });

  it('prefers an explicit display name over the guest fallback', () => {
    useProfileStore.getState().ensureGuestName();
    useProfileStore.getState().setDisplayName('Carol');
    expect(effectiveDisplayName()).toBe('Carol');
  });

  it('keeps the guest name after clearing an explicit name', () => {
    const guest = useProfileStore.getState().ensureGuestName();
    useProfileStore.getState().setDisplayName('Dave');
    useProfileStore.getState().clearDisplayName();
    expect(effectiveDisplayName()).toBe(guest);
  });

  it('generates distinct guest names', () => {
    const names = new Set(Array.from({ length: 30 }, guestDisplayName));
    expect(names.size).toBeGreaterThan(1);
  });
});

describe('seeding a name from an account', () => {
  beforeEach(() => {
    useProfileStore.setState({ displayName: null, guestName: null });
  });

  it('uses the email local-part when no name is set', () => {
    seedDisplayNameFromAccount('alice@example.com');
    expect(useProfileStore.getState().displayName).toBe('alice');
  });

  it('strips unsafe characters and enforces the length limit', () => {
    seedDisplayNameFromAccount('a'.repeat(40) + '@example.com');
    expect(useProfileStore.getState().displayName).toHaveLength(DISPLAY_NAME_MAX);

    useProfileStore.setState({ displayName: null });
    seedDisplayNameFromAccount('bob!@example.com');
    expect(useProfileStore.getState().displayName).toBe('bob');
  });

  it('never overwrites a name the player already chose', () => {
    useProfileStore.getState().setDisplayName('Chosen');
    seedDisplayNameFromAccount('other@example.com');
    expect(useProfileStore.getState().displayName).toBe('Chosen');
  });

  it('does nothing when the local-part is too short or missing', () => {
    seedDisplayNameFromAccount('a@example.com');
    expect(useProfileStore.getState().displayName).toBeNull();
    seedDisplayNameFromAccount(null);
    expect(useProfileStore.getState().displayName).toBeNull();
  });
});
