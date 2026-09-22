// Flag helpers: normalization, emoji derivation, and country-name lookup.
import { describe, expect, it } from 'vitest';
import { countryFlagEmoji, countryName, COUNTRIES, normalizeCountryCode } from '../utils/flags';

describe('normalizeCountryCode', () => {
  it('uppercases and trims valid two-letter codes', () => {
    expect(normalizeCountryCode('us')).toBe('US');
    expect(normalizeCountryCode(' GB ')).toBe('GB');
    expect(normalizeCountryCode('US')).toBe('US');
  });

  it('rejects anything malformed', () => {
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode(undefined)).toBeNull();
    expect(normalizeCountryCode('')).toBeNull();
    expect(normalizeCountryCode('U')).toBeNull();
    expect(normalizeCountryCode('USA')).toBeNull();
    expect(normalizeCountryCode('U1')).toBeNull();
    expect(normalizeCountryCode('US ')).toBe('US'); // trims
  });
});

describe('countryFlagEmoji', () => {
  it('derives the regional-indicator emoji from a code', () => {
    expect(countryFlagEmoji('US')).toBe('🇺🇸');
    expect(countryFlagEmoji('GB')).toBe('🇬🇧');
    expect(countryFlagEmoji('fr')).toBe('🇫🇷');
  });

  it('returns an empty string for unknown codes', () => {
    expect(countryFlagEmoji(null)).toBe('');
    expect(countryFlagEmoji('ZZZ')).toBe('');
  });
});

describe('countryName', () => {
  it('maps known codes to friendly names', () => {
    expect(countryName('US')).toBe('United States');
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('us')).toBe('United States');
  });

  it('returns null for unknown codes', () => {
    expect(countryName('XX')).toBeNull();
    expect(countryName(null)).toBeNull();
  });

  it('curated list contains only valid unique codes', () => {
    const codes = new Set(COUNTRIES.map((c) => c.code));
    expect(codes.size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(normalizeCountryCode(c.code)).toBe(c.code);
    }
  });

  it('covers the full ISO list plus the common additions', () => {
    // Full ISO 3166-1 (249) + Kosovo (XK) = 250 entries.
    expect(COUNTRIES).toHaveLength(250);
    for (const code of ['TW', 'HK', 'MO', 'PS', 'XK', 'US', 'GB', 'PR', 'CY', 'HR', 'SI']) {
      expect(countryName(code)).not.toBeNull();
    }
  });
});
